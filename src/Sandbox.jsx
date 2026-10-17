import React, { useState } from 'react';
import { FlaskConical, TriangleAlert } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { input, money } from './ui';

const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

// Песочница «что если?»: только расчёты, учёт не трогает
export default function Sandbox({ piggyGoal = 0, piggyTotal = 0, month = { income: 0, expense: 0 }, balance = 0 }) {
  const [sb, setSb] = useLocalStorage('selfhq_sandbox', { mode: 'save', goal: '', have: '', weekly: '', income: '', spend: '', growth: '', balance: '' });
  const [sbOpen, setSbOpen] = useState(false);
  // Если число поправили вручную, оно уже не «как есть из месяца» — предупреждение снимаем
  const setSbField = (k, v) => setSb({ ...sb, [k]: v, ...(['income', 'spend', 'balance'].includes(k) ? { fromMonth: false } : {}) });
  const sbField = (k, label, ph = '0', warn = false) => (
    <label key={k} className="flex flex-col gap-1 text-[11px] text-[rgb(var(--c-zinc-400))] font-mono">
      {label}
      <input type="text" inputMode="decimal" value={sb[k] ?? ''} onChange={(e) => setSbField(k, e.target.value)} placeholder={ph} className={`${input} font-mono ${warn ? 'ring-1 ring-[rgb(var(--c-amber-400)/0.8)]' : ''}`} />
    </label>
  );

  // Сценарий 1: за сколько накоплю
  const sbLeft = Math.max(0, num(sb.goal) - num(sb.have));
  const sbWeeks = num(sb.weekly) > 0 ? Math.ceil(sbLeft / num(sb.weekly)) : null;
  const sbDate = new Date();
  if (sbWeeks) sbDate.setDate(sbDate.getDate() + sbWeeks * 7);
  // Сценарий 2: рост дохода до конца года (текущий месяц считается)
  const monthsLeft = 12 - new Date().getMonth();
  const sbBase = num(sb.income) - num(sb.spend);
  const sbGrown = num(sb.income) * (1 + num(sb.growth) / 100) - num(sb.spend);
  const sbEndBase = num(sb.balance) + sbBase * monthsLeft;
  const sbEndGrown = num(sb.balance) + sbGrown * monthsLeft;
  const sign = (n) => (n >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]');

  return (
            <div className="p-3 bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.12)] rounded-2xl flex flex-col gap-3">
              <button type="button" onClick={() => setSbOpen(!sbOpen)} aria-expanded={sbOpen} className="flex justify-between items-center text-xs text-[rgb(var(--c-zinc-400))] font-medium uppercase cursor-pointer">
                <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-[rgb(var(--c-orange-500))]" /> Песочница «что если?»</span>
                <span className="text-base leading-none">{sbOpen ? '−' : '+'}</span>
              </button>

              {sbOpen && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[['save', 'Накопить'], ['grow', 'Рост дохода']].map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setSbField('mode', id)} className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition ${sb.mode === id ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white font-bold' : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {sb.mode === 'save' ? (
                    <>
                      <p className="text-xs text-[rgb(var(--c-zinc-400))]">Если откладывать сумму каждую неделю, когда накоплю нужное?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {sbField('goal', 'Цель, ₸')}
                        {sbField('have', 'Уже есть, ₸')}
                      </div>
                      {sbField('weekly', 'Откладываю в неделю, ₸')}
                      {(piggyGoal > 0 || piggyTotal > 0) && (
                        <button type="button" onClick={() => setSb({ ...sb, goal: piggyGoal ? String(piggyGoal) : sb.goal, have: String(piggyTotal) })} className="text-[11px] text-[rgb(var(--c-zinc-400))] hover:text-[rgb(var(--c-white))] underline text-left cursor-pointer">Взять цель и сумму из копилки</button>
                      )}
                      <div className="p-3 bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.1)] rounded-xl text-xs font-mono">
                        {num(sb.goal) <= 0 ? (
                          <span className="text-[rgb(var(--c-zinc-500))]">Введи цель и сумму в неделю.</span>
                        ) : sbLeft === 0 ? (
                          <span className="text-[rgb(var(--c-emerald-400))]">Цель уже достигнута</span>
                        ) : sbWeeks === null ? (
                          <span className="text-[rgb(var(--c-zinc-500))]">Осталось накопить {money(sbLeft)}. Введи, сколько откладываешь в неделю.</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[rgb(var(--c-zinc-400))]">Осталось накопить: <span className="text-[rgb(var(--c-red-100))]">{money(sbLeft)}</span></span>
                            <span className="text-[rgb(var(--c-amber-300))] font-bold text-sm">Через {sbWeeks} нед. (≈ {(sbWeeks / 4.345).toFixed(1)} мес.)</span>
                            <span className="text-[rgb(var(--c-zinc-400))]">Примерно к {sbDate.toLocaleDateString('ru-RU')}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-[rgb(var(--c-zinc-400))]">Если доход вырастет на Y%, сколько свободных денег будет к концу года?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {sbField('income', 'Доход в месяц, ₸', '0', sb.fromMonth)}
                        {sbField('spend', 'Расходы в месяц, ₸', '0', sb.fromMonth)}
                        {sbField('growth', 'Рост дохода, %', '10')}
                        {sbField('balance', 'Баланс сейчас, ₸', '0', sb.fromMonth)}
                      </div>
                      <button type="button" onClick={() => setSb({ ...sb, income: String(month.income), spend: String(month.expense), balance: String(balance), fromMonth: true })} className="text-[11px] text-[rgb(var(--c-zinc-400))] hover:text-[rgb(var(--c-white))] underline text-left cursor-pointer">Взять из текущего месяца (месяц может быть неполным)</button>
                      {sb.fromMonth && (
                        <p role="alert" className="flex items-start gap-1.5 text-[11px] text-[rgb(var(--c-amber-300))] bg-[rgb(var(--c-amber-400)/0.1)] border border-[rgb(var(--c-amber-400)/0.4)] rounded-lg p-2">
                          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>Внимание: месяц ещё не закончился, данные спрогнозированы или взяты как есть.</span>
                        </p>
                      )}
                      <div className={`p-3 bg-[rgb(var(--c-black)/0.6)] border rounded-xl text-xs font-mono flex flex-col gap-1.5 ${sb.fromMonth ? 'border-[rgb(var(--c-amber-400)/0.5)]' : 'border-[rgb(var(--c-white)/0.1)]'}`}>
                        <div className="flex justify-between gap-2"><span className="text-[rgb(var(--c-zinc-400))]">Свободно в месяц сейчас</span><span className={sign(sbBase)}>{money(sbBase)}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-[rgb(var(--c-zinc-400))]">После роста</span><span className={sign(sbGrown)}>{money(sbGrown)}</span></div>
                        <div className="flex justify-between gap-2 pt-1.5 border-t border-[rgb(var(--c-white)/0.1)]"><span className="text-[rgb(var(--c-zinc-400))]">К концу года без роста</span><span className={sign(sbEndBase)}>{money(sbEndBase)}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-[rgb(var(--c-zinc-400))]">К концу года с ростом</span><span className={`${sign(sbEndGrown)} font-bold`}>{money(sbEndGrown)}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-[rgb(var(--c-zinc-400))]">Разница</span><span className={sign(sbEndGrown - sbEndBase)}>{sbEndGrown - sbEndBase >= 0 ? '+' : '−'}{money(Math.abs(sbEndGrown - sbEndBase))}</span></div>
                        <span className="text-[10px] text-[rgb(var(--c-zinc-500))]">Считается {monthsLeft} мес. до конца года, включая текущий.</span>
                      </div>
                    </>
                  )}
                  <p className="text-[11px] text-[rgb(var(--c-zinc-500))]">Это только расчёт: твои данные учёта не меняются.</p>
                </>
              )}
            </div>
  );
}
