// Хранилище на localStorage с подпиской. Компоненты обновляются сами, когда данные
// меняются в другой вкладке или приходят из облака. Все данные приложения идут через него.
const META = 'selfhq_sync_meta'; // { ключ: время последнего изменения, мс }
const subs = new Map(); // ключ -> Set<fn(значение)>
const anySubs = new Set(); // fn(ключ) — любое изменение
let changeHandler = null; // сюда sync.js получает локальные изменения

export const parse = (raw, def) => {
  if (raw === null || raw === undefined) return def;
  try {
    return JSON.parse(raw);
  } catch {
    return raw; // значение, записанное старой версией без JSON
  }
};
export const readKey = (key, def) => parse(localStorage.getItem(key), def);

export const readMeta = () => {
  try {
    return JSON.parse(localStorage.getItem(META)) || {};
  } catch {
    return {};
  }
};
export const setMeta = (key, t) => {
  try {
    const m = readMeta();
    m[key] = t;
    localStorage.setItem(META, JSON.stringify(m));
  } catch {
    /* память заполнена — метка времени не критична */
  }
};

function notify(key, raw) {
  const value = parse(raw, undefined);
  subs.get(key)?.forEach((fn) => fn(value));
  anySubs.forEach((fn) => fn(key));
}

// Запись «сырой» строки. remote=true — данные пришли из облака (обратно не отправляем).
// Может бросить QuotaExceededError — вызывающий код это ловит и показывает сообщение.
export function setRaw(key, raw, { remote = false, t = Date.now() } = {}) {
  localStorage.setItem(key, raw);
  setMeta(key, t);
  notify(key, raw);
  if (!remote && changeHandler) changeHandler(key, raw, t);
}
export const writeKey = (key, value) => setRaw(key, JSON.stringify(value));
export function removeKey(key) {
  localStorage.removeItem(key);
  notify(key, null);
}

export const subscribe = (key, fn) => {
  if (!subs.has(key)) subs.set(key, new Set());
  subs.get(key).add(fn);
  return () => subs.get(key)?.delete(fn);
};
export const subscribeAny = (fn) => {
  anySubs.add(fn);
  return () => anySubs.delete(fn);
};
export const setChangeHandler = (fn) => {
  changeHandler = fn;
};

// Изменения из других вкладок браузера
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('selfhq_') && e.key !== META) notify(e.key, e.newValue);
  });
}
