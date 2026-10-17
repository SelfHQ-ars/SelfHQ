import React, { useState } from 'react';
import { Trash2, ImagePlus, Shirt } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { card, input, grad, fitToDataUrl } from './ui';

const CATS = ['Футболки', 'Худи', 'Брюки', 'Обувь', 'Верхняя одежда', 'Аксессуары'];
const SEASONS = ['Всесезон', 'Лето', 'Демисезон', 'Зима'];

export default function Wardrobe() {
  const [items, setItems] = useLocalStorage('selfhq_wardrobe', []);
  const [outfits, setOutfits] = useLocalStorage('selfhq_outfits', []);
  const [sizes, setSizes] = useLocalStorage('selfhq_sizes', { height: '', top: '', bottom: '', shoes: '' });
  const [view, setView] = useState('items');
  const [form, setForm] = useState({ name: '', category: CATS[0], season: SEASONS[0], size: '', photo: '' });
  const [fc, setFc] = useState('all');
  const [fs, setFs] = useState('all');
  const [oName, setOName] = useState('');
  const [pick, setPick] = useState([]);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      setForm({ ...form, photo: await fitToDataUrl(f, 500, 0.7) });
    } catch {
      alert('Не удалось открыть картинку');
    }
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setItems([{ id: Date.now(), ...form, name: form.name.trim(), size: form.size.trim() }, ...items]);
      setForm({ ...form, name: '', size: '', photo: '' });
    } catch {
      alert('Не хватает места в браузере: сделай резервную копию и удали лишние фото');
    }
  };

  const saveOutfit = () => {
    if (pick.length < 2) return;
    setOutfits([{ id: Date.now(), name: oName.trim() || `Образ ${outfits.length + 1}`, ids: pick }, ...outfits]);
    setOName('');
    setPick([]);
  };

  const shown = items.filter((i) => (fc === 'all' || i.category === fc) && (fs === 'all' || i.season === fs));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const tab = (active) => `py-2 rounded-xl border text-sm font-medium cursor-pointer transition ${active ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white font-bold' : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)]'}`;

  return (
    <div className={`max-w-3xl mx-auto ${card} p-3 sm:p-5 flex flex-col gap-4`}>
      <h2 className="text-lg sm:text-xl font-semibold text-[rgb(var(--c-white))] flex items-center gap-2"><Shirt className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Гардероб</h2>

      <div className="p-3 bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.12)] rounded-2xl">
        <span className="text-xs text-[rgb(var(--c-zinc-400))] font-medium uppercase">Мои размеры (для покупок онлайн)</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {[['height', 'Рост, см'], ['top', 'Верх'], ['bottom', 'Низ'], ['shoes', 'Обувь']].map(([k, ph]) => (
            <input key={k} type="text" value={sizes[k] ?? ''} onChange={(e) => setSizes({ ...sizes, [k]: e.target.value })} placeholder={ph} className={`${input} min-w-0`} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setView('items')} className={tab(view === 'items')}>Вещи ({items.length})</button>
        <button onClick={() => setView('outfits')} className={tab(view === 'outfits')}>Образы ({outfits.length})</button>
      </div>

      {view === 'items' ? (
        <>
          <form onSubmit={addItem} className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-2xl flex flex-col gap-2">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Название (чёрное худи Nike)" className={input} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${input} cursor-pointer min-w-0`}>{CATS.map((c) => (<option key={c}>{c}</option>))}</select>
              <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className={`${input} cursor-pointer min-w-0`}>{SEASONS.map((c) => (<option key={c}>{c}</option>))}</select>
              <input type="text" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="Размер" className={`${input} min-w-0 col-span-2 sm:col-span-1`} />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--c-red-200))] bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.18)] hover:border-[rgb(var(--c-white)/0.6)] rounded-lg px-3 py-2 cursor-pointer">
                <ImagePlus className="w-4 h-4" /> Фото
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
              {form.photo && <img src={form.photo} alt="" className="w-12 h-12 object-cover rounded-lg border border-[rgb(var(--c-white)/0.18)]" />}
              <button type="submit" className={`ml-auto px-5 py-2 ${grad} rounded-xl text-sm cursor-pointer`}>Добавить</button>
            </div>
          </form>

          <div className="flex gap-2">
            <select value={fc} onChange={(e) => setFc(e.target.value)} className={`${input} flex-1 min-w-0 cursor-pointer`}><option value="all">Все категории</option>{CATS.map((c) => (<option key={c}>{c}</option>))}</select>
            <select value={fs} onChange={(e) => setFs(e.target.value)} className={`${input} flex-1 min-w-0 cursor-pointer`}><option value="all">Все сезоны</option>{SEASONS.map((c) => (<option key={c}>{c}</option>))}</select>
          </div>

          {items.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] italic text-center py-4">Гардероб пуст. Добавь первую вещь.</p>}
          {items.length > 0 && shown.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] italic text-center py-4">По фильтрам ничего нет.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {shown.map((i) => (
              <div key={i.id} className="relative group p-2 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-xl flex flex-col gap-1.5">
                {i.photo ? <img src={i.photo} alt={i.name} className="w-full h-28 object-cover rounded-lg" /> : <div className="w-full h-28 grid place-items-center rounded-lg bg-[rgb(var(--c-zinc-900))] text-3xl">👕</div>}
                <span className="text-sm text-[rgb(var(--c-red-50))] font-semibold break-words leading-tight">{i.name}</span>
                <span className="text-[11px] text-[rgb(var(--c-zinc-400))] font-mono">{i.category} · {i.season}{i.size ? ` · ${i.size}` : ''}</span>
                <button onClick={() => window.confirm(`Удалить «${i.name}»?`) && setItems(items.filter((x) => x.id !== i.id))} className="absolute top-3 right-3 p-1.5 rounded-lg bg-[rgb(var(--c-black)/0.7)] text-[rgb(var(--c-zinc-300))] hover:text-[rgb(var(--c-red-500))] md:opacity-0 md:group-hover:opacity-100 cursor-pointer" aria-label="Удалить"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-2xl flex flex-col gap-2">
            <span className="text-xs text-[rgb(var(--c-zinc-400))]">Выбери от 2 вещей, чтобы собрать образ.</span>
            {items.length === 0 ? (
              <p className="text-xs text-[rgb(var(--c-zinc-500))] italic">Сначала добавь вещи на вкладке «Вещи».</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {items.map((i) => (
                  <button key={i.id} type="button" onClick={() => setPick(pick.includes(i.id) ? pick.filter((x) => x !== i.id) : [...pick, i.id])} className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition ${pick.includes(i.id) ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white' : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)]'}`}>{i.name}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={oName} onChange={(e) => setOName(e.target.value)} placeholder="Название образа" className={`${input} flex-1 min-w-0`} />
              <button type="button" onClick={saveOutfit} disabled={pick.length < 2} className={`px-5 py-2 ${grad} rounded-xl text-sm cursor-pointer disabled:opacity-40`}>Сохранить</button>
            </div>
          </div>

          {outfits.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] italic text-center py-4">Образов пока нет.</p>}
          <div className="flex flex-col gap-3">
            {outfits.map((o) => (
              <div key={o.id} className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[rgb(var(--c-red-50))] break-words">{o.name}</span>
                  <button onClick={() => window.confirm(`Удалить «${o.name}»?`) && setOutfits(outfits.filter((x) => x.id !== o.id))} className="p-1.5 text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] cursor-pointer" aria-label="Удалить образ"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {o.ids.map((id) => byId[id]).filter(Boolean).map((i) => (
                    <div key={i.id} className="flex items-center gap-2 pr-2 bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.15)] rounded-lg overflow-hidden">
                      {i.photo ? <img src={i.photo} alt="" className="w-10 h-10 object-cover" /> : <span className="w-10 h-10 grid place-items-center bg-[rgb(var(--c-zinc-900))]">👕</span>}
                      <span className="text-xs text-[rgb(var(--c-red-100))]">{i.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
