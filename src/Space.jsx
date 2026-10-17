import React from 'react';
import { StickyNote, Shirt, Film, Table } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Notes from './Notes';
import Wardrobe from './Wardrobe';
import MediaList from './MediaList';
import Sandbox from './Sandbox';
import PriceCompare from './PriceCompare';
import Widgets from './Widgets';
import { card } from './ui';

const SECTIONS = [
  ['notes', 'Заметки', StickyNote],
  ['wardrobe', 'Гардероб', Shirt],
  ['media', 'Медиа', Film],
  ['excel', 'Excel', Table]
];

// «Пространство»: заметки, гардероб, медиа и Excel-инструменты в одной вкладке
export default function Space({ piggyGoal, piggyTotal, month, balance }) {
  const [saved, setSection] = useLocalStorage('selfhq_space_tab', 'notes');
  const section = SECTIONS.some((s) => s[0] === saved) ? saved : 'notes';

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-pressed={section === id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium cursor-pointer transition ${section === id ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white font-bold' : 'bg-[rgb(var(--c-zinc-950)/0.8)] border-[rgb(var(--c-white)/0.18)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.6)]'}`}
          >
            <Icon className="w-4 h-4" /> {label}
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
            header={<h2 className="flex items-center gap-2 text-xl font-semibold text-[rgb(var(--c-white))]"><Table className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Excel</h2>}
            items={[
              { id: 'sandbox', title: 'Песочница «что если?»', node: <Sandbox piggyGoal={piggyGoal} piggyTotal={piggyTotal} month={month} balance={balance} /> },
              { id: 'price', title: 'Сравнение цен', node: <PriceCompare /> }
            ]}
          />
        </div>
      )}
    </div>
  );
}
