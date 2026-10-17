import React, { useState, useEffect, useRef } from 'react';
import { BookText, Trash2, Sparkles, Wallet, ImagePlus, X, Eye, EyeOff, LayoutGrid, CreditCard, PiggyBank, Flame, Lock, TriangleAlert } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { card, input, grad, fitToDataUrl, localISO, money } from './ui';
import ProfileHeader from './ProfileHeader';
import Widgets from './Widgets';
import { useTheme } from './theme';
import Space from './Space';
import AuthGate, { getSessionNick, logout } from './AuthGate';

/* ---------- константы и хелперы ---------- */
const XP_PER_LEVEL = 500;

const CATEGORIES = [
  { name: 'Еда', color: '#ef4444' },
  { name: 'Транспорт', color: '#f97316' },
  { name: 'Развлечения', color: '#eab308' },
  { name: 'Учёба', color: '#22c55e' },
  { name: 'Другое', color: '#a1a1aa' }
];

const TABS = [
  ['finance', 'Финансы', Wallet],
  ['diary', 'Дневник', BookText],
  ['space', 'Пространство', LayoutGrid]
];


const sum = (arr) => Math.round(arr.reduce((a, c) => a + c.amount, 0) * 100) / 100;
const fmt = (n) => `${n > 0 ? '+' : ''}${n} ₸`;


// На тач-экранах нет hover — кнопки удаления всегда видны, на десктопе появляются при наведении
const hoverShow = 'md:opacity-0 md:group-hover:opacity-100';

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[100dvh] grid place-items-center p-4 bg-[rgb(var(--c-page))] text-[rgb(var(--c-red-50))]">
        <div className="max-w-md bg-[rgb(var(--c-zinc-950))] border border-[rgb(var(--c-red-500)/0.5)] rounded-2xl p-5 text-sm">
          <p className="font-bold text-[rgb(var(--c-rose-400))] mb-2">Что-то пошло не так</p>
          <pre className="whitespace-pre-wrap break-words text-xs text-[rgb(var(--c-zinc-300))]">{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-xl bg-[rgb(var(--c-red-600))] text-white cursor-pointer">Перезагрузить</button>
        </div>
      </div>
    );
  }
}

// Вход по нику и паролю оборачивает всё приложение
export default function App() {
  return (
    <ErrorBoundary>
      <AuthGate>
        <AppInner />
      </AuthGate>
    </ErrorBoundary>
  );
}

