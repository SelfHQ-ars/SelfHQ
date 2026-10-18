import { useState, useEffect, useReducer } from 'react';
import { ref, get, set, onChildAdded, onChildChanged, onValue } from 'firebase/database';
import { cloudEnabled, db } from './cloud';
import { DATA_KEYS, KEY_LABELS, isEmptyRaw, wipeLocalData } from './dataKeys';
import { setRaw, readMeta, setMeta, setChangeHandler, subscribeAny } from './store';
import { planSync } from './syncPlan';

// Облачная синхронизация: users/{uid}/data/{ключ} = { v: строка JSON, t: время правки, d: устройство }.
// localStorage остаётся главным хранилищем (работает без сети), облако — копия, общая для всех устройств.
// Побеждает последняя правка по каждому ключу. Фото тоже лежат в этих ключах (лимит записи 9 МБ).
const MAX_LEN = 9_000_000;
const PUSH_DELAY = 800;

const deviceId = (() => {
  let id = localStorage.getItem('selfhq_device_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('selfhq_device_id', id);
  }
  return id;
})();

// ---------- статус для интерфейса ----------
let status = cloudEnabled ? 'idle' : 'off'; // off | idle | syncing | ok | offline | error
let statusNote = '';
const statusSubs = new Set();
function setStatus(next, note = '') {
  status = next;
  statusNote = note;
  statusSubs.forEach((fn) => fn(next, note));
}
export function useSyncStatus() {
  const [state, setState] = useState({ status, note: statusNote });
  useEffect(() => {
    const fn = (s, note) => setState({ status: s, note });
    statusSubs.add(fn);
    fn(status, statusNote);
    return () => statusSubs.delete(fn);
  }, []);
  return state;
}
// Перерисовывает компонент при любом изменении данных (например, пришло из облака)
export function useSyncTick() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => subscribeAny(() => force()), []);
}

// ---------- движок ----------
let session = null; // { uid, run, unsubs, timers }
let runCounter = 0;

export function stopSync() {
  if (!session) return;
  session.unsubs.forEach((u) => u());
  session.timers.forEach((t) => clearTimeout(t));
  session = null;
  setChangeHandler(null);
}

async function pushKey(s, key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return true;
  if (raw.length > MAX_LEN) {
    setStatus('error', `«${KEY_LABELS[key] || key}» слишком большой для облака (много фото). Удали часть фото.`);
    return false;
  }
  try {
    await set(ref(db, `users/${s.uid}/data/${key}`), { v: raw, t: readMeta()[key] || Date.now(), d: deviceId });
    return true;
  } catch (e) {
    setStatus(e?.code === 'PERMISSION_DENIED' ? 'error' : 'offline', e?.code === 'PERMISSION_DENIED' ? 'Нет доступа к базе: проверь правила Firebase' : 'Нет связи, данные отправятся позже');
    return false;
  }
}

function applyRemote(key, r) {
  try {
    setRaw(key, r.v, { remote: true, t: r.t || Date.now() });
  } catch {
    setStatus('error', 'Не хватает места в браузере для данных из облака');
  }
}

// Отправить всё, что ещё ждёт отправки (при выходе и закрытии страницы)
export async function flushSync(timeoutMs = 4000) {
  const s = session;
  if (!s) return true;
  const pending = [...s.timers.keys()];
  s.timers.forEach((t) => clearTimeout(t));
  s.timers.clear();
  const job = Promise.all(pending.map((k) => pushKey(s, k))).then((r) => r.every(Boolean));
  const timeout = new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs));
  return Promise.race([job, timeout]);
}

