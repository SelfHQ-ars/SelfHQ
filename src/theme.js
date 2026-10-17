import { useState, useRef, useCallback } from 'react';

// Тема = режим (тёмный/светлый) + акцентная пара цветов.
// Все цвета на сайте берутся из CSS-переменных --c-*, которые выставляет applyTheme().
const KEY = 'selfhq_theme';
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const P = {
  red: 'fef2f2 fee2e2 fecaca fca5a5 f87171 ef4444 dc2626 b91c1c 991b1b 7f1d1d 450a0a',
  orange: 'fff7ed ffedd5 fed7aa fdba74 fb923c f97316 ea580c c2410c 9a3412 7c2d12 431407',
  amber: 'fffbeb fef3c7 fde68a fcd34d fbbf24 f59e0b d97706 b45309 92400e 78350f 451a03',
  emerald: 'ecfdf5 d1fae5 a7f3d0 6ee7b7 34d399 10b981 059669 047857 065f46 064e3b 022c22',
  rose: 'fff1f2 ffe4e6 fecdd3 fda4af fb7185 f43f5e e11d48 be123c 9f1239 881337 4c0519',
  sky: 'f0f9ff e0f2fe bae6fd 7dd3fc 38bdf8 0ea5e9 0284c7 0369a1 075985 0c4a6e 082f49',
  zinc: 'fafafa f4f4f5 e4e4e7 d4d4d8 a1a1aa 71717a 52525b 3f3f46 27272a 18181b 09090b',
  blue: 'eff6ff dbeafe bfdbfe 93c5fd 60a5fa 3b82f6 2563eb 1d4ed8 1e40af 1e3a8a 172554',
  cyan: 'ecfeff cffafe a5f3fc 67e8f9 22d3ee 06b6d4 0891b2 0e7490 155e75 164e63 083344',
  violet: 'f5f3ff ede9fe ddd6fe c4b5fd a78bfa 8b5cf6 7c3aed 6d28d9 5b21b6 4c1d95 2e1065',
  fuchsia: 'fdf4ff fae8ff f5d0fe f0abfc e879f9 d946ef c026d3 a21caf 86198f 701a75 4a044e',
  pink: 'fdf2f8 fce7f3 fbcfe8 f9a8d4 f472b6 ec4899 db2777 be185d 9d174d 831843 500724',
  teal: 'f0fdfa ccfbf1 99f6e4 5eead4 2dd4bf 14b8a6 0d9488 0f766e 115e59 134e4a 042f2e',
  lime: 'f7fee7 ecfccb d9f99d bef264 a3e635 84cc16 65a30d 4d7c0f 3f6212 365314 1a2e05'
};
Object.keys(P).forEach((k) => (P[k] = P[k].split(' ')));

// a — основной акцент (на сайте это «красный»), b — второй (бывший «оранжевый»)
export const PRESETS = {
  fire: { name: 'Огонь', a: 'red', b: 'orange' },
  ocean: { name: 'Океан', a: 'blue', b: 'cyan' },
  violet: { name: 'Фиолет', a: 'violet', b: 'fuchsia' },
  rose: { name: 'Роза', a: 'pink', b: 'orange' },
  mint: { name: 'Мята', a: 'teal', b: 'lime' }
};
export const swatch = (id) => `#${P[PRESETS[id].a][6]}`;

// В светлой теме светлые оттенки текста становятся тёмными и наоборот; средние (500–600) остаются
const LIGHT_CHROMA = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 600, 500: 600, 600: 600, 700: 300, 800: 200, 900: 100, 950: 50 };
const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');

export function readTheme() {
  try {
    const t = JSON.parse(localStorage.getItem(KEY));
    return { mode: t?.mode === 'light' ? 'light' : 'dark', accent: PRESETS[t?.accent] ? t.accent : 'fire' };
  } catch {
    return { mode: 'dark', accent: 'fire' };
  }
}

export function applyTheme({ mode, accent }) {
  const light = mode === 'light';
  const root = document.documentElement;
  const set = (name, value) => root.style.setProperty(`--c-${name}`, value);
  const preset = PRESETS[accent] || PRESETS.fire;
  const source = { red: preset.a, orange: preset.b };
  ['red', 'orange', 'amber', 'emerald', 'rose', 'sky', 'zinc'].forEach((target) => {
    const fam = source[target] || target;
    SHADES.forEach((shade) => {
      const s = light ? (target === 'zinc' ? 1000 - shade : LIGHT_CHROMA[shade]) : shade;
      set(`${target}-${shade}`, rgb(P[fam][SHADES.indexOf(s)]));
    });
  });
  set('black', light ? '244 244 245' : '0 0 0');
  set('white', light ? '24 24 27' : '255 255 255');
  set('page', light ? '244 244 245' : '2 2 2');
  set('grid', light ? '228 228 231' : '31 12 12');
  root.dataset.theme = mode;
  root.style.colorScheme = light ? 'light' : 'dark';
  root.style.backgroundColor = `rgb(${light ? '244 244 245' : '2 2 2'})`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f4f5' : '#020202');
}

// Применяем сразу при загрузке, чтобы не было вспышки не той темы
applyTheme(readTheme());

export function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  const ref = useRef(theme);
  const update = useCallback((patch) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setTheme(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* память браузера заполнена — тема просто не запомнится */
    }
    applyTheme(next);
  }, []);
  const toggle = useCallback(() => update({ mode: ref.current.mode === 'dark' ? 'light' : 'dark' }), [update]);
  return [theme, update, toggle];
}