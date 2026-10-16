import React, { useState, useEffect } from 'react';
import { BookOpen, BookText, Trash2, ChevronRight, Sparkles, Wallet, ImagePlus, X, StickyNote, Eye, EyeOff } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import ProfileHeader from './ProfileHeader';
import AuthGate, { getSessionNick, logout } from './AuthGate';

/* ---------- константы и хелперы ---------- */
const XP_PER_LEVEL = 500;
// Ключи, которые не должны попадать в резервную копию (пароли и сессия)
const PRIVATE_KEYS = ['selfhq_accounts', 'selfhq_session'];

const LINKS = [
  ['GitHub', 'https://github.com'],
  ['Figma', 'https://figma.com'],
  ['Stitch', 'https://stitch.withgoogle.com'],
  ['akspic', 'https://akspic.ru/'],
  ['TypingClub', 'https://www.typingclub.com/'],
  ['Whatsapp', 'https://web.whatsapp.com/'],
  ['kinogo', 'https://tv.kinogo.mu/'],
  ['YouTube', 'https://www.youtube.com/']
];

const CATEGORIES = [
  { name: 'Еда', color: '#ef4444' },
  { name: 'Транспорт', color: '#f97316' },
  { name: 'Развлечения', color: '#eab308' },
  { name: 'Учёба', color: '#22c55e' },
  { name: 'Другое', color: '#a1a1aa' }
];

const TABS = [
  ['notes', 'Заметки', StickyNote],
  ['diary', 'Дневник', BookText],
  ['finance', 'Финансы', Wallet]
];

const pad = (n) => String(n).padStart(2, '0');
// Локальная дата (а не UTC, как у toISOString) — иначе ночью в Казахстане дата «вчера»
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const sum = (arr) => Math.round(arr.reduce((a, c) => a + c.amount, 0) * 100) / 100;
const fmt = (n) => `${n > 0 ? '+' : ''}${n} ₸`;

// Фото для дневника: вписываем в max×max и сжимаем, чтобы влезло в localStorage
const fitToDataUrl = (file, max = 900, q = 0.72) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('load'));
    };
    img.src = url;
  });

