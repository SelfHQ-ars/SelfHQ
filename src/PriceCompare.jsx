import React, { useState } from 'react';
import { Trash2, Scale } from 'lucide-react';
import { input } from './ui';

// группа: w — вес, v — объём, p — штуки; коэффициент — к базовой единице (г, мл, шт)
const UNITS = { 'г': ['w', 1], 'кг': ['w', 1000], 'мл': ['v', 1], 'л': ['v', 1000], 'шт': ['p', 1] };
const BASE = { w: 'за 100 г', v: 'за 100 мл', p: 'за 1 шт' };
const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const blank = () => ({ id: Math.random().toString(36).slice(2), name: '', price: '', qty: '', unit: 'г' });

export default function PriceCompare() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => [blank(), blank()]);
  const upd = (id, patch) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const calc = rows.map((r) => {
    const [g, f] = UNITS[r.unit];
    const p = num(r.price);
    const q = num(r.qty);
    return { ...r, g, per: p > 0 && q > 0 ? (p / (q * f)) * (g === 'p' ? 1 : 100) : null };
  });
  const best = {};
  const count = {};
  calc.forEach((r) => {
    if (r.per === null) return;
    count[r.g] = (count[r.g] || 0) + 1;
    if (best[r.g] === undefined || r.per < best[r.g]) best[r.g] = r.per;
  });
  const mixed = Object.keys(count).length > 1;

  return (
    <div className="p-3 bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.12)] rounded-2xl flex flex-col gap-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex justify-between items-center text-xs text-[rgb(var(--c-zinc-400))] font-medium uppercase cursor-pointer">
        <span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-[rgb(var(--c-orange-500))]" /> Сравнение цен</span>
        <span className="text-base leading-none">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <>
          <p className="text-xs text-[rgb(var(--c-zinc-400))]">Введи цену и размер упаковки. Покажу цену за 100 г / 100 мл / 1 шт и что выгоднее.</p>
          {calc.map((r, idx) => {
            const isBest = r.per !== null && count[r.g] > 1 && r.per === best[r.g];
            const worse = r.per !== null && count[r.g] > 1 && !isBest ? Math.round((r.per / best[r.g] - 1) * 100) : null;
            return (
              <div key={r.id} className={`p-3 rounded-xl border flex flex-col gap-2 ${isBest ? 'border-[rgb(var(--c-emerald-500)/0.6)] bg-[rgb(var(--c-emerald-950)/0.2)]' : 'border-[rgb(var(--c-white)/0.1)] bg-[rgb(var(--c-black)/0.4)]'}`}>
                <div className="flex gap-2">
                  <input type="text" value={r.name} onChange={(e) => upd(r.id, { name: e.target.value })} placeholder={`Вариант ${idx + 1}`} className={`${input} flex-1 min-w-0`} />
                  {rows.length > 2 && (
                    <button type="button" onClick={() => setRows(rows.filter((x) => x.id !== r.id))} className="p-2 text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] cursor-pointer" aria-label="Удалить вариант"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" inputMode="decimal" value={r.price} onChange={(e) => upd(r.id, { price: e.target.value })} placeholder="Цена, ₸" className={`${input} font-mono min-w-0`} />
                  <input type="text" inputMode="decimal" value={r.qty} onChange={(e) => upd(r.id, { qty: e.target.value })} placeholder="Размер" className={`${input} font-mono min-w-0`} />
                  <select value={r.unit} onChange={(e) => upd(r.id, { unit: e.target.value })} className={`${input} cursor-pointer min-w-0`}>
                    {Object.keys(UNITS).map((u) => (<option key={u} value={u}>{u}</option>))}
                  </select>
                </div>
                {r.per !== null && (
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-[rgb(var(--c-red-100))] font-bold">{r.per.toFixed(2)} ₸ {BASE[r.g]}</span>
                    {isBest && <span className="text-[rgb(var(--c-emerald-400))]">✓ выгоднее всего</span>}
                    {worse !== null && <span className="text-[rgb(var(--c-zinc-400))]">на {worse}% дороже</span>}
                  </div>
                )}
              </div>
            );
          })}
          {mixed && <p className="text-[11px] text-[rgb(var(--c-amber-300))]">Сравнивай варианты в одной группе: вес, объём или штуки — разные группы между собой не сравниваются.</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setRows([...rows, blank()])} disabled={rows.length >= 8} className="flex-1 py-2 rounded-xl border border-[rgb(var(--c-white)/0.12)] bg-[rgb(var(--c-black)/0.4)] text-xs text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)] cursor-pointer disabled:opacity-40">+ Вариант</button>
            <button type="button" onClick={() => setRows([blank(), blank()])} className="px-4 py-2 rounded-xl border border-[rgb(var(--c-white)/0.12)] bg-[rgb(var(--c-black)/0.4)] text-xs text-[rgb(var(--c-zinc-400))] hover:text-[rgb(var(--c-white))] cursor-pointer">Сбросить</button>
          </div>
        </>
      )}
    </div>
  );
}
