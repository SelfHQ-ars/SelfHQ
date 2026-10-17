import React, { useState, useEffect } from 'react';
import { PiggyBank, Trash2, Target, Check } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { input, panel, label, btnPrimary, btnSecondary, btnDanger, btnIcon, Title, localISO, money, sum, num2, fmt, readJSON } from './kit';

const toNum = (v) => {
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const parseISO = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return localISO(d);
};
const niceDate = (iso) => parseISO(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const QUICK = [1000, 5000, 10000, 50000];

// Расчёт по одной цели: сколько накоплено, темп, прогноз, график к сроку
function analyze(goal) {
  const items = goal.items || [];
  const saved = sum(items);
  const remaining = Math.max(0, goal.target - saved);
  const pct = goal.target > 0 ? Math.min(100, (saved / goal.target) * 100) : 0;
  const today = localISO();
  // Темп: чистые взносы за последние 90 дней (но не меньше 7 дней периода, чтобы не завышать)
  const dates = items.map((i) => i.date).filter(Boolean).sort();
  const span = dates.length ? Math.min(90, Math.max(7, diffDays(dates[0], today) + 1)) : 0;
  const since = addDays(today, -89);
  const perDay = span ? sum(items.filter((i) => i.date >= since)) / span : 0;
  const perMonth = perDay * 30.44;
  const etaDays = remaining > 0 && perDay > 0 ? Math.ceil(remaining / perDay) : null;
  const daysLeft = goal.deadline ? diffDays(today, goal.deadline) : null;
  const needMonth = remaining > 0 && daysLeft > 0 ? remaining / (daysLeft / 30.44) : null;
  let status = null;
  if (goal.target > 0 && remaining === 0) status = 'done';
  else if (goal.deadline) status = daysLeft <= 0 ? 'late' : perMonth >= (needMonth || 0) * 0.95 ? 'ontrack' : 'behind';
  return { saved, remaining, pct, perMonth, etaDays, etaDate: etaDays !== null ? addDays(today, etaDays) : null, daysLeft, needMonth, status };
}

const STATUS = {
  done: ['Достигнута', 'border-[rgb(var(--c-emerald-500)/0.4)] bg-[rgb(var(--c-emerald-950)/0.3)] text-[rgb(var(--c-emerald-300))]'],
  ontrack: ['В графике', 'border-[rgb(var(--c-emerald-500)/0.4)] bg-[rgb(var(--c-emerald-950)/0.3)] text-[rgb(var(--c-emerald-300))]'],
  behind: ['Отстаёшь от графика', 'border-[rgb(var(--c-amber-400)/0.4)] bg-[rgb(var(--c-amber-950)/0.3)] text-[rgb(var(--c-amber-300))]'],
  late: ['Срок вышел', 'border-[rgb(var(--c-rose-500)/0.4)] bg-[rgb(var(--c-rose-950)/0.3)] text-[rgb(var(--c-rose-300))]']
};

// Копилка: несколько целей, умный расчёт срока и подсказка по остатку лимита
export default function Piggy() {
  const [goals, setGoals] = useLocalStorage('selfhq_goals', []);
  const [form, setForm] = useState({ name: '', target: '', deadline: '' });
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState({});
  const [errors, setErrors] = useState({});
  const [showAll, setShowAll] = useState({});

  // Перенос старой одиночной копилки в первую цель (один раз)
  useEffect(() => {
    if (goals.length || localStorage.getItem('selfhq_goals_migrated')) return;
    localStorage.setItem('selfhq_goals_migrated', '1');
    const old = readJSON('selfhq_piggy', null);
    if (old && (old.goal > 0 || (old.items || []).length)) {
      setGoals([{ id: Date.now(), name: old.goalName || 'Моя копилка', target: old.goal || 0, deadline: '', items: old.items || [] }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Остаток месячного лимита — сколько можно отложить, не выходя за рамки
  const limit = readJSON('selfhq_limit', 0);
  const fin = readJSON('selfhq_finance', { expenses: [] });
  const ym = localISO().slice(0, 7);
  const monthSpent = Math.abs(sum((fin.expenses || []).filter((i) => typeof i === 'object' && i.amount < 0 && i.date && i.date.startsWith(ym))));
  const monthLeft = limit > 0 ? Math.max(0, limit - monthSpent) : 0;

  const addGoal = (e) => {
    e.preventDefault();
    const target = toNum(form.target);
    if (!form.name.trim() || target <= 0) return;
    setGoals([...goals, { id: Date.now(), name: form.name.trim(), target, deadline: form.deadline, items: [] }]);
    setForm({ name: '', target: '', deadline: '' });
  };
  const upd = (id, patch) => setGoals(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const move = (g, sign) => {
    const val = Math.abs(toNum(amounts[g.id]));
    if (!val) return setErrors({ ...errors, [g.id]: 'Введи сумму' });
    if (sign < 0 && val > sum(g.items)) return setErrors({ ...errors, [g.id]: `В копилке только ${money(sum(g.items))}` });
    upd(g.id, { items: [{ id: Date.now(), amount: sign * val, date: localISO(), note: (notes[g.id] || '').trim() }, ...g.items] });
    setAmounts({ ...amounts, [g.id]: '' });
    setNotes({ ...notes, [g.id]: '' });
    setErrors({ ...errors, [g.id]: '' });
  };

  const totalSaved = sum(goals.flatMap((g) => g.items || []));
  const firstOpen = goals.find((g) => g.target > sum(g.items || []));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-2">
        <Title icon={PiggyBank}>Копилка</Title>
        <div className="text-right">
          <div className={label}>Всего накоплено</div>
          <div className="font-mono font-semibold tabular-nums text-xl text-[rgb(var(--c-amber-300))]">{money(totalSaved)}</div>
        </div>
      </div>

      {monthLeft > 0 && firstOpen && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[rgb(var(--c-emerald-500)/0.3)] bg-[rgb(var(--c-emerald-950)/0.2)] text-xs text-[rgb(var(--c-emerald-100)/0.9)]">
          <span>В этом месяце ещё не потрачено <b className="font-mono">{money(monthLeft)}</b> из лимита. Можно отложить на «{firstOpen.name}».</span>
          <button type="button" onClick={() => setAmounts({ ...amounts, [firstOpen.id]: String(Math.floor(monthLeft / 100) * 100 || Math.floor(monthLeft)) })} className={`${btnSecondary} shrink-0`}>Подставить</button>
        </div>
      )}

      <form onSubmit={addGoal} className={`${panel} flex flex-col gap-2`}>
        <Title icon={Target}>Новая цель</Title>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-2">
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="На что копим (ноутбук)" className={`${input} min-w-0`} />
          <input type="text" inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Сумма, ₸" className={`${input} font-mono min-w-0`} />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[11px] text-[rgb(var(--c-zinc-400))] flex-1">
            К дате (необязательно)
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={`${input} py-1.5 font-mono flex-1 min-w-0`} />
          </label>
          <button type="submit" className={btnPrimary}>Создать цель</button>
        </div>
      </form>

      {goals.length === 0 && <p className="text-xs text-[rgb(var(--c-zinc-500))] text-center py-4">Целей пока нет. Создай первую выше.</p>}

      {goals.map((g) => {
        const a = analyze(g);
        const st = a.status ? STATUS[a.status] : null;
        const items = g.items || [];
        const list = showAll[g.id] ? items : items.slice(0, 4);
        return (
          <div key={g.id} className={`${panel} flex flex-col gap-3`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[rgb(var(--c-red-50))] break-words">{g.name}</div>
                <div className="text-[11px] text-[rgb(var(--c-zinc-500))] font-mono">{g.deadline ? `до ${niceDate(g.deadline)}` : 'без срока'}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {st && <span className={`px-2 py-0.5 rounded-full border text-[11px] ${st[1]}`}>{st[0]}</span>}
                <button type="button" onClick={() => window.confirm(`Удалить цель «${g.name}» вместе с историей?`) && setGoals(goals.filter((x) => x.id !== g.id))} className={btnIcon} aria-label="Удалить цель"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-4 bg-[rgb(var(--c-black)/0.4)] border border-[rgb(var(--c-white)/0.08)] rounded-xl flex flex-col gap-2.5">
              <div className="flex flex-col items-center justify-center text-center pb-2 border-b border-[rgb(var(--c-white)/0.08)]">
                <span className="text-[10px] uppercase tracking-wider text-[rgb(var(--c-zinc-400))] font-semibold mb-0.5">Накоплено</span>
                <span className="font-mono text-2xl sm:text-3xl font-bold text-[rgb(var(--c-amber-300))] tracking-tight">{money(a.saved)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-[rgb(var(--c-zinc-400))]">
              <span>Цель: {money(g.target)}</span>
              <span className="font-bold text-[rgb(var(--c-amber-400))]">{Math.round(a.pct)}%</span>
              </div>
              <div className="h-2 bg-[rgb(var(--c-zinc-900))] rounded-full overflow-hidden border border-[rgb(var(--c-white)/0.1)]">
                <div className="bg-gradient-to-r from-[rgb(var(--c-orange-500))] via-[rgb(var(--c-amber-400))] to-[rgb(var(--c-emerald-400))] h-full transition-all duration-500" style={{ width: `${a.pct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Осталось', a.status === 'done' ? '—' : money(a.remaining)],
                ['Темп / мес', a.perMonth > 0 ? money(a.perMonth) : '—'],
                [g.deadline ? 'Нужно / мес' : 'Прогноз', g.deadline ? (a.needMonth ? money(a.needMonth) : '—') : a.etaDays !== null ? `${a.etaDays} дн.` : '—']
              ].map(([k, v]) => (
                <div key={k} className="p-2 rounded-lg bg-[rgb(var(--c-black)/0.4)] border border-[rgb(var(--c-white)/0.1)]">
                  <div className="text-[10px] uppercase tracking-wide text-[rgb(var(--c-zinc-500))]">{k}</div>
                  <div className="text-xs font-mono font-semibold tabular-nums text-[rgb(var(--c-zinc-100))] mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            <p className="text-xs text-[rgb(var(--c-zinc-300))] leading-relaxed">
              {a.status === 'done' ? (
                <span className="flex items-center gap-1.5 text-[rgb(var(--c-emerald-300))]"><Check className="w-4 h-4" /> Цель достигнута. Можно снять деньги или создать новую цель.</span>
              ) : g.deadline && a.daysLeft > 0 ? (
                <>Чтобы успеть к {niceDate(g.deadline)} (через {a.daysLeft} дн.), откладывай около <b>{money(a.needMonth)}</b> в месяц, это примерно {money(a.needMonth / 4.345)} в неделю.{a.perMonth > 0 && a.etaDate && <> При твоём темпе цель будет собрана к {niceDate(a.etaDate)}.</>}</>
              ) : g.deadline ? (
                <>Срок прошёл, не хватает {money(a.remaining)}. Можно передвинуть дату или пополнить копилку.</>
              ) : a.etaDate ? (
                <>При текущем темпе (≈ {money(a.perMonth)} в месяц) цель будет собрана примерно к <b>{niceDate(a.etaDate)}</b>, то есть через {a.etaDays} дн.</>
              ) : (
                <span className="text-[rgb(var(--c-zinc-500))]">Сделай первый взнос, и я посчитаю срок по твоему темпу.</span>
              )}
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => setAmounts({ ...amounts, [g.id]: String(toNum(amounts[g.id]) + q) })} className={`${btnSecondary} !px-2.5 !py-1 font-mono`}>+{num2(q)}</button>
                ))}
                {a.remaining > 0 && <button type="button" onClick={() => setAmounts({ ...amounts, [g.id]: String(a.remaining) })} className={`${btnSecondary} !px-2.5 !py-1`}>Всё недостающее</button>}
              </div>
              <div className="flex gap-2">
                <input type="text" inputMode="decimal" value={amounts[g.id] || ''} onChange={(e) => setAmounts({ ...amounts, [g.id]: e.target.value })} placeholder="Сумма, ₸" className={`${input} flex-1 min-w-0 font-mono`} />
                <input type="text" value={notes[g.id] || ''} onChange={(e) => setNotes({ ...notes, [g.id]: e.target.value })} placeholder="Заметка" maxLength={60} className={`${input} flex-1 min-w-0`} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => move(g, 1)} className={`${btnPrimary} flex-1`}>Положить</button>
                <button type="button" onClick={() => move(g, -1)} className={`${btnDanger} flex-1`}>Снять</button>
              </div>
              {errors[g.id] && <p role="alert" className="text-xs text-[rgb(var(--c-rose-400))]">{errors[g.id]}</p>}
            </div>

            {items.length > 0 && (
              <div className="flex flex-col gap-1 pt-2 border-t border-[rgb(var(--c-white)/0.1)]">
                {list.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-xs">
                    <span className="text-[rgb(var(--c-zinc-500))] font-mono w-20 shrink-0">{it.date}</span>
                    <span className="text-[rgb(var(--c-zinc-400))] truncate flex-1">{it.note}</span>
                    <span className={`font-mono tabular-nums ${it.amount >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'}`}>{fmt(it.amount)}</span>
                    <button type="button" onClick={() => upd(g.id, { items: items.filter((x) => x.id !== it.id) })} className={btnIcon} aria-label="Удалить операцию"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {items.length > 4 && (
                  <button type="button" onClick={() => setShowAll({ ...showAll, [g.id]: !showAll[g.id] })} className="text-[11px] text-[rgb(var(--c-zinc-400))] hover:text-[rgb(var(--c-zinc-50))] underline text-left cursor-pointer">{showAll[g.id] ? 'Свернуть' : `Показать все (${items.length})`}</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
