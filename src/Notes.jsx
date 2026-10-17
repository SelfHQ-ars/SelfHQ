import React, { useState } from 'react';
import { BookOpen, Trash2, ChevronRight, StickyNote } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Widgets from './Widgets';
import { card, input, localISO, btnPrimary, btnSecondary, btnIcon } from './kit';

// Ключи, которые не должны попадать в резервную копию (пароли и сессия)
const PRIVATE_KEYS = ['selfhq_accounts', 'selfhq_session'];

const LINKS = [
  ['GitHub', 'https://github.com'],
  ['Figma', 'https://figma.com'],
  ['Stitch', 'https://stitch.withgoogle.com'],
  ['akspic', 'https://akspic.ru/'],
  ['TypingClub', 'https://www.typingclub.com/'],
  ['Van-Pis', 'https://onepiecedl.com/episode-36'],
  ['kinogo', 'https://tv.kinogo.mu/'],
  ['YouTube', 'https://www.youtube.com/']
];

// Заметки, быстрые ссылки и резервная копия данных
export default function Notes() {
  /* ---------- быстрые ссылки (редактируемые) ---------- */
  const [links, setLinks] = useLocalStorage('selfhq_links', LINKS);
  const [editLinks, setEditLinks] = useState(false);
  const [newLink, setNewLink] = useState({ name: '', url: '' });
  const addLink = (e) => {
    e.preventDefault();
    let url = newLink.url.trim();
    if (!newLink.name.trim() || !url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    setLinks([...links, [newLink.name.trim(), url]]);
    setNewLink({ name: '', url: '' });
  };

  /* ---------- заметки и резервная копия ---------- */
  const [notes, setNotes] = useLocalStorage('selfhq_notes', '');
  const exportData = () => {
    const data = {};
    Object.keys(localStorage)
      .filter((k) => k.startsWith('selfhq_') && !PRIVATE_KEYS.includes(k))
      .forEach((k) => (data[k] = localStorage.getItem(k)));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `selfhq-backup-${localISO()}.json`;
    const href = a.href;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1500); // сразу отзывать нельзя: Safari/Firefox не успеют скачать
  };
  const importData = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !window.confirm('Заменить текущие данные данными из файла?')) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        Object.entries(JSON.parse(r.result)).forEach(
          ([k, v]) => k.startsWith('selfhq_') && !PRIVATE_KEYS.includes(k) && typeof v === 'string' && localStorage.setItem(k, v)
        );
        window.location.reload();
      } catch {
        alert('Не удалось прочитать файл');
      }
    };
    r.readAsText(file);
  };

  return (
          <div className="flex flex-col gap-3 md:gap-4">
            <Widgets
              storageKey="selfhq_order_notes"
              className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 items-start"
              items={[
                { id: 'notes', title: 'Заметки', className: 'lg:col-span-2', node: (
            <div className={`${card} p-3 sm:p-4 flex flex-col gap-3`}>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[rgb(var(--c-white))]"><StickyNote className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Заметки</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} placeholder="Быстрые мысли, ссылки, идеи..." className={`${input} w-full resize-y`} />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between pt-3 border-t border-[rgb(var(--c-white)/0.1)]">
                <span className="text-xs text-[rgb(var(--c-zinc-400))]">Данные хранятся только в этом браузере. Сделай копию, чтобы не потерять.</span>
                <div className="flex gap-2">
                  <button onClick={exportData} className={`${btnPrimary} flex-1 sm:flex-none`}>⬇ Скачать копию</button>
                  <label className={`${btnSecondary} flex-1 sm:flex-none cursor-pointer`}>
                    ⬆ Загрузить
                    <input type="file" accept="application/json" onChange={importData} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
) },
                { id: 'links', title: 'Быстрые ссылки', node: (
            <div className={`${card} p-3 sm:p-4 h-fit`}>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-[rgb(var(--c-white))]">
                  <BookOpen className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Быстрые ссылки
                </h2>
                <button onClick={() => setEditLinks(!editLinks)} className={`${btnSecondary} !px-3 !py-1.5`}>
                  {editLinks ? 'Готово' : 'Изменить'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {links.map(([name, href], i) =>
                  editLinks ? (
                    <div key={i} className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-xl text-xs flex items-center justify-between gap-1">
                      <span className="truncate text-[rgb(var(--c-red-200))]">{name}</span>
                      <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className={btnIcon} aria-label="Удалить ссылку"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <a key={i} href={href} target="_blank" rel="noreferrer" className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-xl text-xs hover:border-[rgb(var(--c-red-500))] hover:bg-[rgb(var(--c-red-600)/0.1)] hover:scale-[1.02] transition flex items-center justify-between group shadow-sm">
                      <span className="text-[rgb(var(--c-red-200))] group-hover:text-[rgb(var(--c-white))] font-semibold truncate">{name}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--c-red-600)/0.5)] group-hover:text-[rgb(var(--c-white))]" />
                    </a>
                  )
                )}
              </div>
              {editLinks && (
                <form onSubmit={addLink} className="flex flex-col gap-2 mt-3">
                  <input type="text" value={newLink.name} onChange={(e) => setNewLink({ ...newLink, name: e.target.value })} placeholder="Название" className={input} />
                  <input type="text" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="Адрес (example.com)" className={input} />
                  <button type="submit" className={btnPrimary}>Добавить ссылку</button>
                </form>
              )}
            </div>
) }
              ]}
            />
          </div>
  );
}