export async function startSync(uid) {
  stopSync();
  if (!cloudEnabled) return;
  const run = (runCounter += 1);
  const s = { uid, run, unsubs: [], timers: new Map() };
  session = s;
  setStatus('syncing');

  // Данные другого аккаунта на этом устройстве не должны попасть в облако нового пользователя
  const owner = localStorage.getItem('selfhq_sync_uid');
  if (owner && owner !== uid) wipeLocalData();
  localStorage.setItem('selfhq_sync_uid', uid);

  const dataRef = ref(db, `users/${uid}/data`);
  const alive = () => session === s && s.run === run;

  const reconcile = async () => {
    const snap = await get(dataRef);
    if (!alive()) return;
    const remote = snap.val() || {};
    const plan = planSync({ keys: DATA_KEYS, remote, getLocal: (k) => localStorage.getItem(k), meta: readMeta(), isEmpty: isEmptyRaw });
    let preferCloud = true;
    if (plan.conflicts.length) {
      const names = plan.conflicts.map((k) => KEY_LABELS[k] || k).join(', ');
      preferCloud = window.confirm(
        `На этом устройстве уже есть данные, отличающиеся от облачных: ${names}.\n\nОК — взять данные из облака (локальные будут заменены).\nОтмена — отправить данные этого устройства в облако.\n\nСовет: сначала можно скачать копию в «Пространство → Заметки».`
      );
      if (!alive()) return;
    }
    plan.same.forEach((k) => setMeta(k, Math.max(readMeta()[k] || 0, remote[k]?.t || 0)));
    const toPull = preferCloud ? [...plan.pull, ...plan.conflicts] : plan.pull;
    const toPush = preferCloud ? plan.push : [...plan.push, ...plan.conflicts];
    toPull.forEach((k) => applyRemote(k, remote[k]));
    toPush.forEach((k) => {
      if (!plan.push.includes(k)) setMeta(k, Date.now()); // выбранные пользователем локальные данные должны победить
    });
    const results = await Promise.all(toPush.map((k) => pushKey(s, k)));
    if (alive() && results.every(Boolean) && status !== 'error') setStatus('ok');
  };

  try {
    await reconcile();
  } catch (e) {
    if (alive()) setStatus(e?.code === 'PERMISSION_DENIED' ? 'error' : 'offline', e?.code === 'PERMISSION_DENIED' ? 'Нет доступа к базе: проверь правила Firebase' : 'Нет связи с облаком');
  }
  if (!alive()) return;

  // Дальше слушаем изменения с других устройств (приходит только изменившийся ключ)
  const onRemote = (snap) => {
    const key = snap.key;
    const r = snap.val();
    if (!alive() || !DATA_KEYS.includes(key) || !r || typeof r.v !== 'string' || r.d === deviceId) return;
    if ((r.t || 0) > (readMeta()[key] || 0) && r.v !== localStorage.getItem(key)) {
      applyRemote(key, r);
      if (status !== 'error') setStatus('ok');
    }
  };
  s.unsubs.push(onChildAdded(dataRef, onRemote), onChildChanged(dataRef, onRemote));

  // Состояние соединения: при возврате сети сверяемся заново
  let firstConnect = true;
  s.unsubs.push(
    onValue(ref(db, '.info/connected'), (snap) => {
      if (!alive()) return;
      if (snap.val() === true) {
        if (!firstConnect) reconcile().catch(() => setStatus('offline', 'Нет связи с облаком'));
        else if (status === 'offline') setStatus('ok');
        firstConnect = false;
      } else if (status !== 'error') setStatus('offline', 'Нет связи, изменения сохраняются на устройстве');
    })
  );

  // Локальные изменения уходят в облако с небольшой задержкой (чтобы не слать каждую букву)
  setChangeHandler((key) => {
    if (!alive() || !DATA_KEYS.includes(key)) return;
    clearTimeout(s.timers.get(key));
    setStatus('syncing');
    s.timers.set(
      key,
      setTimeout(async () => {
        s.timers.delete(key);
        const ok = await pushKey(s, key);
        if (ok && alive() && !s.timers.size && status !== 'error') setStatus('ok');
      }, PUSH_DELAY)
    );
  });
}

if (typeof window !== 'undefined') {
  const flushQuiet = () => {
    flushSync(1500);
  };
  window.addEventListener('pagehide', flushQuiet);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flushQuiet());
}
