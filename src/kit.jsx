import React from 'react';

// ---------- единые стили: карточки, поля, кнопки ----------
export const card = 'bg-[rgb(var(--c-zinc-950)/0.9)] backdrop-blur-md border border-[rgb(var(--c-white)/0.18)] rounded-2xl shadow-xl';
export const input = 'bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.18)] rounded-xl px-3 py-2 text-base md:text-sm text-[rgb(var(--c-red-100))] placeholder:text-[rgb(var(--c-zinc-600))] focus:outline-none focus:border-[rgb(var(--c-red-500))]';
export const grad = 'bg-gradient-to-r from-[rgb(var(--c-red-600))] to-[rgb(var(--c-orange-600))] text-white font-bold';
export const label = 'text-[11px] font-medium uppercase tracking-wide text-[rgb(var(--c-zinc-400))]';
export const panel = 'p-4 bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.15)] rounded-2xl shadow-lg';

export const btn = 'inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition cursor-pointer select-none disabled:opacity-40 disabled:cursor-default shadow-sm';
export const btnPrimary = `${btn} px-4 py-2.5 bg-[rgb(var(--c-red-600))] text-white hover:bg-[rgb(var(--c-red-500))] shadow-md`;
export const btnSuccess = `${btn} px-4 py-2.5 bg-[rgb(var(--c-emerald-600))] text-white hover:bg-[rgb(var(--c-emerald-500))] shadow-md`;
export const btnSecondary = `${btn} px-3.5 py-2 border border-[rgb(var(--c-white)/0.15)] bg-[rgb(var(--c-black)/0.4)] text-[rgb(var(--c-zinc-200))] hover:border-[rgb(var(--c-white)/0.3)] hover:bg-[rgb(var(--c-black)/0.6)]`;
export const btnDanger = `${btn} px-3.5 py-2 border border-[rgb(var(--c-rose-500)/0.4)] bg-[rgb(var(--c-rose-950)/0.3)] text-[rgb(var(--c-rose-300))] hover:bg-[rgb(var(--c-rose-600))] hover:text-white`;
export const btnIcon = 'p-1.5 rounded-lg text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] transition cursor-pointer';
// Переключатель-«сегмент»
export const segWrap = 'inline-flex p-0.5 gap-0.5 rounded-lg bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)]';
export const seg = (active) => `px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${active ? 'bg-[rgb(var(--c-red-600))] text-white' : 'text-[rgb(var(--c-zinc-300))] hover:text-[rgb(var(--c-zinc-50))] hover:bg-[rgb(var(--c-white)/0.05)]'}`;

// ---------- хелперы ----------
export const fitToDataUrl = (file, max = 900, q = 0.72) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('load'));
    };
    img.src = url;
  });

const pad = (n) => String(n).padStart(2, '0');
// Локальная дата (а не UTC, как у toISOString) — иначе ночью в Казахстане дата «вчера»
export const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;
export const sum = (arr) => Math.round(arr.reduce((a, c) => a + c.amount, 0) * 100) / 100;
export const num2 = (n) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
export const fmt = (n) => `${n > 0 ? '+' : ''}${num2(n)} ₸`;
export const readJSON = (key, def) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? def;
  } catch {
    return def;
  }
};

// Заголовок виджета: иконка + подпись + элемент справа
export function Title({ icon: Icon, children, right = null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`flex items-center gap-1.5 ${label}`}>
        {Icon && <Icon className="w-3.5 h-3.5 text-[rgb(var(--c-orange-500))]" />}
        {children}
      </span>
      {right}
    </div>
  );
}
