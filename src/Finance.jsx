import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Eye, EyeOff, Flame, Lock, TriangleAlert, Trash2, ImagePlus, X, Tag, Search, Gauge } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Widgets from './Widgets';
import { card, input, label, panel, btnPrimary, btnSecondary, btnIcon, segWrap, seg, Title, fitToDataUrl, localISO, money, sum, num2, fmt } from './kit';

const CATEGORIES = [
  { name: 'Еда', color: '#ef4444' },
  { name: 'Транспорт', color: '#f97316' },
  { name: 'Развлечения', color: '#eab308' },
  { name: 'Учёба', color: '#22c55e' },
  { name: 'Другое', color: '#a1a1aa' }
];
const STREAK_XP = 50;

// Кольцевая диаграмма расходов по категориям (SVG)
function Donut({ data, total }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90" role="img" aria-label="Расходы по категориям за месяц">
      <circle cx="60" cy="60" r={R} fill="none" strokeWidth="14" style={{ stroke: 'rgb(var(--c-white) / 0.08)' }} />
      {data.map((d) => {
        const len = (d.value / total) * C;
        const dash = Math.max(len - (data.length > 1 ? 1.5 : 0), 0);
        const el = <circle key={d.name} cx="60" cy="60" r={R} fill="none" stroke={d.color} strokeWidth="14" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} />;
        offset += len;
        return el;
      })}
    </svg>
  );
}