// text-base на мобильных: при шрифте < 16px iOS зумит страницу при фокусе на поле
const card = 'bg-zinc-950/90 backdrop-blur-md border border-white/30 rounded-2xl shadow-xl';
const input = 'bg-black/70 border border-white/30 rounded-xl px-3 py-2.5 text-base md:text-sm text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500';
const grad = 'bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold';
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
      <div className="min-h-[100dvh] grid place-items-center p-4 bg-[#020202] text-red-50">
        <div className="max-w-md bg-zinc-950 border border-red-500/50 rounded-2xl p-5 text-sm">
          <p className="font-bold text-red-400 mb-2">Что-то пошло не так</p>
          <pre className="whitespace-pre-wrap break-words text-xs text-zinc-300">{String(this.state.error?.message || this.state.error)}</pre>
          <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white cursor-pointer">Перезагрузить</button>
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
  // #notes / #diary / #finance — открывается из быстрых действий иконки на домашнем экране
  const [activeTab, setActiveTab] = useState(() => {
    const h = window.location.hash.slice(1);
    return TAB_IDS.includes(h) ? h : 'notes';
  });
  const [lightbox, setLightbox] = useState(null);

  // PWA: манифест + service worker (оффлайн-режим)
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = `${baseUrl}manifest.webmanifest`;
      document.head.appendChild(link);
    }
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(`${baseUrl}sw.js`).catch(() => {});
  }, [baseUrl]);

  // Горячие клавиши: 1–3 — вкладки, Esc — закрыть фото. В полях ввода не срабатывают
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      const t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
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
    a.click();
    URL.revokeObjectURL(a.href);
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
    setFinanceData({
      ...financeData,
      expenses: [{ id: Date.now(), amount: signed, date: selectedDate, category: kind === 'expense' ? category : null }, ...(financeData.expenses || [])]
    });
    setAmount('');
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
  const limitColor = limitPct >= 100 ? 'bg-red-500' : limitPct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';

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

  /* ---------- песочница «что если?» (только расчёты, учёт не трогает) ---------- */
  const [sb, setSb] = useLocalStorage('selfhq_sandbox', { mode: 'save', goal: '', have: '', weekly: '', income: '', spend: '', growth: '', balance: '' });
  const [sbOpen, setSbOpen] = useState(false);
  const num = (v) => {
    const n = parseFloat(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;
  // Если число поправили вручную, оно уже не «как есть из месяца» — предупреждение снимаем
  const setSbField = (k, v) => setSb({ ...sb, [k]: v, ...(['income', 'spend', 'balance'].includes(k) ? { fromMonth: false } : {}) });
  const sbField = (k, label, ph = '0', warn = false) => (
    <label key={k} className="flex flex-col gap-1 text-[11px] text-zinc-400 font-mono">
      {label}
      <input type="text" inputMode="decimal" value={sb[k] ?? ''} onChange={(e) => setSbField(k, e.target.value)} placeholder={ph} className={`${input} font-mono ${warn ? 'ring-1 ring-amber-400/80' : ''}`} />
    </label>
  );

  // Сценарий 1: за сколько накоплю
  const sbLeft = Math.max(0, num(sb.goal) - num(sb.have));
  const sbWeeks = num(sb.weekly) > 0 ? Math.ceil(sbLeft / num(sb.weekly)) : null;
  const sbDate = new Date();
  if (sbWeeks) sbDate.setDate(sbDate.getDate() + sbWeeks * 7);
  // Сценарий 2: рост дохода до конца года (текущий месяц считается)
  const monthsLeft = 12 - nowD.getMonth();
  const sbBase = num(sb.income) - num(sb.spend);
  const sbGrown = num(sb.income) * (1 + num(sb.growth) / 100) - num(sb.spend);
  const sbEndBase = num(sb.balance) + sbBase * monthsLeft;
  const sbEndGrown = num(sb.balance) + sbGrown * monthsLeft;
  const sign = (n) => (n >= 0 ? 'text-emerald-400' : 'text-red-400');

  /* ---------- разметка ---------- */
  return (
    <div className="min-h-[100dvh] text-red-50 p-3 sm:p-6 pb-28 md:pb-6 font-sans relative overflow-x-hidden bg-[#020202]">
      {/* Фон: fixed + cover — на телефоне нет чёрных полос и дёрганья при скролле */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${baseUrl}bg.jpg')` }}
      />
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 bg-[linear-gradient(to_right,#1f0c0c_1px,transparent_1px),linear-gradient(to_bottom,#1f0c0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

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
        level={level}
        xp={xp}
        xpMax={XP_PER_LEVEL}
        onLogout={logout}
      />

      {/* Навигация: снизу на телефоне (под большой палец), под шапкой на десктопе.
          Вынесена из header, т.к. backdrop-blur ломает position:fixed у потомков */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-black/90 backdrop-blur-md border-t border-white/30 md:static md:max-w-6xl md:mx-auto md:mb-6 md:p-1.5 md:pb-1.5 md:bg-black/60 md:border md:rounded-xl">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 rounded-lg text-[11px] md:text-sm font-medium transition cursor-pointer ${
              activeTab === id ? `${grad} shadow-[0_0_15px_rgba(239,68,68,0.6)]` : 'text-red-300/70 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5 md:w-4 md:h-4" /> {label}
          </button>
        ))}
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto">
        {/* ЗАМЕТКИ */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className={`${card} p-4 sm:p-5 lg:col-span-2 flex flex-col gap-3`}>
              <h2 className="text-lg font-semibold text-red-500">📝 Заметки</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={12} placeholder="Быстрые мысли, ссылки, идеи..." className={`${input} w-full resize-y`} />
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between pt-3 border-t border-white/10">
                <span className="text-xs text-zinc-400">Данные хранятся только в этом браузере. Сделай копию, чтобы не потерять.</span>
                <div className="flex gap-2">
                  <button onClick={exportData} className={`flex-1 sm:flex-none px-4 py-2.5 ${grad} rounded-xl text-sm cursor-pointer`}>⬇ Скачать копию</button>
                  <label className="flex-1 sm:flex-none text-center px-4 py-2.5 bg-black/60 border border-white/30 rounded-xl text-sm text-red-200 hover:border-white/60 cursor-pointer">
                    ⬆ Загрузить
                    <input type="file" accept="application/json" onChange={importData} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div className={`${card} p-4 sm:p-5 h-fit`}>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-red-500">
                  <BookOpen className="w-5 h-5 text-orange-500" /> Быстрые ссылки
                </h2>
                <button onClick={() => setEditLinks(!editLinks)} className="text-xs text-zinc-400 hover:text-white underline cursor-pointer p-1">
                  {editLinks ? 'Готово' : 'Изменить'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {links.map(([name, href], i) =>
                  editLinks ? (
                    <div key={i} className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs flex items-center justify-between gap-1">
                      <span className="truncate text-red-200">{name}</span>
                      <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="p-1 text-zinc-400 hover:text-red-500 cursor-pointer" aria-label="Удалить ссылку"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <a key={i} href={href} target="_blank" rel="noreferrer" className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs hover:border-red-500 hover:bg-red-600/10 hover:scale-[1.02] transition flex items-center justify-between group shadow-sm">
                      <span className="text-red-200 group-hover:text-white font-semibold truncate">{name}</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-red-600/50 group-hover:text-white" />
                    </a>
                  )
                )}
              </div>
              {editLinks && (
                <form onSubmit={addLink} className="flex flex-col gap-2 mt-3">
                  <input type="text" value={newLink.name} onChange={(e) => setNewLink({ ...newLink, name: e.target.value })} placeholder="Название" className={input} />
                  <input type="text" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} placeholder="Адрес (example.com)" className={input} />
                  <button type="submit" className={`py-2.5 ${grad} rounded-xl text-sm cursor-pointer`}>Добавить ссылку</button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ДНЕВНИК */}
        {activeTab === 'diary' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className={`${card} p-4 sm:p-6 h-fit`}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-500">
                <BookText className="w-6 h-6 text-orange-500" /> Новая запись
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
                  <label className="flex items-center gap-1.5 text-xs text-red-200 bg-black/60 border border-white/30 hover:border-white/60 rounded-lg px-3 py-2 cursor-pointer">
                    <ImagePlus className="w-4 h-4" /> Фото
                    <input type="file" accept="image/*" multiple onChange={(e) => { addDiaryFiles(e.target.files); e.target.value = ''; }} className="hidden" />
                  </label>
                  {newDiaryImgs.map((src, i) => (
                    <div key={i} className="relative w-14 h-14">
                      <img src={src} alt="" className="w-full h-full object-cover rounded-lg border border-white/30" />
                      <button type="button" onClick={() => setNewDiaryImgs(newDiaryImgs.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 grid place-items-center rounded-full bg-red-600 text-white cursor-pointer" aria-label="Убрать фото"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <span className="text-[11px] text-zinc-500 w-full">Скриншот можно вставить через Ctrl+V прямо в поле. До 6 фото.</span>
                </div>
                <button type="submit" className={`w-full py-3 ${grad} rounded-xl text-sm hover:opacity-90 transition cursor-pointer`}>Сохранить запись</button>
              </form>
            </div>

            <div className={`lg:col-span-2 ${card} p-4 sm:p-8 lg:min-h-[500px]`}>
              <h2 className="text-xl sm:text-2xl font-bold mb-6 text-red-500 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" /> Личный архив мыслей
              </h2>
              {diaryEntries.length > 0 && (
                <input type="search" value={diarySearch} onChange={(e) => setDiarySearch(e.target.value)} placeholder="Поиск по записям" className={`${input} w-full mb-5`} />
              )}
              {diaryEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-white/20 rounded-2xl p-6">
                  <BookText className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500 font-medium">Дневник пока пуст.</p>
                  <p className="text-xs text-zinc-600 mt-1">Напишите первую запись.</p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {shownEntries.length === 0 && <p className="text-sm text-zinc-500 italic text-center py-6">Ничего не найдено.</p>}
                  {shownEntries.map((entry) => (
                    <div key={entry.id} className="p-4 sm:p-6 bg-black/60 border border-white/30 rounded-2xl relative group hover:border-red-500 transition shadow-lg">
                      <span className="text-xs text-orange-400 font-mono mb-2 block pr-10">{entry.date}</span>
                      {entry.text && <p className="text-base text-red-50 whitespace-pre-wrap break-words leading-relaxed">{entry.text}</p>}
                      {entry.images?.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                          {entry.images.map((src, i) => (
                            <button key={i} type="button" onClick={() => setLightbox(src)} className="cursor-zoom-in">
                              <img src={src} alt="Фото к записи" className="w-full h-28 sm:h-32 object-cover rounded-lg border border-white/20 hover:border-red-500 transition" />
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => window.confirm('Удалить запись?') && setDiaryEntries(diaryEntries.filter((i) => i.id !== entry.id))}
                        className={`${hoverShow} absolute top-3 right-3 p-2 text-zinc-500 hover:text-red-500 transition cursor-pointer`}
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
          <div className={`max-w-xl mx-auto ${card} p-4 sm:p-8 flex flex-col gap-5`}>
            <h2 className="text-xl sm:text-2xl font-bold text-red-500">💳 Финансы</h2>

            <button
              type="button"
              onClick={() => setShowBalance(!showBalance)}
              aria-pressed={showBalance}
              className="p-5 bg-black/70 border border-white/20 hover:border-white/40 rounded-2xl flex flex-col items-center shadow-inner cursor-pointer transition"
            >
              <span className="text-xs text-zinc-400 uppercase font-mono tracking-wider mb-1 flex items-center gap-1.5">
                {showBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} Общий баланс
              </span>
              <span className={`text-3xl font-extrabold font-mono transition ${total >= 0 ? 'text-emerald-400' : 'text-red-400'} ${showBalance ? '' : 'blur-md select-none'}`}>{fmt(total)}</span>
              {!showBalance && <span className="text-[11px] text-zinc-500 mt-1">Нажми, чтобы показать</span>}
            </button>

            <div className="p-4 bg-black/70 border border-white/20 rounded-2xl flex flex-col gap-2">
              <div className="flex justify-between items-center gap-3 text-xs font-mono">
                <span className="text-zinc-400 uppercase">Лимит на месяц</span>
                <input type="number" inputMode="numeric" value={limit || ''} onChange={(e) => setLimit(Math.max(0, Number(e.target.value) || 0))} placeholder="нет" className={`${input} w-28 py-1.5 text-right font-mono`} />
              </div>
              {limit > 0 && (
                <>
                  <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/20"><div className={`${limitColor} h-full transition-all`} style={{ width: `${Math.min(100, limitPct)}%` }} /></div>
                  <p className={`text-xs ${limitPct >= 100 ? 'text-red-400' : limitPct >= 80 ? 'text-amber-300' : 'text-zinc-400'}`}>
                    {limitPct >= 100 ? `⚠️ Лимит превышен на ${Math.round(monthSpent - limit)} ₸` : limitPct >= 80 ? `⚠️ Потрачено ${Math.round(limitPct)}% лимита, осталось ${Math.round(limit - monthSpent)} ₸` : `Потрачено ${monthSpent} из ${limit} ₸`}
                  </p>
                </>
              )}
            </div>

            {catSpent.length > 0 && (
              <div className="p-4 bg-black/70 border border-white/20 rounded-2xl flex items-center gap-4">
                <div className="w-24 h-24 shrink-0 rounded-full border border-white/20" style={{ background: `conic-gradient(${pie})` }} role="img" aria-label="Расходы по категориям за месяц" />
                <div className="flex flex-col gap-1 text-xs min-w-0">
                  <span className="text-zinc-400 font-mono uppercase mb-1">Траты за месяц</span>
                  {catSpent.map((c) => (
                    <span key={c.name} className="flex items-center gap-2 text-red-100">
                      <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-zinc-400 ml-auto pl-2">{c.value} ₸</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-black/70 border border-white/20 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-400 font-mono uppercase">🐷 Копилка</span>
                <span className="font-mono font-bold text-amber-300">{piggyTotal} ₸</span>
              </div>
              <div className="flex gap-2">
                <input type="text" value={piggy.goalName} onChange={(e) => setPiggy({ ...piggy, goalName: e.target.value })} placeholder="Цель (ноутбук)" className={`${input} flex-1 min-w-0`} />
                <input type="number" inputMode="numeric" value={piggy.goal || ''} onChange={(e) => setPiggy({ ...piggy, goal: Math.max(0, Number(e.target.value) || 0) })} placeholder="Сумма" className={`${input} w-28 font-mono`} />
              </div>
              {piggy.goal > 0 && (
                <div>
                  <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-white/20"><div className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all" style={{ width: `${piggyPct}%` }} /></div>
                  <p className="text-xs text-zinc-400 mt-1">{piggy.goalName || 'Цель'}: {Math.round(piggyPct)}% · {piggyTotal >= piggy.goal ? 'цель достигнута 🎉' : `осталось ${piggy.goal - piggyTotal} ₸`}</p>
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); piggyMove(1); }} className="flex gap-2">
                <input type="text" inputMode="decimal" value={piggyAmount} onChange={(e) => setPiggyAmount(e.target.value)} placeholder="Сумма, ₸" className={`${input} flex-1 min-w-0 font-mono`} />
                <button type="submit" className="px-3 bg-emerald-600 text-white rounded-xl text-sm font-medium cursor-pointer">Положить</button>
                <button type="button" onClick={() => piggyMove(-1)} className="px-3 bg-red-600 text-white rounded-xl text-sm font-medium cursor-pointer">Снять</button>
              </form>
              {piggy.items.slice(0, 5).map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">{it.date}</span>
                  <span className={it.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(it.amount)}</span>
                  <button onClick={() => setPiggy({ ...piggy, items: piggy.items.filter((x) => x.id !== it.id) })} className="p-1 text-zinc-500 hover:text-red-500 cursor-pointer" aria-label="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>

            <div className="p-4 bg-black/70 border border-white/20 rounded-2xl flex flex-col gap-3">
              <button type="button" onClick={() => setSbOpen(!sbOpen)} aria-expanded={sbOpen} className="flex justify-between items-center text-xs text-zinc-400 font-mono uppercase cursor-pointer">
                <span>🧪 Песочница «что если?»</span>
                <span className="text-base leading-none">{sbOpen ? '−' : '+'}</span>
              </button>

              {sbOpen && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[['save', 'Накопить'], ['grow', 'Рост дохода']].map(([id, label]) => (
                      <button key={id} type="button" onClick={() => setSbField('mode', id)} className={`py-2 rounded-xl border text-xs font-medium cursor-pointer transition ${sb.mode === id ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-black/40 border-white/20 text-red-200 hover:border-white/50'}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {sb.mode === 'save' ? (
                    <>
                      <p className="text-xs text-zinc-400">Если откладывать сумму каждую неделю, когда накоплю нужное?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {sbField('goal', 'Цель, ₸')}
                        {sbField('have', 'Уже есть, ₸')}
                      </div>
                      {sbField('weekly', 'Откладываю в неделю, ₸')}
                      {(piggy.goal > 0 || piggyTotal > 0) && (
                        <button type="button" onClick={() => setSb({ ...sb, goal: piggy.goal ? String(piggy.goal) : sb.goal, have: String(piggyTotal) })} className="text-[11px] text-zinc-400 hover:text-white underline text-left cursor-pointer">Взять цель и сумму из копилки</button>
                      )}
                      <div className="p-3 bg-black/60 border border-white/10 rounded-xl text-xs font-mono">
                        {num(sb.goal) <= 0 ? (
                          <span className="text-zinc-500">Введи цель и сумму в неделю.</span>
                        ) : sbLeft === 0 ? (
                          <span className="text-emerald-400">Цель уже достигнута 🎉</span>
                        ) : sbWeeks === null ? (
                          <span className="text-zinc-500">Осталось накопить {money(sbLeft)}. Введи, сколько откладываешь в неделю.</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-zinc-400">Осталось накопить: <span className="text-red-100">{money(sbLeft)}</span></span>
                            <span className="text-amber-300 font-bold text-sm">Через {sbWeeks} нед. (≈ {(sbWeeks / 4.345).toFixed(1)} мес.)</span>
                            <span className="text-zinc-400">Примерно к {sbDate.toLocaleDateString('ru-RU')}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-zinc-400">Если доход вырастет на Y%, сколько свободных денег будет к концу года?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {sbField('income', 'Доход в месяц, ₸', '0', sb.fromMonth)}
                        {sbField('spend', 'Расходы в месяц, ₸', '0', sb.fromMonth)}
                        {sbField('growth', 'Рост дохода, %', '10')}
                        {sbField('balance', 'Баланс сейчас, ₸', '0', sb.fromMonth)}
                      </div>
                      <button type="button" onClick={() => setSb({ ...sb, income: String(totals.month.income), spend: String(totals.month.expense), balance: String(total), fromMonth: true })} className="text-[11px] text-zinc-400 hover:text-white underline text-left cursor-pointer">Взять из текущего месяца (месяц может быть неполным)</button>
                      {sb.fromMonth && (
                        <p role="alert" className="flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/40 rounded-lg p-2">
                          <span>⚠️</span>
                          <span>Внимание: месяц ещё не закончился, данные спрогнозированы или взяты как есть.</span>
                        </p>
                      )}
                      <div className={`p-3 bg-black/60 border rounded-xl text-xs font-mono flex flex-col gap-1.5 ${sb.fromMonth ? 'border-amber-400/50' : 'border-white/10'}`}>
                        <div className="flex justify-between gap-2"><span className="text-zinc-400">Свободно в месяц сейчас</span><span className={sign(sbBase)}>{money(sbBase)}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-zinc-400">После роста</span><span className={sign(sbGrown)}>{money(sbGrown)}</span></div>
                        <div className="flex justify-between gap-2 pt-1.5 border-t border-white/10"><span className="text-zinc-400">К концу года без роста</span><span className={sign(sbEndBase)}>{money(sbEndBase)}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-zinc-400">К концу года с ростом</span><span className={`${sign(sbEndGrown)} font-bold`}>{money(sbEndGrown)}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-zinc-400">Разница</span><span className={sign(sbEndGrown - sbEndBase)}>{sbEndGrown - sbEndBase >= 0 ? '+' : '−'}{money(Math.abs(sbEndGrown - sbEndBase))}</span></div>
                        <span className="text-[10px] text-zinc-500">Считается {monthsLeft} мес. до конца года, включая текущий.</span>
                      </div>
                    </>
                  )}
                  <p className="text-[11px] text-zinc-500">Это только расчёт: твои данные учёта не меняются.</p>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-zinc-400 font-mono uppercase">Выписки:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {reportButtons.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setActiveReport(activeReport === id ? 'none' : id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${activeReport === id ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-black/40 border-white/20 text-red-200 hover:border-white/50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeReport !== 'none' && (
                <div className="p-4 bg-black/80 border border-red-500/40 rounded-xl flex flex-col gap-2 font-mono">
                  <span className="text-xs text-zinc-300">{reportLabels[activeReport]}</span>
                  {activeReport === 'month' && (
                    <p role="alert" className="flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-400/10 border border-amber-400/40 rounded-lg p-2 font-sans">
                      <span>⚠️</span>
                      <span>Внимание: месяц ещё не закончился, данные взяты как есть.</span>
                    </p>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">Поднял (доход)</span><span className="text-emerald-400 font-bold">+{totals[activeReport].income} ₸</span></div>
                  <div className="flex justify-between text-sm"><span className="text-zinc-400">Потратил</span><span className="text-red-400 font-bold">−{totals[activeReport].expense} ₸</span></div>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-zinc-300">Итого</span>
                    <span className={`font-bold ${totals[activeReport].net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(totals[activeReport].net)}</span>
                  </div>
                  {activeReport !== 'day' && periodItems[activeReport].length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      <span className="text-[10px] text-orange-400 uppercase tracking-wider">По дням</span>
                      {byDay(periodItems[activeReport]).map((d) => (
                        <div key={d.date} className="flex justify-between gap-2 text-[11px]">
                          <span className="text-zinc-400">{d.date}</span>
                          <span className="text-emerald-400">{d.income ? `+${r2(d.income)}` : '·'}</span>
                          <span className="text-red-400">{d.expense ? `−${r2(d.expense)}` : '·'}</span>
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

            <form onSubmit={addMoney} className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {[['expense', 'Расход'], ['income', 'Доход']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKind(id)}
                    className={`py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition ${kind === id ? (id === 'expense' ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white') : 'bg-black/40 border-white/20 text-zinc-300'}`}
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
                <button type="submit" className={`px-5 py-2.5 ${grad} rounded-xl text-sm hover:opacity-90 cursor-pointer whitespace-nowrap`}>Записать</button>
              </div>
              <p className="text-[11px] text-zinc-500">Дата записи: {selectedDate} (меняется в разделе «По дням»)</p>
            </form>

            <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              <div className="text-xs text-orange-400 font-mono uppercase tracking-wider">Все операции:</div>
              {all.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-4">Операций пока нет.</p>
              ) : (
                all.map((item) => (
                  <div key={item.id} className="p-3 bg-black/50 border border-white/20 rounded-xl flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className={`font-mono font-semibold text-sm ${item.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(item.amount)}</span>
                      <span className="text-[11px] text-zinc-500 font-mono">{item.date || 'Без даты'}{item.category ? ` · ${item.category}` : ''}</span>
                    </div>
                    <button onClick={() => deleteMoney(item.id)} className="text-zinc-500 hover:text-red-500 transition cursor-pointer p-2" aria-label="Удалить операцию">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Фото" className="max-w-full max-h-full rounded-xl border border-white/30 shadow-[0_0_30px_rgba(220,38,38,0.35)]" />
        </div>
      )}
    </div>
  );
}
