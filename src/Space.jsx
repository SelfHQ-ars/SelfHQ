import React from 'react';
import { StickyNote, Shirt, Film, Table } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Notes from './Notes';
import Wardrobe from './Wardrobe';
import MediaList from './MediaList';
import Sandbox from './Sandbox';
import PriceCompare from './PriceCompare';
import Widgets from './Widgets';
import { card, localISO, sum, readJSON } from './kit';

const SECTIONS = [
  ['notes', 'Заметки', StickyNote],
  ['wardrobe', 'Гардероб', Shirt],
  ['media', 'Медиа', Film],
  ['excel', 'Excel', Table]
];

// «Пространство»: заметки, гардероб, медиа и Excel-инструменты в одной вкладке
export default function Space() {
  const [saved, setSection] = useLocalStorage('selfhq_space_tab', 'notes');
  const section = SECTIONS.some((s) => s[0] === saved) ? saved : 'notes';

  // Данные для «Песочницы» берём из хранилища при каждой смене раздела, поэтому они всегда свежие
  const items = (readJSON('selfhq_finance', { expenses: [] }).expenses || []).filter((i) => typeof i === 'object');
  const ym = localISO().slice(0, 7);
  const monthItems = items.filter((i) => i.date && i.date.startsWith(ym));
  const month = { income: sum(monthItems.filter((i) => i.amount > 0)), expense: Math.abs(sum(monthItems.filter((i) => i.amount < 0))) };
  const openGoal = readJSON('selfhq_goals', []).find((g) => g.target > sum(g.items || []));

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(([id, text, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-pressed={section === id}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium cursor-pointer transition ${section === id ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white' : 'bg-[rgb(var(--c-zinc-950)/0.8)] border-[rgb(var(--c-white)/0.18)] text-[rgb(var(--c-zinc-300))] hover:border-[rgb(var(--c-white)/0.35)] hover:text-[rgb(var(--c-zinc-50))]'}`}
          >
            <Icon className="w-4 h-4" /> {text}
          </button>
        ))}
      </div>

      {section === 'notes' && <Notes />}
      {section === 'wardrobe' && <Wardrobe />}
      {section === 'media' && <MediaList />}
      {section === 'excel' && (
        <div className={`max-w-xl w-full mx-auto ${card} p-3 sm:p-5 flex flex-col gap-3`}>
          <Widgets
            storageKey="selfhq_order_excel"
            className="flex flex-col gap-3"
            header={<h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-[rgb(var(--c-white))]"><Table className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Excel</h2>}
            items={[
              { id: 'sandbox', title: 'Песочница «что если?»', node: <Sandbox piggyGoal={openGoal ? openGoal.target : 0} piggyTotal={openGoal ? sum(openGoal.items || []) : 0} month={month} balance={sum(items)} /> },
              { id: 'price', title: 'Сравнение цен', node: <PriceCompare /> }
            ]}
          />
        </div>
      )}
    </div>
  );
}
