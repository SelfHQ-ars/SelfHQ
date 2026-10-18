import { parse, removeKey } from './store';

// ---------- какие ключи считаются данными пользователя ----------
// Только они попадают в экспорт и в облако. Всё остальное (старые квесты, дерево навыков,
// дни рождения, чат ИИ, тестовые значения) — мусор, его здесь нет.
export const DATA_KEYS = [
  'selfhq_finance', // операции
  'selfhq_limit', // лимит на месяц
  'selfhq_streak', // огоньки
  'selfhq_goals', // цели копилки
  'selfhq_xp',
  'selfhq_level',
  'selfhq_diary',
  'selfhq_notes',
  'selfhq_links',
  'selfhq_media',
  'selfhq_wardrobe',
  'selfhq_outfits',
  'selfhq_sizes',
  'selfhq_sandbox',
  'selfhq_avatar',
  'selfhq_banner',
  'selfhq_tagline',
  'selfhq_order_finance', // порядок виджетов
  'selfhq_order_notes',
  'selfhq_order_excel'
];
export const KEY_LABELS = {
  selfhq_finance: 'Финансы',
  selfhq_limit: 'Лимит',
  selfhq_streak: 'Огоньки',
  selfhq_goals: 'Копилка',
  selfhq_xp: 'Опыт',
  selfhq_level: 'Ранг',
  selfhq_diary: 'Дневник',
  selfhq_notes: 'Заметки',
  selfhq_links: 'Быстрые ссылки',
  selfhq_media: 'Медиа',
  selfhq_wardrobe: 'Гардероб',
  selfhq_outfits: 'Образы',
  selfhq_sizes: 'Размеры',
  selfhq_sandbox: 'Песочница',
  selfhq_avatar: 'Аватар',
  selfhq_banner: 'Баннер',
  selfhq_tagline: 'Подпись',
  selfhq_order_finance: 'Порядок виджетов (финансы)',
  selfhq_order_notes: 'Порядок виджетов (заметки)',
  selfhq_order_excel: 'Порядок виджетов (Excel)'
};
// Служебные ключи: не данные, но и не мусор — их не трогаем
const SESSION_KEYS = ['selfhq_accounts', 'selfhq_session'];
const DEVICE_KEYS = ['selfhq_theme', 'selfhq_space_tab', 'selfhq_goals_migrated', 'selfhq_sync_meta', 'selfhq_sync_uid', 'selfhq_device_id'];

// Пустое значение (пустой список, пустая строка, объект из пустых полей) в экспорт не берём
export function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.values(v).every((x) => isEmptyValue(x));
  return false;
}
export const isEmptyRaw = (raw) => isEmptyValue(parse(raw, null));

// ---------- экспорт и импорт ----------
export function buildBackup(getItem, nick = '') {
  const data = {};
  const skipped = [];
  for (const key of DATA_KEYS) {
    const raw = getItem(key);
    if (raw === null || raw === undefined) continue;
    if (isEmptyRaw(raw)) {
      skipped.push(key);
      continue;
    }
    data[key] = raw;
  }
  return { app: 'SelfHQ', version: 2, exportedAt: new Date().toISOString(), user: nick, data, skipped };
}

// Читает и новый формат ({app, data}), и старый плоский. Лишние ключи отбрасывает.
export function parseBackup(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('Файл не похож на копию SelfHQ');
  }
  const src = obj && obj.app === 'SelfHQ' && obj.data && typeof obj.data === 'object' ? obj.data : obj;
  if (!src || typeof src !== 'object' || Array.isArray(src)) throw new Error('Файл не похож на копию SelfHQ');
  const data = {};
  const ignored = [];
  for (const [key, value] of Object.entries(src)) {
    if (!key.startsWith('selfhq_')) continue;
    if (!DATA_KEYS.includes(key)) {
      ignored.push(key);
      continue;
    }
    if (typeof value !== 'string') continue;
    try {
      JSON.parse(value);
      data[key] = value;
    } catch {
      data[key] = JSON.stringify(value); // обычная строка из старой версии
    }
  }
  if (!Object.keys(data).length) throw new Error('В файле нет актуальных данных SelfHQ');
  return { data, ignored };
}

export function downloadBackup(nick) {
  const backup = buildBackup((k) => localStorage.getItem(k), nick);
  const d = new Date();
  const name = `selfhq-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  a.download = name;
  a.click();
  const href = a.href;
  setTimeout(() => URL.revokeObjectURL(href), 1500); // сразу отзывать нельзя: Safari/Firefox не успеют скачать
  return { count: Object.keys(backup.data).length, skipped: backup.skipped.length };
}

// ---------- старый мусор ----------
export function legacyKeys(storage = localStorage) {
  const migrated = Boolean(storage.getItem('selfhq_goals_migrated'));
  const out = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (!k || !k.startsWith('selfhq_')) continue;
    if (DATA_KEYS.includes(k) || SESSION_KEYS.includes(k) || DEVICE_KEYS.includes(k)) continue;
    if (k === 'selfhq_piggy' && !migrated) continue; // ещё не перенесена в цели
    out.push(k);
  }
  return out;
}
export function purgeLegacy() {
  const keys = legacyKeys();
  keys.forEach((k) => removeKey(k));
  return keys;
}

// Стереть данные пользователя с этого устройства (при выходе или смене аккаунта)
export function wipeLocalData() {
  [...DATA_KEYS, 'selfhq_piggy', 'selfhq_goals_migrated', 'selfhq_sync_meta', 'selfhq_sync_uid'].forEach((k) => removeKey(k));
}