function AppInner() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const TAB_IDS = TABS.map((t) => t[0]);
  // #finance / #diary / #space — открывается из быстрых действий иконки на домашнем экране
  const [activeTab, setActiveTab] = useState(() => {
    const h = window.location.hash.slice(1);
    return TAB_IDS.includes(h) ? h : ['notes', 'wardrobe', 'media'].includes(h) ? 'space' : 'finance';
  });
  const [lightbox, setLightbox] = useState(null);
  const [theme, setTheme, toggleTheme] = useTheme();

  // PWA: манифест + service worker (оффлайн-режим)
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = `${baseUrl}manifest.webmanifest`;
      document.head.appendChild(link);
    }
    if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register(`${baseUrl}sw.js`).catch(() => {});
  }, [baseUrl]);

  // Горячие клавиши: 1–3 — вкладки, T — тема, Esc — закрыть фото. В полях ввода не срабатывают
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      const t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.code === 'KeyT') {
        toggleTheme();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= TAB_IDS.length) setActiveTab(TAB_IDS[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- аватар, баннер и подпись (редактируются на сайте) ---------- */
  const [avatar, setAvatar] = useLocalStorage('selfhq_avatar', '');
  const [banner, setBanner] = useLocalStorage('selfhq_banner', '');
  const [tagline, setTagline] = useLocalStorage('selfhq_tagline', 'Личный штаб');

  // Фото обрезается до квадрата 256×256 и сжимается, чтобы поместиться в localStorage
  const onAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const side = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
      setAvatar(c.toDataURL('image/jpeg', 0.85));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Не удалось открыть картинку');
    };
    img.src = url;
  };

  /* ---------- XP / уровень ---------- */
  const [xp, setXp] = useLocalStorage('selfhq_xp', 240);
  const [level, setLevel] = useLocalStorage('selfhq_level', 3);

  const gainXp = (reward) => {
    let x = xp + reward;
    let l = level;
    while (x >= XP_PER_LEVEL) {
      x -= XP_PER_LEVEL;
      l += 1;
    }
    setXp(x);
    setLevel(l);
  };


  /* ---------- дневник ---------- */
  const [diaryEntries, setDiaryEntries] = useLocalStorage('selfhq_diary', []);
  const [newDiaryText, setNewDiaryText] = useState('');
  const [diarySearch, setDiarySearch] = useState('');
  const shownEntries = diaryEntries.filter((e) => e.text.toLowerCase().includes(diarySearch.trim().toLowerCase()));

  const [newDiaryImgs, setNewDiaryImgs] = useState([]);
  const addDiaryFiles = async (files) => {
    const imgs = [];
    for (const f of Array.from(files || [])) {
      if (!f.type.startsWith('image/')) continue;
      try {
        imgs.push(await fitToDataUrl(f));
      } catch {
        /* битый файл пропускаем */
      }
    }
    if (imgs.length) setNewDiaryImgs((p) => [...p, ...imgs].slice(0, 6));
  };

  const addDiaryEntry = (e) => {
    e.preventDefault();
    if (!newDiaryText.trim() && !newDiaryImgs.length) return;
    const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    try {
      setDiaryEntries([{ id: Date.now(), date, text: newDiaryText, images: newDiaryImgs }, ...diaryEntries]);
      setNewDiaryText('');
      setNewDiaryImgs([]);
    } catch {
      alert('Не хватает места в браузере: сделай резервную копию и удали старые фото');
    }
  };

  /* ---------- финансы ---------- */
  const [financeData, setFinanceData] = useLocalStorage('selfhq_finance', { expenses: [] });
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState('expense'); // на iOS в поле number нет минуса — выбираем тип кнопкой
  const [category, setCategory] = useState('Еда');
  const [moneyNote, setMoneyNote] = useState('');
  const [moneyPhoto, setMoneyPhoto] = useState('');
  const [selectedDate, setSelectedDate] = useState(localISO());
  const [activeReport, setActiveReport] = useState('none');
  const [showBalance, setShowBalance] = useState(false); // баланс скрыт, пока не нажмёшь

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
  const reportButtons = [['week', 'За неделю'], ['month', 'За месяц'], ['year', 'За год'], ['day', 'По дням']];

  /* ---------- лимит, копилка ---------- */
  const [limit, setLimit] = useLocalStorage('selfhq_limit', 0);
  const [piggy, setPiggy] = useLocalStorage('selfhq_piggy', { goalName: '', goal: 0, items: [] });
  const [piggyAmount, setPiggyAmount] = useState('');

  const monthExpenses = all.filter((i) => i.amount < 0 && i.date && i.date.startsWith(ym));
  const monthSpent = Math.abs(sum(monthExpenses));
  const limitPct = limit > 0 ? (monthSpent / limit) * 100 : 0;
  const limitColor = limitPct >= 100 ? 'bg-[rgb(var(--c-rose-500))]' : limitPct >= 80 ? 'bg-[rgb(var(--c-amber-400))]' : 'bg-[rgb(var(--c-emerald-500))]';

  const catSpent = CATEGORIES.map((c) => ({ ...c, value: Math.abs(sum(monthExpenses.filter((i) => (i.category || 'Другое') === c.name))) })).filter((c) => c.value > 0);
  const catTotal = catSpent.reduce((a, c) => a + c.value, 0);
  let acc = 0;
  const pie = catSpent.map((c) => { const from = acc; acc += (c.value / catTotal) * 100; return `${c.color} ${from}% ${acc}%`; }).join(', ');

  const piggyTotal = sum(piggy.items);
  const piggyPct = piggy.goal > 0 ? Math.min(100, (piggyTotal / piggy.goal) * 100) : 0;
  const piggyMove = (sign) => {
    const val = Math.abs(parseFloat(piggyAmount.replace(',', '.')));
    if (!Number.isFinite(val) || val === 0) return;
    if (sign < 0 && val > piggyTotal) return alert('В копилке нет столько денег');
    setPiggy({ ...piggy, items: [{ id: Date.now(), amount: sign * val, date: localISO() }, ...piggy.items] });
    setPiggyAmount('');
  };

  /* ---------- огоньки: день в рамках дневного лимита; месяц в рамках лимита = сразу все огоньки месяца ---------- */
  // Дневной лимит = месячный лимит ÷ число дней в месяце. Дни засчитываются при открытии сайта на следующий день.
  const STREAK_XP = 50;
  const [streakData, setStreakData] = useLocalStorage('selfhq_streak', { last: '', streak: 0, best: 0, flames: 0, since: '', monthsDone: '', history: [] });
  const daysIn = (iso) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0).getDate();
  const shiftDay = (iso, n) => localISO(new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + n));
  const shiftMonth = (m, n) => {
    const d = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const spentOn = (iso) => Math.abs(sum(all.filter((i) => i.amount < 0 && i.date === iso)));
  const allowanceOn = (iso) => (limit > 0 ? limit / daysIn(iso) : 0);
  const todayISO = localISO();
  const streakRan = useRef(false);
  const spentToday = spentOn(todayISO);
  const allowToday = allowanceOn(todayISO);

  // Клетки текущего месяца: ok — огонёк горит, over — вышел за рамки, today-* — сегодня, idle — не считается
  const dimNow = daysIn(todayISO);
  const trackFrom = streakData.since || (streakData.last ? shiftDay(streakData.last, 1) : todayISO);
  const dayCells = Array.from({ length: dimNow }, (_, i) => {
    const iso = `${ym}-${String(i + 1).padStart(2, '0')}`;
    let state = 'idle';
    if (limit > 0) {
      if (iso === todayISO) state = spentToday <= allowToday ? 'today-ok' : 'today-over';
      else if (iso < todayISO && iso >= trackFrom) state = spentOn(iso) <= allowanceOn(iso) ? 'ok' : 'over';
    }
    return { iso, day: i + 1, state };
  });
  const monthLit = dayCells.filter((c) => c.state === 'ok').length;
  const lastMonth = (streakData.history || []).slice(-1)[0];

  useEffect(() => {
    if (streakRan.current) return;
    streakRan.current = true;
    const yesterday = shiftDay(todayISO, -1);
    const prevYM = shiftMonth(todayISO.slice(0, 7), -1);
    const d = { last: '', streak: 0, best: 0, flames: 0, since: '', monthsDone: '', history: [], ...streakData };
    let reward = 0;
    let changed = false;
    if (!d.last) {
      Object.assign(d, { last: yesterday, since: todayISO, monthsDone: prevYM }); // отсчёт начинается с сегодняшнего дня
      changed = true;
    } else {
      if (!d.since) { d.since = shiftDay(d.last, 1); changed = true; }
      if (!d.monthsDone) { d.monthsDone = prevYM; changed = true; }
      if (limit > 0 && d.last < yesterday) {
        let from = shiftDay(d.last, 1);
        const floor = shiftDay(yesterday, -6); // догоняем максимум за последние 7 дней
        if (from < floor) from = floor;
        for (let day = from; day <= yesterday; day = shiftDay(day, 1)) {
          if (spentOn(day) <= allowanceOn(day)) {
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
      for (let m = shiftMonth(d.monthsDone, 1), guard = 0; m <= prevYM && guard < 12; m = shiftMonth(m, 1), guard += 1) {
        const items = all.filter((i) => i.date && i.date.startsWith(m));
        const spent = Math.abs(sum(items.filter((i) => i.amount < 0)));
        const days = daysIn(`${m}-01`);
        const ok = limit > 0 && items.length > 0 && spent <= limit;
        if (ok) d.flames += days;
        d.history = [...d.history, { ym: m, ok, days }].slice(-12);
        changed = true;
      }
      if (d.monthsDone !== prevYM) { d.monthsDone = prevYM; changed = true; }
    }
    if (changed) setStreakData(d);
    if (reward) gainXp(reward);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- разметка ---------- */
  return (
    <div className="min-h-[100dvh] text-[rgb(var(--c-red-50))] p-3 sm:p-6 pb-28 md:pb-6 font-sans relative overflow-x-hidden bg-[rgb(var(--c-page))]">
      {/* Фон: fixed + cover — на телефоне нет чёрных полос и дёрганья при скролле */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${baseUrl}bg.jpg')`, opacity: theme.mode === 'light' ? 0.14 : 1 }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,rgb(var(--c-grid))_1px,transparent_1px),linear-gradient(to_bottom,rgb(var(--c-grid))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Шапка профиля с баннером */}
      <ProfileHeader
        nick={getSessionNick()}
        tagline={tagline}
        setTagline={setTagline}
        avatar={avatar}
        setAvatar={setAvatar}
        onAvatar={onAvatar}
        defaultAvatar={`${baseUrl}avatar.jpg`}
        banner={banner}
        setBanner={setBanner}
        theme={theme}
        onTheme={setTheme}
        level={level}
        xp={xp}
        xpMax={XP_PER_LEVEL}
        onLogout={logout}
      />

      {/* Навигация: снизу на телефоне (под большой палец), под шапкой на десктопе.
          Вынесена из header, т.к. backdrop-blur ломает position:fixed у потомков */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[rgb(var(--c-black)/0.9)] backdrop-blur-md border-t border-[rgb(var(--c-white)/0.18)] md:static md:max-w-6xl md:mx-auto md:mb-6 md:p-1.5 md:pb-1.5 md:bg-[rgb(var(--c-black)/0.6)] md:border md:rounded-xl">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 rounded-lg text-[11px] md:text-sm font-medium transition cursor-pointer ${
              activeTab === id ? `${grad}` : 'text-[rgb(var(--c-red-300)/0.7)] hover:text-[rgb(var(--c-white))]'
            }`}
          >
            <Icon className="w-5 h-5 md:w-4 md:h-4" /> {label}
          </button>
        ))}
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto">
        {/* ДНЕВНИК */}
        {activeTab === 'diary' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <div className={`${card} p-3 sm:p-5 h-fit`}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[rgb(var(--c-white))]">
                <BookText className="w-6 h-6 text-[rgb(var(--c-orange-500))]" /> Новая запись
              </h2>
              <form onSubmit={addDiaryEntry} className="space-y-4">
                <textarea
                  value={newDiaryText}
                  onChange={(e) => setNewDiaryText(e.target.value)}
                  placeholder="Мысли, итоги дня, планы..."
                  rows={6}
                  onPaste={(e) => {
                    const fs = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
                    if (fs.length) {
                      e.preventDefault();
                      addDiaryFiles(fs);
                    }
                  }}
                  className={`${input} w-full p-4 resize-none`}
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--c-red-200))] bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.18)] hover:border-[rgb(var(--c-white)/0.6)] rounded-lg px-3 py-2 cursor-pointer">
                    <ImagePlus className="w-4 h-4" /> Фото
                    <input type="file" accept="image/*" multiple onChange={(e) => { addDiaryFiles(e.target.files); e.target.value = ''; }} className="hidden" />
                  </label>
                  {newDiaryImgs.map((src, i) => (
                    <div key={i} className="relative w-14 h-14">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-[rgb(var(--c-white)/0.18)]" />
                      <button type="button" onClick={() => setNewDiaryImgs(newDiaryImgs.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-[rgb(var(--c-red-600))] text-white cursor-pointer" aria-label="Убрать фото"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <span className="text-[11px] text-[rgb(var(--c-zinc-500))] w-full">Скриншот можно вставить через Ctrl+V прямо в поле. До 6 фото.</span>
                </div>
                <button type="submit" className={`w-full py-2.5 ${grad} rounded-xl text-sm hover:opacity-90 transition cursor-pointer`}>Сохранить запись</button>
              </form>
            </div>

            <div className={`lg:col-span-2 ${card} p-3 sm:p-5 lg:min-h-[500px]`}>
              <h2 className="text-lg sm:text-xl font-semibold mb-6 text-[rgb(var(--c-white))] flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[rgb(var(--c-orange-500))]" /> Личный архив мыслей
              </h2>
              {diaryEntries.length > 0 && (
                <input type="search" value={diarySearch} onChange={(e) => setDiarySearch(e.target.value)} placeholder="Поиск по записям" className={`${input} w-full mb-5`} />
              )}
              {diaryEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-[rgb(var(--c-white)/0.12)] rounded-2xl p-6">
                  <BookText className="w-12 h-12 text-[rgb(var(--c-zinc-700))] mb-3" />
                  <p className="text-sm text-[rgb(var(--c-zinc-500))] font-medium">Дневник пока пуст.</p>
                  <p className="text-xs text-[rgb(var(--c-zinc-600))] mt-1">Напишите первую запись.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {shownEntries.length === 0 && <p className="text-sm text-[rgb(var(--c-zinc-500))] italic text-center py-6">Ничего не найдено.</p>}
                  {shownEntries.map((entry) => (
                    <div key={entry.id} className="p-3 sm:p-5 bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.18)] rounded-2xl relative group hover:border-[rgb(var(--c-red-500))] transition shadow-lg">
                      <span className="text-xs text-[rgb(var(--c-orange-400))] font-mono mb-2 block pr-10">{entry.date}</span>
                      {entry.text && <p className="text-base text-[rgb(var(--c-red-50))] whitespace-pre-wrap break-words leading-relaxed">{entry.text}</p>}
                      {entry.images?.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                          {entry.images.map((src, i) => (
                            <button key={i} type="button" onClick={() => setLightbox(src)} className="cursor-zoom-in">
                              <img src={src} alt="Фото к записи" className="w-full h-28 sm:h-32 object-cover rounded-lg border border-[rgb(var(--c-white)/0.12)] hover:border-[rgb(var(--c-red-500))] transition" />
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => window.confirm('Удалить запись?') && setDiaryEntries(diaryEntries.filter((i) => i.id !== entry.id))}
                        className={`${hoverShow} absolute top-3 right-3 p-2 text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] transition cursor-pointer`}
                        aria-label="Удалить запись"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ФИНАНСЫ */}
        {activeTab === 'finance' && (
          <>
          <div className="max-w-xl mx-auto mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-[rgb(var(--c-emerald-500)/0.3)] bg-[rgb(var(--c-emerald-950)/0.2)] text-[11px] text-[rgb(var(--c-emerald-100)/0.9)]">
            <Lock className="w-3.5 h-3.5 shrink-0 text-[rgb(var(--c-emerald-400))]" />
            <span>Данные хранятся только на этом устройстве. Никаких серверов. Копию можно сделать в «Пространство → Заметки».</span>
          </div>
          <div className={`max-w-xl mx-auto ${card} p-3 sm:p-5 flex flex-col gap-3`}>
            <Widgets
              storageKey="selfhq_order_finance"
              className="flex flex-col gap-3"
              header={<h2 className="flex items-center gap-2 text-xl font-semibold text-[rgb(var(--c-white))]"><CreditCard className="w-5 h-5 text-[rgb(var(--c-orange-500))]" /> Финансы</h2>}
              items={[
                { id: 'balance', title: 'Баланс', node: (
            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              aria-pressed={showBalance}
              className="w-full p-4 bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.12)] hover:border-[rgb(var(--c-white)/0.25)] rounded-2xl flex flex-col items-center justify-center text-center shadow-inner cursor-pointer transition"
            >
              <span className="text-xs text-[rgb(var(--c-zinc-400))] uppercase font-medium tracking-wider mb-1.5 flex items-center justify-center gap-1.5">
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Общий баланс
              </span>
              <span className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight transition ${total >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'} ${showBalance ? '' : 'blur-md select-none'}`}>{fmt(total)}</span>
              {!showBalance && <span className="text-[11px] text-[rgb(var(--c-zinc-500))] mt-1">Нажми, чтобы показать</span>}
            </button>
) },
                { id: 'limit', title: 'Лимит и огоньки', node: (
            <div className="p-3 bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.2)] rounded-2xl flex flex-col gap-2.5">
              <div className="flex justify-between items-center gap-3">
                <span className="text-[11px] text-[rgb(var(--c-zinc-400))] uppercase font-medium tracking-wide">Лимит на месяц</span>
                <input type="number" inputMode="numeric" value={limit || ''} onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))} placeholder="нет" className={`${input} w-28 py-1.5 text-right font-mono`} />
              </div>
              {limit > 0 && (
                <>
                  <div className="h-2 bg-[rgb(var(--c-zinc-900))] rounded-full overflow-hidden border border-[rgb(var(--c-white)/0.2)]"><div className={`${limitColor} h-full transition-all`} style={{ width: `${Math.min(100, limitPct)}%` }} /></div>
                  <p className={`text-xs ${limitPct >= 100 ? 'text-[rgb(var(--c-rose-400))]' : limitPct >= 80 ? 'text-[rgb(var(--c-amber-300))]' : 'text-[rgb(var(--c-zinc-400))]'}`}>
                    {limitPct >= 100 ? `Лимит превышен на ${Math.round(monthSpent - limit)} ₸` : limitPct >= 80 ? `Потрачено ${Math.round(limitPct)}% лимита, осталось ${Math.round(limit - monthSpent)} ₸` : `Потрачено ${monthSpent} из ${limit} ₸`}
                  </p>
                </>
              )}
              <div className="pt-2.5 border-t border-[rgb(var(--c-white)/0.1)] flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--c-zinc-400))] uppercase font-medium tracking-wide"><Flame className="w-3.5 h-3.5 text-[rgb(var(--c-orange-500))]" /> Огоньки</span>
                  <span className="text-xs font-mono text-[rgb(var(--c-zinc-300))]">{monthLit}/{dimNow} <span className="text-[rgb(var(--c-zinc-500))]">· всего {streakData.flames || 0}</span></span>
                </div>
                {limit > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1" role="img" aria-label={`Огоньки месяца: ${monthLit} из ${dimNow}`}>
                      {dayCells.map((c) => (
                        <span key={c.iso} title={`${c.day}`} className={`w-5 h-5 grid place-items-center rounded-md ${c.state.startsWith('today') ? 'ring-1 ring-[rgb(var(--c-orange-500)/0.7)]' : ''}`}>
                          {c.state === 'ok' ? <Flame className="w-4 h-4 text-[rgb(var(--c-orange-400))] fill-[rgb(var(--c-orange-500))]" /> : c.state === 'today-ok' ? <Flame className="w-4 h-4 text-[rgb(var(--c-orange-400)/0.7)]" /> : c.state === 'over' || c.state === 'today-over' ? <X className="w-3 h-3 text-[rgb(var(--c-rose-400)/0.7)]" /> : <span className="w-1 h-1 rounded-full bg-[rgb(var(--c-white)/0.2)]" />}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[rgb(var(--c-zinc-300))]">
                      Сегодня {money(spentToday)} из {money(allowToday)}{' '}
                      <span className={spentToday <= allowToday ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'}>{spentToday <= allowToday ? '· в рамках' : '· вышел за рамки'}</span>
                    </p>
                    <p className="text-[11px] text-[rgb(var(--c-zinc-500))]">
                      День в рамках дневного лимита даёт огонёк и +{STREAK_XP} XP. Серия {streakData.streak} дн., рекорд {streakData.best}. Если месяц закончится в пределах лимита, огоньки за все его дни добавятся сразу (сейчас {dimNow}).
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
) },
                { id: 'categories', title: 'Траты по категориям', node: catSpent.length > 0 && (
              <div className="p-5 bg-[rgb(var(--c-black)/0.75)] border border-[rgb(var(--c-white)/0.15)] rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-5 shadow-xl">
                <div className="relative w-28 h-28 shrink-0 rounded-full border-4 border-[rgb(var(--c-white)/0.1)] shadow-inner overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0" style={{ background: `conic-gradient(${pie})` }} role="img" aria-label="Расходы по категориям за месяц" />
                  <div className="absolute inset-4 bg-[rgb(var(--c-zinc-950))] rounded-full flex flex-col items-center justify-center text-center shadow-md">
                    <span className="text-[10px] uppercase tracking-wider text-[rgb(var(--c-zinc-400))] font-semibold">Всего</span>
                    <span className="text-xs font-bold font-mono text-[rgb(var(--c-white))]">{catTotal} ₸</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0 w-full flex-1">
                  <span className="text-[rgb(var(--c-zinc-400))] font-semibold uppercase tracking-wider mb-1">Траты за месяц</span>
                  {catSpent.map((c) => {
                    const pct = Math.round((c.value / catTotal) * 100);
                    return (
                      <div key={c.name} className="flex items-center gap-2 text-[rgb(var(--c-red-100))]">
                        <i className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: c.color }} />
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="font-mono text-[rgb(var(--c-zinc-300))] ml-auto">{c.value} ₸</span>
                        <span className="font-mono text-[rgb(var(--c-zinc-500))] w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) },
                { id: 'piggy', title: 'Копилка', node: (
            <div className="p-5 bg-[rgb(var(--c-black)/0.75)] border border-[rgb(var(--c-white)/0.15)] rounded-2xl flex flex-col gap-3.5 shadow-xl">
              <div className="flex flex-col items-center justify-center text-center pb-2 border-b border-[rgb(var(--c-white)/0.1)]">
                <span className="flex items-center gap-1.5 text-xs text-[rgb(var(--c-zinc-400))] uppercase font-semibold tracking-wider mb-1">
                  <PiggyBank className="w-4 h-4 text-[rgb(var(--c-orange-500))]" /> Копилка
                </span>
                <span className="font-mono text-2xl sm:text-3xl font-bold text-[rgb(var(--c-amber-300))] tracking-tight">{piggyTotal} ₸</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={piggy.goalName} onChange={(e) => setPiggy({ ...piggy, goalName: e.target.value })} placeholder="Цель (ноутбук)" className={`${input} flex-1 min-w-0`} />
                <input type="number" inputMode="numeric" value={piggy.goal || ''} onChange={(e) => setPiggy({ ...piggy, goal: Math.max(0, Number(e.target.value) || 0) })} placeholder="Сумма" className={`${input} w-28 font-mono`} />
              </div>
              {piggy.goal > 0 && (
                <div>
                  <div className="h-2.5 bg-[rgb(var(--c-zinc-900))] rounded-full overflow-hidden border border-[rgb(var(--c-white)/0.12)]"><div className="bg-gradient-to-r from-[rgb(var(--c-amber-500))] to-[rgb(var(--c-emerald-400))] h-full transition-all" style={{ width: `${piggyPct}%` }} /></div>
                  <p className="text-xs text-[rgb(var(--c-zinc-400))] mt-1">{piggy.goalName || 'Цель'}: {Math.round(piggyPct)}% · {piggyTotal >= piggy.goal ? 'цель достигнута' : `осталось ${piggy.goal - piggyTotal} ₸`}</p>
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); piggyMove(1); }} className="flex gap-2">
                <input type="text" inputMode="decimal" value={piggyAmount} onChange={(e) => setPiggyAmount(e.target.value)} placeholder="Сумма, ₸" className={`${input} flex-1 min-w-0 font-mono`} />
                <button type="submit" className="px-3 bg-[rgb(var(--c-emerald-600))] text-white rounded-xl text-sm font-medium cursor-pointer">Положить</button>
                <button type="button" onClick={() => piggyMove(-1)} className="px-3 bg-[rgb(var(--c-rose-600))] text-white rounded-xl text-sm font-medium cursor-pointer">Снять</button>
              </form>
              {piggy.items.slice(0, 5).map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[rgb(var(--c-zinc-500))]">{it.date}</span>
                  <span className={it.amount >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'}>{fmt(it.amount)}</span>
                  <button onClick={() => setPiggy({ ...piggy, items: piggy.items.filter((x) => x.id !== it.id) })} className="p-1 text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] cursor-pointer" aria-label="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
) },
                { id: 'reports', title: 'Выписки', node: (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-[rgb(var(--c-zinc-400))] font-medium uppercase">Выписки:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {reportButtons.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveReport(activeReport === id ? 'none' : id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${activeReport === id ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white font-bold' : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-red-200))] hover:border-[rgb(var(--c-white)/0.5)]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeReport !== 'none' && (
                <div className="p-3 bg-[rgb(var(--c-black)/0.8)] border border-[rgb(var(--c-red-500)/0.4)] rounded-xl flex flex-col gap-2 font-mono">
                  <span className="text-xs text-[rgb(var(--c-zinc-300))]">{reportLabels[activeReport]}</span>
                  {(activeReport === 'month' || activeReport === 'year') && (
                    <p role="alert" className="flex items-start gap-1.5 text-[11px] text-[rgb(var(--c-amber-300))] bg-[rgb(var(--c-amber-400)/0.1)] border border-[rgb(var(--c-amber-400)/0.4)] rounded-lg p-2 font-sans">
                      <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>Внимание: {activeReport === 'month' ? 'месяц' : 'год'} ещё не закончился, данные взяты как есть.</span>
                    </p>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-[rgb(var(--c-zinc-400))]">Поднял (доход)</span><span className="text-[rgb(var(--c-emerald-400))] font-bold">+{totals[activeReport].income} ₸</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[rgb(var(--c-zinc-400))]">Потратил</span><span className="text-[rgb(var(--c-rose-400))] font-bold">−{totals[activeReport].expense} ₸</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t border-[rgb(var(--c-white)/0.1)]">
                    <span className="text-[rgb(var(--c-zinc-300))]">Итого</span>
                    <span className={`font-bold ${totals[activeReport].net >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'}`}>{fmt(totals[activeReport].net)}</span>
                  </div>
                  {activeReport !== 'day' && periodItems[activeReport].length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[rgb(var(--c-white)/0.1)] flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      <span className="text-[10px] text-[rgb(var(--c-orange-400))] uppercase tracking-wider">По дням</span>
                      {byDay(periodItems[activeReport]).map((d) => (
                        <div key={d.date} className="flex justify-between gap-2 text-[11px]">
                          <span className="text-[rgb(var(--c-zinc-400))]">{d.date}</span>
                          <span className="text-[rgb(var(--c-emerald-400))]">{d.income ? `+${r2(d.income)}` : '·'}</span>
                          <span className="text-[rgb(var(--c-rose-400))]">{d.expense ? `−${r2(d.expense)}` : '·'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {activeReport === 'day' && (
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={`${input} font-mono`} />
              )}
            </div>
) },
                { id: 'add', title: 'Новая запись', node: (
            <form onSubmit={addMoney} className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {[['expense', 'Расход'], ['income', 'Доход']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKind(id)}
                    className={`py-2 rounded-xl border text-sm font-medium cursor-pointer transition ${kind === id ? (id === 'expense' ? 'bg-[rgb(var(--c-rose-600))] border-[rgb(var(--c-rose-500))] text-white' : 'bg-[rgb(var(--c-emerald-600))] border-[rgb(var(--c-emerald-500))] text-white') : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-zinc-300))]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {kind === 'expense' && (
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${input} cursor-pointer`}>
                  {CATEGORIES.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
                </select>
              )}
              <div className="flex gap-2">
                <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма, ₸" className={`${input} flex-1 min-w-0 font-mono`} />
                <button type="submit" className={`px-5 py-2 ${grad} rounded-xl text-sm hover:opacity-90 cursor-pointer whitespace-nowrap`}>Записать</button>
              </div>
              <input type="text" value={moneyNote} onChange={(e) => setMoneyNote(e.target.value)} maxLength={120} placeholder="Заметка к записи (гарантия до…, магазин, зачем)" className={input} />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-[rgb(var(--c-red-200))] bg-[rgb(var(--c-black)/0.6)] border border-[rgb(var(--c-white)/0.18)] hover:border-[rgb(var(--c-white)/0.6)] rounded-lg px-3 py-2 cursor-pointer">
                  <ImagePlus className="w-4 h-4" /> Чек или фото покупки
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
                  <div className="relative w-12 h-12">
                    <img src={moneyPhoto} alt="" className="w-full h-full object-cover rounded-lg border border-[rgb(var(--c-white)/0.18)]" />
                    <button type="button" onClick={() => setMoneyPhoto('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-[rgb(var(--c-red-600))] text-white cursor-pointer" aria-label="Убрать фото"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-[rgb(var(--c-zinc-500))]">Дата записи: {selectedDate} (меняется в разделе «По дням»)</p>
            </form>
) },
                { id: 'ops', title: 'Все операции', node: (
            <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              <div className="text-xs text-[rgb(var(--c-orange-400))] font-medium uppercase tracking-wider">Все операции:</div>
              {all.length === 0 ? (
                <p className="text-xs text-[rgb(var(--c-zinc-500))] italic text-center py-4">Операций пока нет.</p>
              ) : (
                all.map((item) => (
                  <div key={item.id} className="p-3 bg-[rgb(var(--c-black)/0.5)] border border-[rgb(var(--c-white)/0.12)] rounded-xl flex justify-between items-center">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`font-mono font-semibold text-sm ${item.amount >= 0 ? 'text-[rgb(var(--c-emerald-400))]' : 'text-[rgb(var(--c-rose-400))]'}`}>{fmt(item.amount)}</span>
                      <span className="text-[11px] text-[rgb(var(--c-zinc-500))] font-mono">{item.date || 'Без даты'}{item.category ? ` · ${item.category}` : ''}</span>
                      {item.note && <span className="text-xs text-[rgb(var(--c-zinc-300))] break-words mt-0.5">{item.note}</span>}
                    </div>
                    {item.photo && (
                      <button type="button" onClick={() => setLightbox(item.photo)} className="shrink-0 mr-1 cursor-zoom-in" aria-label="Открыть фото">
                        <img src={item.photo} alt="Чек или покупка" className="w-10 h-10 object-cover rounded-lg border border-[rgb(var(--c-white)/0.12)]" />
                      </button>
                    )}
                    <button onClick={() => deleteMoney(item.id)} className="text-[rgb(var(--c-zinc-500))] hover:text-[rgb(var(--c-red-500))] transition cursor-pointer p-2" aria-label="Удалить операцию">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
) },
              ]}
            />
          </div>
          </>
        )}
        {activeTab === 'space' && <Space piggyGoal={piggy.goal} piggyTotal={piggyTotal} month={totals.month} balance={total} />}
      </main>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Фото" className="max-w-full max-h-full rounded-xl border border-[rgb(var(--c-white)/0.18)] shadow-2xl" />
        </div>
      )}
    </div>
  );
}
