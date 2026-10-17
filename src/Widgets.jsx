import React, { useState } from 'react';
import { Pencil, RotateCcw, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { btnPrimary, btnSecondary } from './kit';

// Список виджетов. Порядок меняется только в режиме правки (кнопка с карандашом):
// на компьютере виджеты можно перетаскивать за ручку, на телефоне — двигать стрелками.
// «Сбросить» возвращает порядок по умолчанию.
export default function Widgets({ storageKey, items, header = null, className = '' }) {
  const [saved, setSaved] = useLocalStorage(storageKey, []);
  const [edit, setEdit] = useState(false);
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);

  const list = items.filter((i) => i.node); // пустые (скрытые) виджеты не показываем
  const ids = list.map((i) => i.id);
  const savedIds = Array.isArray(saved) ? saved : [];
  const order = [...savedIds.filter((id) => ids.includes(id)), ...ids.filter((id) => !savedIds.includes(id))];
  const sorted = order.map((id) => list.find((i) => i.id === id));

  const move = (id, to) => {
    const next = order.filter((x) => x !== id);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, id);
    setSaved(next);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">{header}</div>
        <div className="flex gap-1.5 ml-auto">
          {edit && (
            <button type="button" onClick={() => setSaved([])} className={`${btnSecondary} !px-2.5 !py-1.5`} title="Вернуть порядок по умолчанию">
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить
            </button>
          )}
          <button type="button" onClick={() => setEdit(!edit)} aria-pressed={edit} className={`${edit ? btnPrimary : btnSecondary} !px-2.5 !py-1.5`} title="Изменить порядок виджетов">
            <Pencil className="w-3.5 h-3.5" /> {edit ? 'Готово' : 'Порядок'}
          </button>
        </div>
      </div>
      {edit && <p className="text-[11px] text-[rgb(var(--c-zinc-400))]">Перетаскивай виджеты за ручку (ПК) или двигай стрелками (телефон).</p>}

      <div className={className}>
        {sorted.map((it, idx) => (
          <div
            key={it.id}
            data-widget
            className={`${it.className || ''} ${edit ? 'rounded-2xl outline outline-2 outline-dashed outline-[rgb(var(--c-red-500)/0.6)] p-1.5 flex flex-col gap-1.5' : ''} ${over === it.id && drag && drag !== it.id ? 'ring-2 ring-[rgb(var(--c-red-500))]' : ''}`}
            onDragOver={(e) => drag && e.preventDefault()}
            onDragEnter={() => drag && setOver(it.id)}
            onDrop={(e) => {
              e.preventDefault();
              if (drag && drag !== it.id) move(drag, idx);
              setDrag(null);
              setOver(null);
            }}
          >
            {edit && (
              <div className="flex items-center gap-1.5 px-1">
                <span
                  draggable
                  onDragStart={(e) => {
                    const w = e.currentTarget.closest('[data-widget]');
                    if (w) e.dataTransfer.setDragImage(w, 20, 20);
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', it.id);
                    setDrag(it.id);
                  }}
                  onDragEnd={() => {
                    setDrag(null);
                    setOver(null);
                  }}
                  className="p-1 cursor-grab active:cursor-grabbing text-[rgb(var(--c-zinc-300))]"
                  title="Перетащить"
                >
                  <GripVertical className="w-4 h-4" />
                </span>
                <span className="text-xs text-[rgb(var(--c-zinc-300))] truncate flex-1">{it.title}</span>
                <button type="button" onClick={() => move(it.id, idx - 1)} disabled={idx === 0} className={`${btnSecondary} !p-1.5`} aria-label="Выше"><ChevronUp className="w-4 h-4" /></button>
                <button type="button" onClick={() => move(it.id, idx + 1)} disabled={idx === sorted.length - 1} className={`${btnSecondary} !p-1.5`} aria-label="Ниже"><ChevronDown className="w-4 h-4" /></button>
              </div>
            )}
            <div className={edit ? 'pointer-events-none select-none opacity-80' : 'h-full'}>{it.node}</div>
          </div>
        ))}
      </div>
    </>
  );
}