export default function Finance({ gainXp, onPhoto }) {
  /* ---------- данные ---------- */
  const [financeData, setFinanceData] = useLocalStorage('selfhq_finance', { expenses: [] });
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('expense'); // на iOS в поле number нет минуса — выбираем тип кнопкой
  const [category, setCategory] = useState('Еда');
  const [moneyNote, setMoneyNote] = useState('');
  const [moneyPhoto, setMoneyPhoto] = useState('');
  const [selectedDate, setSelectedDate] = useState(localISO());
  const [activeReport, setActiveReport] = useState('month');
  const [showBalance, setShowBalance] = useState(false); // баланс скрыт, пока не нажмёшь
  const [opsQuery, setOpsQuery] = useState('');
  const [opsKind, setOpsKind] = useState('all');

  // Миграция старого формата (просто числа) в объекты
  useEffect(() => {
    const list = financeData.expenses || [];
    if (list.some((i) => typeof i !== 'object')) {
      setFinanceData({
        ...financeData,
        expenses: list.map((a, i) => (typeof a === 'object' ? a : { id: `old-${i}-${Date.now()}`, amount: a, date: null }))
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMoney = (e) => {
    e.preventDefault();
    const val = Math.abs(parseFloat(amount.replace(',', '.')));
    if (!Number.isFinite(val) || val === 0) return;
    const signed = kind === 'expense' ? -val : val;
    try {
      setFinanceData({
        ...financeData,
        expenses: [
          {
            id: Date.now(),
            amount: signed,
            date: selectedDate,
            category: kind === 'expense' ? category : null,
            ...(moneyNote.trim() ? { note: moneyNote.trim() } : {}),
            ...(moneyPhoto ? { photo: moneyPhoto } : {})
          },
          ...(financeData.expenses || [])
        ]
      });
      setAmount('');
      setMoneyNote('');
      setMoneyPhoto('');
    } catch {
      alert('Не хватает места в браузере: сделай резервную копию и удали старые фото');
    }
  };

  const deleteMoney = (id) => setFinanceData({ ...financeData, expenses: (financeData.expenses || []).filter((i) => i.id !== id) });

  const all = (financeData.expenses || []).filter((i) => typeof i === 'object');
  const nowD = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(nowD.getDate() - 6); // сегодня + 6 предыдущих = ровно 7 дней
  const ym = localISO(nowD).slice(0, 7);
  const y = localISO(nowD).slice(0, 4);

  const total = sum(all);
  const periodItems = {
    week: all.filter((i) => i.date && i.date >= localISO(weekAgo)),
    month: all.filter((i) => i.date && i.date.startsWith(ym)),
    year: all.filter((i) => i.date && i.date.startsWith(y)),
    day: all.filter((i) => i.date === selectedDate)
  };
  const r2 = (n) => Math.round(n * 100) / 100;
  const stat = (list) => ({
    income: sum(list.filter((i) => i.amount > 0)),
    expense: Math.abs(sum(list.filter((i) => i.amount < 0))),
    net: sum(list)
  });
  const totals = Object.fromEntries(Object.entries(periodItems).map(([k, v]) => [k, stat(v)]));
  // Разбивка периода по дням (новые сверху)
  const byDay = (list) => {
    const m = {};
    list.forEach((i) => {
      const d = m[i.date] || (m[i.date] = { date: i.date, income: 0, expense: 0 });
      if (i.amount > 0) d.income += i.amount;
      else d.expense -= i.amount;
    });
    return Object.values(m).sort((a, b) => b.date.localeCompare(a.date));
  };
  const reportLabels = {
    week: 'За последние 7 дней:',
    month: 'За текущий месяц:',
    year: 'За текущий год:',
    day: `За ${selectedDate}:`
  };
  const reportButtons = [['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год'], ['day', 'День']];
  /* ---------- лимит и категории ---------- */
  const [limit, setLimit] = useLocalStorage('selfhq_limit', 0);
  const monthExpenses = all.filter((i) => i.amount < 0 && i.date && i.date.startsWith(ym));
  const monthSpent = Math.abs(sum(monthExpenses));
  const limitPct = limit > 0 ? (monthSpent / limit) * 100 : 0;
  const tone = limitPct >= 100 ? 'rose' : limitPct >= 80 ? 'amber' : 'emerald';
  const toneBar = { rose: 'bg-[rgb(var(--c-rose-500))]', amber: 'bg-[rgb(var(--c-amber-400))]', emerald: 'bg-[rgb(var(--c-emerald-500))]' }[tone];
  const toneText = { rose: 'text-[rgb(var(--c-rose-400))]', amber: 'text-[rgb(var(--c-amber-300))]', emerald: 'text-[rgb(var(--c-emerald-400))]' }[tone];

  const catSpent = CATEGORIES.map((c) => ({ ...c, value: Math.abs(sum(monthExpenses.filter((i) => (i.category || 'Другое') === c.name))) }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const catTotal = catSpent.reduce((a, c) => a + c.value, 0);

  /* ---------- огоньки ---------- */
  // Огонёк за день, если расходы месяца к концу этого дня не превысили месячный лимит.
  // Не нужно тратить «ровно лимит ÷ дни»: крупная покупка в один день ничего не ломает, пока ты в лимите.
  const [streakData, setStreakData] = useLocalStorage('selfhq_streak', { last: '', streak: 0, best: 0, flames: 0, since: '', monthsDone: '', history: [] });
  const daysIn = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0).getDate();
  const shiftDay = (iso, n) => localISO(new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + n));
  const shiftMonth = (m, n) => {
    const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  // Расходы с начала месяца по указанный день включительно
  const cumSpent = (iso) => Math.abs(sum(all.filter((i) => i.amount < 0 && i.date && i.date.startsWith(iso.slice(0, 7)) && i.date <= iso)));
  const withinLimit = (iso) => limit > 0 && cumSpent(iso) <= limit;
  const todayISO = localISO();
  const streakRan = useRef(false);

  const dimNow = daysIn(todayISO);
  const dayNum = nowD.getDate();
  const trackFrom = streakData.since || (streakData.last ? shiftDay(streakData.last, 1) : todayISO);
  const dayCells = Array.from({ length: dimNow }, (_, i) => {
    const iso = `${ym}-${String(i + 1).padStart(2, '0')}`;
    let state = 'idle';
    if (limit > 0) {
      if (iso === todayISO) state = withinLimit(iso) ? 'today-ok' : 'today-over';
      else if (iso < todayISO && iso >= trackFrom) state = withinLimit(iso) ? 'ok' : 'over';
    }
    return { iso, day: i + 1, state };
  });
  const monthLit = dayCells.filter((c) => c.state === 'ok').length;
  const lastMonth = (streakData.history || []).slice(-1)[0];

  // Умные подсказки: сколько можно тратить в день до конца месяца и куда идёт темп
  const leftToSpend = Math.max(0, limit - monthSpent);
  const perDayLeft = leftToSpend / Math.max(1, dimNow - dayNum + 1);
  const forecast = (monthSpent / Math.max(1, dayNum)) * dimNow;
  const forecastOver = limit > 0 && forecast > limit;
  // Сравнение с прошлым месяцем на тот же день
  const prevYM = shiftMonth(ym, -1);
  const prevSame = Math.abs(sum(all.filter((i) => i.amount < 0 && i.date && i.date.startsWith(prevYM) && Number(i.date.slice(8, 10)) <= dayNum)));
  const deltaPct = prevSame > 0 ? Math.round((monthSpent / prevSame - 1) * 100) : null;

  useEffect(() => {
    if (streakRan.current) return;
    streakRan.current = true;
    const yesterday = shiftDay(todayISO, -1);
    const prevMonth = shiftMonth(todayISO.slice(0, 7), -1);
    const d = { last: '', streak: 0, best: 0, flames: 0, since: '', monthsDone: '', history: [], ...streakData };
    let reward = 0;
    let changed = false;
    if (!d.last) {
      Object.assign(d, { last: yesterday, since: todayISO, monthsDone: prevMonth }); // отсчёт начинается с сегодняшнего дня
      changed = true;
    } else {
      if (!d.since) { d.since = shiftDay(d.last, 1); changed = true; }
      if (!d.monthsDone) { d.monthsDone = prevMonth; changed = true; }
      if (limit > 0 && d.last < yesterday) {
        let from = shiftDay(d.last, 1);
        const floor = shiftDay(yesterday, -6); // догоняем максимум за последние 7 дней
        if (from < floor) from = floor;
        for (let day = from; day <= yesterday; day = shiftDay(day, 1)) {
          if (withinLimit(day)) {
            d.streak += 1;
            reward += STREAK_XP;
            d.best = Math.max(d.best, d.streak);
          } else {
            d.streak = 0;
          }
        }
        d.last = yesterday;
        changed = true;
      }
      // Закрытые месяцы: уложился в лимит, значит сразу получаешь огоньки за все дни месяца (28/29/30/31)
      for (let m = shiftMonth(d.monthsDone, 1), guard = 0; m <= prevMonth && guard < 12; m = shiftMonth(m, 1), guard += 1) {
        const items = all.filter((i) => i.date && i.date.startsWith(m));
        const spent = Math.abs(sum(items.filter((i) => i.amount < 0)));
        const days = daysIn(`${m}-01`);
        const ok = limit > 0 && items.length > 0 && spent <= limit;
        if (ok) d.flames += days;
        d.history = [...d.history, { ym: m, ok, days }].slice(-12);
        changed = true;
      }
      if (d.monthsDone !== prevMonth) { d.monthsDone = prevMonth; changed = true; }
    }
    if (changed) setStreakData(d);
    if (reward) gainXp(reward);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Операции: поиск и фильтр по типу
  const q = opsQuery.trim().toLowerCase();
  const opsShown = all.filter((i) => (opsKind === 'all' || (opsKind === 'expense' ? i.amount < 0 : i.amount > 0)) && (!q || `${i.category || ''} ${i.note || ''} ${i.date || ''}`.toLowerCase().includes(q)));
  const tile = (title, value, cls) => (
    <div className="p-2 rounded-lg bg-[rgb(var(--c-black)/0.4)] border border-[rgb(var(--c-white)/0.1)] text-center min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-[rgb(var(--c-zinc-500))]">{title}</div>
      <div className={`text-sm font-semibold font-mono tabular-nums truncate ${cls}`}>{value}</div>
    </div>
  );

  return (
    <>
      <div className="max-w-xl mx-auto mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgb(var(--c-emerald-500)/0.3)] bg-[rgb(var(--c-emerald-950)/0.2)] text-[11px] text-[rgb(var(--c-emerald-100)/0.9)]">
        <Lock className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--c-emerald-400))]" />
        <span>Данные хранятся только на этом устройстве. Никаких серверов. Копию можно сделать в «Пространство → Заметки».</span>
      </div>
      <div className={`max-w-xl mx-auto ${card} p-3 sm:p-5 flex flex-col gap-3`}>
        <Widgets
          storageKey="selfhq_order_finance"
          className="flex flex-col gap-3"
          header={<h2 className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-[rgb(var(--c-white))]"><CreditCard className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Финансы</h2>}
          items={[
            {
              id: 'balance',
              title: 'Баланс',
              node: (
                <button type="button" onClick={() => setShowBalance(!showBalance)} aria-pressed={showBalance} className={`${panel} relative w-full flex flex-col items-center justify-center gap-1 py-5 hover:border-[rgb(var(--c-white)/0.25)] transition cursor-pointer`}>
                  <span className={label}>Общий баланс</span>
                  <span className={`text-3xl sm:text-4xl font-semibold font-mono tabular-nums tracking-tight transition ${total >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'} ${showBalance ? '' : 'blur-md select-none'}`}>{money(total)}</span>
                  <span className="text-[11px] text-[rgb(var(--c-zinc-500))]">{showBalance ? 'Нажми, чтобы скрыть' : 'Нажми, чтобы показать'}</span>
                  <span className="absolute top-3 right-3 text-[rgb(var(--c-zinc-500))]">{showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</span>
                </button>
              )
            },
            {
              id: 'limit',
              title: 'Лимит и огоньки',
              node: (
                <div className={`${panel} flex flex-col gap-3`}>
                  <div className="flex justify-between items-center gap-3">
                    <Title icon={Gauge}>Лимит на месяц</Title>
                    <input type="number" inputMode="numeric" value={limit || ''} onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))} placeholder="не задан" className={`${input} w-32 py-1.5 text-right font-mono`} />
                  </div>
                  {limit > 0 && (
                    <>
                      <div>
                        <div className="h-2 bg-[rgb(var(--c-zinc-900))] rounded-full overflow-hidden border border-[rgb(var(--c-white)/0.12)]"><div className={`${toneBar} h-full transition-all`} style={{ width: `${Math.min(100, limitPct)}%` }} /></div>
                        <div className="flex justify-between mt-1.5 text-xs font-mono tabular-nums">
                          <span className="text-[rgb(var(--c-zinc-300))]">Потрачено {money(monthSpent)} <span className={toneText}>({Math.round(limitPct)}%)</span></span>
                          <span className={limitPct >= 100 ? 'text-[rgb(var(--c-rose-400))]' : 'text-[rgb(var(--c-zinc-400))]'}>{limitPct >= 100 ? `Сверх на ${money(monthSpent - limit)}` : `Осталось ${money(leftToSpend)}`}</span>
                        </div>
                      </div>
                      <div className="text-xs text-[rgb(var(--c-zinc-300))] leading-relaxed">
                        {limitPct < 100 && <p>До конца месяца в среднем <b className="font-mono">{money(perDayLeft)}</b> в день, но тратить можно неравномерно: важен общий итог.</p>}
                        {dayNum >= 3 && (
                          <p className={forecastOver ? 'text-[rgb(var(--c-amber-300))]' : 'text-[rgb(var(--c-zinc-400))]'}>
                            При текущем темпе к концу месяца выйдет ≈ {money(forecast)}{forecastOver ? `, это на ${money(forecast - limit)} больше лимита.` : ', в пределах лимита.'}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  <div className="pt-3 border-t border-[rgb(var(--c-white)/0.1)] flex flex-col gap-2">
                    <Title icon={Flame} right={<span className="text-xs font-mono text-[rgb(var(--c-zinc-300))]">{monthLit}/{dimNow} <span className="text-[rgb(var(--c-zinc-500))]">· всего {streakData.flames || 0}</span></span>}>Огоньки</Title>
                    {limit > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-1" role="img" aria-label={`Огоньки месяца: ${monthLit} из ${dimNow}`}>
                          {dayCells.map((c) => (
                            <span key={c.iso} title={`${c.day}`} className={`w-5 h-5 grid place-items-center rounded-md ${c.state.startsWith('today') ? 'ring-1 ring-[rgb(var(--c-orange-500)/0.7)]' : ''}`}>
                              {c.state === 'ok' ? <Flame className="w-4 h-4 text-[rgb(var(--c-orange-400))] fill-[rgb(var(--c-orange-500))]" /> : c.state === 'today-ok' ? <Flame className="w-4 h-4 text-[rgb(var(--c-orange-400)/0.7)]" /> : c.state === 'over' || c.state === 'today-over' ? <X className="w-3 h-3 text-[rgb(var(--c-rose-400)/0.7)]" /> : <span className="w-1 h-1 rounded-full bg-[rgb(var(--c-white)/0.2)]" />}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-[rgb(var(--c-zinc-500))] leading-relaxed">
                          Огонёк и +{STREAK_XP} XP за каждый день, пока расходы месяца не превысили лимит. Серия {streakData.streak} дн., рекорд {streakData.best}. Если месяц закончится в лимите, огоньки за все его дни (сейчас {dimNow}) добавятся сразу.
                        </p>
                        {lastMonth && (
                          <p className="text-[11px] text-[rgb(var(--c-zinc-400))]">
                            Прошлый месяц ({new Date(`${lastMonth.ym}-01T00:00`).toLocaleDateString('ru-RU', { month: 'long' })}): {lastMonth.ok ? `+${lastMonth.days} огоньков` : 'лимит не выдержан, огоньков нет'}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-[rgb(var(--c-zinc-500))]">Задай лимит на месяц, и огоньки заработают.</p>
                    )}
                  </div>
                </div>
              )
            },
            {
              id: 'add',
              title: 'Новая запись',
              node: (
                <form onSubmit={addMoney} className={`${panel} flex flex-col gap-2.5`}>
                  <Title>Новая запись</Title>
                  <div className={`${segWrap} w-full`}>
                    {[['expense', 'Расход'], ['income', 'Доход']].map(([id, text]) => (
                      <button key={id} type="button" onClick={() => setKind(id)} aria-pressed={kind === id} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer ${kind === id ? (id === 'expense' ? 'bg-[rgb(var(--c-rose-600))] text-white' : 'bg-[rgb(var(--c-emerald-600))] text-white') : 'text-[rgb(var(--c-zinc-300))] hover:text-[rgb(var(--c-zinc-50))] hover:bg-[rgb(var(--c-white)/0.05)]'}`}>{text}</button>
                    ))}
                  </div>
                  {kind === 'expense' && (
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((c) => (
                        <button key={c.name} type="button" onClick={() => setCategory(c.name)} aria-pressed={category === c.name} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition ${category === c.name ? 'border-[rgb(var(--c-red-500)/0.6)] bg-[rgb(var(--c-red-600)/0.15)] text-[rgb(var(--c-red-100))]' : 'border-[rgb(var(--c-white)/0.15)] bg-[rgb(var(--c-black)/0.3)] text-[rgb(var(--c-zinc-300))] hover:border-[rgb(var(--c-white)/0.3)]'}`}>
                          <i className="w-2 h-2 rounded-full" style={{ background: c.color }} /> {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма, ₸" className={`${input} min-w-0 font-mono text-lg md:text-base`} />
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value || localISO())} className={`${input} w-36 font-mono`} aria-label="Дата записи" />
                  </div>
                  <input type="text" value={moneyNote} onChange={(e) => setMoneyNote(e.target.value)} maxLength={120} placeholder="Заметка (гарантия до…, магазин, зачем)" className={input} />
                  <div className="flex items-center gap-2">
                    <label className={`${btnSecondary} cursor-pointer`}>
                      <ImagePlus className="w-4 h-4" /> Чек или фото
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          try {
                            setMoneyPhoto(await fitToDataUrl(f));
                          } catch {
                            alert('Не удалось открыть картинку');
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {moneyPhoto && (
                      <div className="relative w-10 h-10">
                        <img src={moneyPhoto} alt="" className="w-full h-full object-cover rounded-lg border border-[rgb(var(--c-white)/0.18)]" />
                        <button type="button" onClick={() => setMoneyPhoto('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-[rgb(var(--c-red-600))] text-white cursor-pointer" aria-label="Убрать фото"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                    <button type="submit" className={`${btnPrimary} ml-auto px-5`}>{kind === 'expense' ? 'Записать расход' : 'Записать доход'}</button>
                  </div>
                </form>
              )
            },
            {
              id: 'reports',
              title: 'Выписки',
              node: (
                <div className={`${panel} flex flex-col gap-3`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Title>Выписки</Title>
                    <div className={segWrap}>
                      {reportButtons.map(([id, text]) => (
                        <button key={id} type="button" onClick={() => setActiveReport(id)} aria-pressed={activeReport === id} className={seg(activeReport === id)}>{text}</button>
                      ))}
                    </div>
                  </div>
                  {activeReport === 'day' && <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value || localISO())} className={`${input} font-mono`} />}
                  <div className="text-xs text-[rgb(var(--c-zinc-400))]">{reportLabels[activeReport]}</div>
                  {(activeReport === 'month' || activeReport === 'year') && (
                    <p role="alert" className="flex items-start gap-1.5 text-[11px] text-[rgb(var(--c-amber-300))] bg-[rgb(var(--c-amber-400)/0.1)] border border-[rgb(var(--c-amber-400)/0.3)] rounded-lg p-2">
                      <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>{activeReport === 'month' ? 'Месяц' : 'Год'} ещё не закончился, данные взяты как есть.</span>
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {tile('Доход', `+${num2(totals[activeReport].income)}`, 'text-[rgb(var(--c-emerald-400))]')}
                    {tile('Расход', `−${num2(totals[activeReport].expense)}`, 'text-[rgb(var(--c-rose-400))]')}
                    {tile('Итого', fmt(totals[activeReport].net), totals[activeReport].net >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]')}
                  </div>
                  {activeReport === 'month' && deltaPct !== null && (
                    <p className="text-xs text-[rgb(var(--c-zinc-400))]">
                      К тому же дню прошлого месяца расходы{' '}
                      <span className={deltaPct > 0 ? 'text-[rgb(var(--c-rose-400))]' : 'text-[rgb(var(--c-emerald-400))]'}>{deltaPct === 0 ? 'такие же' : `${deltaPct > 0 ? 'выше' : 'ниже'} на ${Math.abs(deltaPct)}%`}</span> ({money(prevSame)}).
                    </p>
                  )}
                  {activeReport !== 'day' && periodItems[activeReport].length > 0 && (
                    <div className="border-t border-[rgb(var(--c-white)/0.1)] pt-2">
                      <div className="grid grid-cols-3 text-[10px] uppercase tracking-wide text-[rgb(var(--c-zinc-500))] pb-1">
                        <span>Дата</span><span className="text-right">Доход</span><span className="text-right">Расход</span>
                      </div>
                      <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                        {byDay(periodItems[activeReport]).map((d) => (
                          <div key={d.date} className="grid grid-cols-3 text-[11px] font-mono tabular-nums">
                            <span className="text-[rgb(var(--c-zinc-400))]">{d.date}</span>
                            <span className="text-right text-[rgb(var(--c-emerald-400))]">{d.income ? `+${num2(d.income)}` : '·'}</span>
                            <span className="text-right text-[rgb(var(--c-rose-400))]">{d.expense ? `−${num2(d.expense)}` : '·'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'categories',
              title: 'Траты по категориям',
              node: catSpent.length > 0 && (
                <div className={`${panel} flex flex-col gap-3`}>
                  <Title icon={Tag}>Траты за месяц по категориям</Title>
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <Donut data={catSpent} total={catTotal} />
                      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-[rgb(var(--c-zinc-500))]">Всего</div>
                          <div className="text-xs font-semibold font-mono tabular-nums text-[rgb(var(--c-zinc-100))]">{money(catTotal)}</div>
                        </div>
                      </div>
                    </div>
                    <ul className="flex-1 min-w-0 flex flex-col gap-2">
                      {catSpent.map((c) => (
                        <li key={c.name} className="text-xs">
                          <div className="flex items-center gap-2">
                            <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                            <span className="truncate text-[rgb(var(--c-zinc-100))]">{c.name}</span>
                            <span className="ml-auto font-mono tabular-nums text-[rgb(var(--c-zinc-300))]">{money(c.value)}</span>
                            <span className="w-9 text-right font-mono text-[rgb(var(--c-zinc-500))]">{Math.round((c.value / catTotal) * 100)}%</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-[11px] text-[rgb(var(--c-zinc-400))]">Больше всего уходит на «{catSpent[0].name}»: {Math.round((catSpent[0].value / catTotal) * 100)}% трат месяца.</p>
                </div>
              )
            },
            {
              id: 'ops',
              title: 'Все операции',
              node: (
                <div className={`${panel} flex flex-col gap-2.5`}>
                  <Title right={<span className="text-[11px] text-[rgb(var(--c-zinc-500))] font-mono">{opsShown.length}/{all.length}</span>}>Все операции</Title>
                  <div className="flex gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[8rem]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--c-zinc-500))]" />
                      <input type="search" value={opsQuery} onChange={(e) => setOpsQuery(e.target.value)} placeholder="Поиск: категория, заметка, дата" className={`${input} w-full pl-8 py-1.5`} />
                    </div>
                    <div className={segWrap}>
                      {[['all', 'Все'], ['expense', 'Расходы'], ['income', 'Доходы']].map(([id, text]) => (
                        <button key={id} type="button" onClick={() => setOpsKind(id)} aria-pressed={opsKind === id} className={seg(opsKind === id)}>{text}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
                    {all.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] text-center py-4">Операций пока нет.</p>}
                    {all.length > 0 && opsShown.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] text-center py-4">Ничего не найдено.</p>}
                    {opsShown.map((item) => (
                      <div key={item.id} className="px-3 py-2 bg-[rgb(var(--c-black)/0.4)] border border-[rgb(var(--c-white)/0.1)] rounded-lg flex items-center gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={`font-mono font-semibold text-sm tabular-nums ${item.amount >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'}`}>{fmt(item.amount)}</span>
                          <span className="text-[11px] text-[rgb(var(--c-zinc-500))] font-mono">{item.date || 'Без даты'}{item.category ? ` · ${item.category}` : ''}</span>
                          {item.note && <span className="text-xs text-[rgb(var(--c-zinc-300))] break-words mt-0.5">{item.note}</span>}
                        </div>
                        {item.photo && (
                          <button type="button" onClick={() => onPhoto(item.photo)} className="shrink-0 cursor-zoom-in" aria-label="Открыть фото">
                            <img src={item.photo} alt="Чек или покупка" className="w-9 h-9 object-cover rounded-lg border border-[rgb(var(--c-white)/0.12)]" />
                          </button>
                        )}
                        <button type="button" onClick={() => window.confirm('Удалить операцию?') && deleteMoney(item.id)} className={btnIcon} aria-label="Удалить операцию"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          ]}
        />
      </div>
    </>
  );
}
