import React, { useState } from 'react';
import { Trash2, Film, Pencil } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { card, input, grad } from './ui';

const TYPES = ['Фильм', 'Сериал', 'Аниме', 'Книга', 'Игра'];
const STATUS = ['want', 'doing', 'done'];
// Подписи статусов зависят от типа: «Хочу посмотреть / прочитать / поиграть» и т.д.
const label = (type, st) =>
  ({
    want: type === 'Книга' ? 'Хочу прочитать' : type === 'Игра' ? 'Хочу поиграть' : 'Хочу посмотреть',
    doing: type === 'Книга' ? 'Читаю' : type === 'Игра' ? 'Играю' : 'Смотрю',
    done: 'Завершено'
  }[st]);
const STATUS_CLS = { want: 'border-[rgb(var(--c-sky-500)/0.5)] text-[rgb(var(--c-sky-300))]', doing: 'border-[rgb(var(--c-amber-500)/0.5)] text-[rgb(var(--c-amber-300))]', done: 'border-[rgb(var(--c-emerald-500)/0.5)] text-[rgb(var(--c-emerald-300))]' };
// Для сериалов и аниме считаем серии, для книг — главы
const UNIT = { Сериал: 'серия', Аниме: 'серия', Книга: 'глава' };
const toInt = (v) => Math.max(0, parseInt(v, 10) || 0);

export default function MediaList() {
  const [items, setItems] = useLocalStorage('selfhq_media', []);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Аниме');
  const [ep, setEp] = useState('');
  const [ft, setFt] = useState('all');
  const [fs, setFs] = useState('all');
  const [editNote, setEditNote] = useState(null);

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setItems([{ id: Date.now(), title: title.trim(), type, status: 'want', rating: 0, ep: UNIT[type] ? toInt(ep) : 0, note: '' }, ...items]);
    setTitle('');
    setEp('');
  };
  const upd = (id, patch) => setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const shown = items.filter((i) => (ft === 'all' || i.type === ft) && (fs === 'all' || i.status === fs));
  const chip = (active) => `px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition ${active ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white font-bold' : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)]'}`;
  const step = 'w-8 h-8 rounded-lg border border-[rgb(var(--c-white)/0.12)] bg-[rgb(var(--c-black)/0.4)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)] cursor-pointer';

  return (
    <div className={`max-w-xl mx-auto ${card} p-3 sm:p-5 flex flex-col gap-4`}>
      <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-white))] flex items-center gap-2"><Film className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Медиа</h2>

      <form onSubmit={add} className="flex flex-col gap-2">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название" className={`${input} w-full`} />
        <div className="flex gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${input} flex-1 min-w-0 cursor-pointer`}>
            {TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
          </select>
          {UNIT[type] && (
            <input type="number" inputMode="numeric" min="0" value={ep} onChange={(e) => setEp(e.target.value)} placeholder={UNIT[type] === 'серия' ? 'Серия' : 'Глава'} className={`${input} w-24 font-mono`} />
          )}
          <button type="submit" className={`px-5 py-2 ${grad} rounded-xl text-sm cursor-pointer`}>Добавить</button>
        </div>
      </form>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFt('all')} className={chip(ft === 'all')}>Все типы</button>
        {TYPES.map((t) => (<button key={t} onClick={() => setFt(ft === t ? 'all' : t)} className={chip(ft === t)}>{t}</button>))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setFs('all')} className={chip(fs === 'all')}>Любой статус</button>
        {STATUS.map((s) => (<button key={s} onClick={() => setFs(fs === s ? 'all' : s)} className={chip(fs === s)}>{s === 'want' ? 'Хочу' : s === 'doing' ? 'В процессе' : 'Завершено'}</button>))}
      </div>

      {items.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] italic text-center py-4">Список пуст. Добавь первый фильм, аниме, книгу или игру.</p>}
      {items.length > 0 && shown.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] italic text-center py-4">По фильтрам ничего нет.</p>}

      <div className="flex flex-col gap-2.5">
        {shown.map((i) => (
          <div key={i.id} className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-xl flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm text-[rgb(var(--c-red-50))] font-semibold break-words">
                  {i.title}
                  {UNIT[i.type] && i.ep > 0 && <span className="ml-2 text-xs font-mono text-[rgb(var(--c-amber-300))] whitespace-nowrap">{i.ep} {UNIT[i.type]}</span>}
                </div>
                <span className="text-[11px] text-[rgb(var(--c-zinc-500))] font-mono">{i.type}</span>
              </div>
              <button onClick={() => window.confirm(`Удалить «${i.title}»?`) && setItems(items.filter((x) => x.id !== i.id))} className="p-1.5 text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] cursor-pointer shrink-0" aria-label="Удалить"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-2">
              <select value={i.status} onChange={(e) => upd(i.id, { status: e.target.value })} className={`${input} py-1.5 flex-1 min-w-0 cursor-pointer ${STATUS_CLS[i.status]}`}>
                {STATUS.map((s) => (<option key={s} value={s}>{label(i.type, s)}</option>))}
              </select>
              {i.status === 'done' && (
                <select value={i.rating} onChange={(e) => upd(i.id, { rating: Number(e.target.value) })} className={`${input} py-1.5 w-28 cursor-pointer`}>
                  <option value={0}>Оценка</option>
                  {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (<option key={n} value={n}>★ {n}/10</option>))}
                </select>
              )}
            </div>

            {UNIT[i.type] && (
              <div className="flex items-center gap-2 text-xs text-[rgb(var(--c-zinc-400))]">
                <span className="w-14">{UNIT[i.type] === 'серия' ? 'Серия' : 'Глава'}:</span>
                <button type="button" onClick={() => upd(i.id, { ep: toInt((i.ep || 0) - 1) })} className={step} aria-label="Минус">−</button>
                <input type="number" inputMode="numeric" min="0" value={i.ep || 0} onChange={(e) => upd(i.id, { ep: toInt(e.target.value) })} className={`${input} w-20 py-1.5 text-center font-mono`} />
                <button type="button" onClick={() => upd(i.id, { ep: toInt((i.ep || 0) + 1) })} className={step} aria-label="Плюс">+</button>
              </div>
            )}

            {editNote === i.id ? (
              <textarea autoFocus rows={3} value={i.note || ''} onChange={(e) => upd(i.id, { note: e.target.value })} onBlur={() => setEditNote(null)} placeholder="Что понравилось, впечатления…" className={`${input} w-full resize-y`} />
            ) : (
              <button type="button" onClick={() => setEditNote(i.id)} className="text-left text-xs cursor-pointer" aria-label="Изменить описание">
                {i.note ? (
                  <span className="text-[rgb(var(--c-zinc-300))] whitespace-pre-wrap break-words">{i.note}</span>
                ) : (
                  <span className="text-[rgb(var(--c-zinc-500))] flex items-center gap-1.5"><Pencil className="w-3 h-3" /> Описание: что понравилось…</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
