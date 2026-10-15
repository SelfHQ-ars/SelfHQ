import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, Zap, BookOpen, Flame, BookText, Trash2, ChevronRight, Sparkles, LayoutDashboard, Wallet, ImagePlus, X } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import ProfileHeader from './ProfileHeader';
import AuthGate, { getSessionNick, logout } from './AuthGate';

/* ---------- константы и хелперы ---------- */
const XP_PER_LEVEL = 500;
// Ключи, которые не должны попадать в резервную копию (пароли и сессия)
const PRIVATE_KEYS = ['selfhq_accounts', 'selfhq_session'];

const QUOTES = [
  '«Сначала напиши код, который работает. Затем сделай его красивым. И потом — быстрым».',
  '«Простота — необходимое условие надежности». — Эдсгер Дейкстра',
  '«Чистый код выглядит так, будто он был написан кем-то, кому не все равно».',
  '«Ошибки в коде — это не провал, а шаг к пониманию того, как всё устроено».',
  '«Лучший код — это тот, который не пришлось писать».',
  '«Дисциплина — разница между тем, чего ты хочешь сейчас, и тем, чего хочешь больше всего».',
  '«Seni jeńgen zat seni küştırek etedı (Что не убивает — делает сильнее)».',
  '«Каждая написанная строка кода — это инвестиция в твои навыки».',
  '«Сложность создаёт проблемы, простота создаёт решения».',
  '«Не переживай, если что-то не работает. Если бы всё работало, у тебя не было бы работы».',
  '«Маленькие ежедневные шаги дают огромный результат на дистанции».',
  '«Концентрируйся на процессе, а результат подтянется сам».'
];

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

const DEFAULT_QUESTS = [
  { id: 1, text: 'Успеть вовремя в колледж (не опоздать)', xp: 50 },
  { id: 2, text: 'Полноценная тренировка', xp: 70 },
  { id: 3, text: 'Убраться в комнате', xp: 40 },
  { id: 4, text: 'Протереть пыль в комнате', xp: 30 },
  { id: 5, text: 'Час практики кода', xp: 60 },
  { id: 6, text: 'Выучить 10 английских слов', xp: 30 }
];

const CATEGORIES = [
  { name: 'Еда', color: '#ef4444' },
  { name: 'Транспорт', color: '#f97316' },
  { name: 'Развлечения', color: '#eab308' },
  { name: 'Учёба', color: '#22c55e' },
  { name: 'Другое', color: '#a1a1aa' }
];

const TABS = [
  ['dashboard', 'Дашборд', LayoutDashboard],
  ['skills', 'Древо', Flame],
  ['diary', 'Дневник', BookText],
  ['finance', 'Финансы', Wallet]
];

const pad = (n) => String(n).padStart(2, '0');
// Локальная дата (а не UTC, как у toISOString) — иначе ночью в Казахстане дата «вчера»
const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getDaysLeft = (mmdd) => {
  if (!/^\d{2}-\d{2}$/.test(mmdd || '')) return 0;
  const today = startOfDay(new Date());
  const [m, d] = mmdd.split('-').map(Number);
  let target = new Date(today.getFullYear(), m - 1, d);
  if (target < today) target = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((target - today) / 86400000);
};

const weatherText = (c) =>
  c === 0 ? 'ясно' : c <= 3 ? 'облачно' : c <= 48 ? 'туман' : c <= 67 ? 'дождь' : c <= 77 ? 'снег' : c <= 82 ? 'ливни' : c <= 86 ? 'снегопад' : 'гроза';

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

// Вход по нику и паролю оборачивает всё приложение
export default function App() {
  return (
    <AuthGate>
      <AppInner />
    </AuthGate>
  );
}

function AppInner() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const TAB_IDS = TABS.map((t) => t[0]);
  // #diary / #finance — открывается из быстрых действий иконки на домашнем экране
  const [activeTab, setActiveTab] = useState(() => {
    const h = window.location.hash.slice(1);
    return TAB_IDS.includes(h) ? h : 'dashboard';
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

  // Горячие клавиши: 1–4 — вкладки, Esc — закрыть фото. В полях ввода не срабатывают
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

  /* ---------- живые данные ---------- */
  const [weather, setWeather] = useState({ temp: '—', desc: 'загрузка' });
  const [rates, setRates] = useState({ usd: '—', rub: '—' });
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=51.2333&longitude=51.3667&current=temperature_2m,weather_code')
      .then((r) => r.json())
      .then((d) => {
        if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), desc: weatherText(d.current.weather_code) });
      })
      .catch(() => setWeather({ temp: '—', desc: 'нет данных' }));

    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((d) => {
        if (d?.rates?.KZT && d?.rates?.RUB) {
          setRates({ usd: d.rates.KZT.toFixed(2), rub: (d.rates.KZT / d.rates.RUB).toFixed(2) });
        }
      })
      .catch(() => setRates({ usd: 'нет данных', rub: 'нет данных' }));

    fetch('https://dev.to/api/articles?per_page=2')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setNews(d.map((i) => ({ title: i.title, url: i.url })));
      })
      .catch(() => {});
  }, []);

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

  /* ---------- цитата, день рождения ---------- */
  const [quoteIndex, setQuoteIndex] = useState(new Date().getDate() % QUOTES.length);
  const [bdayName, setBdayName] = useLocalStorage('selfhq_bday_name', 'Мой День Рождения');
  const [bdayDate, setBdayDate] = useLocalStorage('selfhq_bday_date', '05-15');
  const [isEditingBday, setIsEditingBday] = useState(false);

  const todayMMDD = localISO().slice(5);
  const isBdayToday = bdayDate === todayMMDD;
  const daysToBday = getDaysLeft(bdayDate);
  const daysToSummer = getDaysLeft('06-01');

  /* ---------- квесты: свой список, каждый день случайный набор, штраф за пропуск ---------- */
  const [quests, setQuests] = useLocalStorage('selfhq_quests', DEFAULT_QUESTS);
  const [todayIds, setTodayIds] = useLocalStorage('selfhq_today_ids', []);
  const [doneIds, setDoneIds] = useLocalStorage('selfhq_done_ids', []);
  const [questsDate, setQuestsDate] = useLocalStorage('selfhq_quests_date', '');
  const [dailyCount, setDailyCount] = useLocalStorage('selfhq_daily_count', 4);
  const [editQuests, setEditQuests] = useState(false);
  const [newQuest, setNewQuest] = useState({ text: '', xp: 30 });

  useEffect(() => {
    const today = localISO();
    if (questsDate === today) return;
    if (questsDate) {
      const missed = quests.filter((q) => todayIds.includes(q.id) && !doneIds.includes(q.id));
      const penalty = missed.reduce((a, q) => a + Math.ceil(q.xp / 5), 0);
      if (penalty) setXp(Math.max(0, xp - penalty));
    }
    setTodayIds([...quests].sort(() => Math.random() - 0.5).slice(0, dailyCount).map((q) => q.id));
    setDoneIds([]);
    setQuestsDate(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayQuests = quests.filter((q) => todayIds.includes(q.id));
  const completeQuest = (q) => {
    if (doneIds.includes(q.id)) return;
    setDoneIds([...doneIds, q.id]);
    gainXp(q.xp);
  };
  const updateQuest = (id, patch) => setQuests(quests.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQuest = (id) => {
    setQuests(quests.filter((q) => q.id !== id));
    setTodayIds(todayIds.filter((i) => i !== id));
  };
  const addQuest = (e) => {
    e.preventDefault();
    if (!newQuest.text.trim()) return;
    const id = Date.now();
    setQuests([...quests, { id, text: newQuest.text.trim(), xp: Math.max(1, Number(newQuest.xp) || 10) }]);
    setTodayIds([...todayIds, id]);
    setNewQuest({ text: '', xp: 30 });
  };

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

  /* ---------- древо ---------- */
  const [skillTree, setSkillTree] = useLocalStorage('selfhq_skilltree', [
    { id: 'branch-1', branchName: '(Колледж и Учеба)', tasks: [{ id: 't1', title: 'Сдать все задания в срок' }] }
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('branch-1');
  const [newBranchName, setNewBranchName] = useState('');
  // Если выбранную ветку удалили — берём первую существующую
  const activeBranchId = skillTree.some((b) => b.id === selectedBranchId) ? selectedBranchId : skillTree[0]?.id;

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !activeBranchId) return;
    setSkillTree(
      skillTree.map((b) =>
        b.id === activeBranchId ? { ...b, tasks: [...b.tasks, { id: Date.now().toString(), title: newTaskText.trim() }] } : b
      )
    );
    setNewTaskText('');
  };

  const addBranch = (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const id = Date.now().toString();
    setSkillTree([...skillTree, { id, branchName: newBranchName.trim(), tasks: [] }]);
    setSelectedBranchId(id);
    setNewBranchName('');
  };

  const removeTask = (branchId, taskId) =>
    setSkillTree(skillTree.map((b) => (b.id === branchId ? { ...b, tasks: b.tasks.filter((t) => t.id !== taskId) } : b)));

  const removeBranch = (b) => {
    if (window.confirm(`Удалить ветку «${b.branchName}» вместе с задачами?`)) setSkillTree(skillTree.filter((x) => x.id !== b.id));
  };

  const toggleTask = (branchId, taskId) => {
    let reward = 0;
    setSkillTree(
      skillTree.map((b) =>
        b.id !== branchId
          ? b
          : {
              ...b,
              tasks: b.tasks.map((t) => {
                if (t.id !== taskId) return t;
                if (!t.done && !t.rewarded) reward = 15;
                return { ...t, done: !t.done, rewarded: t.rewarded || !t.done };
              })
            }
      )
    );
    if (reward) gainXp(reward);
  };
  const allTasks = skillTree.flatMap((b) => b.tasks);
  const leavesDone = allTasks.filter((t) => t.done).length;

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
        {/* ДАШБОРД */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className={`${card} p-4 sm:p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-red-500">
                  <Zap className="w-5 h-5 text-orange-500" /> Ежедневные испытания
                </h2>
                <button onClick={() => setEditQuests(!editQuests)} className="text-xs text-zinc-400 hover:text-white underline cursor-pointer p-1">
                  {editQuests ? 'Готово' : 'Изменить'}
                </button>
              </div>
              {editQuests ? (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-zinc-500">Каждый день выпадает случайный набор из списка. Невыполненный квест — штраф в 1/5 его XP.</p>
                  <label className="flex items-center justify-between text-xs text-zinc-300">
                    Квестов в день (со следующего дня)
                    <input type="number" value={dailyCount} onChange={(e) => setDailyCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} className={`${input} w-16 py-1 font-mono`} />
                  </label>
                  {quests.map((q) => (
                    <div key={q.id} className="flex items-center gap-2">
                      <input type="text" value={q.text} onChange={(e) => updateQuest(q.id, { text: e.target.value })} className={`${input} flex-1 min-w-0`} />
                      <input type="number" value={q.xp} onChange={(e) => updateQuest(q.id, { xp: Math.max(1, Number(e.target.value) || 1) })} className={`${input} w-16 font-mono`} />
                      <button onClick={() => removeQuest(q.id)} className="p-2 text-zinc-400 hover:text-red-500 cursor-pointer" aria-label="Удалить квест"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <form onSubmit={addQuest} className="flex gap-2 pt-1">
                    <input type="text" value={newQuest.text} onChange={(e) => setNewQuest({ ...newQuest, text: e.target.value })} placeholder="Новый квест" className={`${input} flex-1 min-w-0`} />
                    <input type="number" value={newQuest.xp} onChange={(e) => setNewQuest({ ...newQuest, xp: e.target.value })} className={`${input} w-16 font-mono`} />
                    <button type="submit" className={`px-3 ${grad} rounded-xl cursor-pointer`}>+</button>
                  </form>
                </div>
              ) : isBdayToday ? (
                <div className="py-8 text-center bg-red-950/30 border border-amber-500/40 rounded-xl p-4">
                  <p className="text-amber-400 font-bold text-base mb-1">🎉 Праздничный день!</p>
                  <p className="text-xs text-red-200">Сегодня {bdayName}! Квесты отменены — отдыхай! 🍰</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayQuests.length === 0 && <p className="text-xs text-zinc-500 italic">Квестов нет — добавь их через «Изменить».</p>}
                  {todayQuests.map((q) => {
                    const done = doneIds.includes(q.id);
                    return (
                      <div key={q.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition ${done ? 'bg-red-950/20 border-white/20 opacity-50' : 'bg-black/50 border-white/20 hover:border-white/50'}`}>
                        <span className={`text-sm ${done ? 'line-through text-zinc-500' : 'text-red-100'}`}>{q.text}</span>
                        {!done ? (
                          <button onClick={() => completeQuest(q)} className="shrink-0 text-xs bg-red-600/20 text-red-300 px-3 py-2 rounded-lg border border-white/40 hover:bg-red-600 hover:text-white transition cursor-pointer font-medium">+{q.xp} XP</button>
                        ) : (
                          <CheckCircle className="w-5 h-5 shrink-0 text-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${card} p-4 sm:p-5`}>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-red-500">
                  <BookOpen className="w-5 h-5 text-orange-500" /> Быстрые ссылки
                </h2>
                <button onClick={() => setEditLinks(!editLinks)} className="text-xs text-zinc-400 hover:text-white underline cursor-pointer p-1">
                  {editLinks ? 'Готово' : 'Изменить'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 lg:max-h-[220px] lg:overflow-y-auto pr-1">
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

            <div className={`${card} p-4 sm:p-5 flex flex-col gap-3 text-white`}>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/10">
                  <span className="text-2xl">⛅</span>
                  <div>
                    <div className="text-xs text-zinc-400">Уральск</div>
                    <div className="text-sm font-bold">{weather.temp}°C, {weather.desc}</div>
                  </div>
                </div>
                <div className="flex flex-col justify-center bg-black/40 p-3 rounded-xl border border-white/10 text-xs gap-1">
                  <div className="flex justify-between gap-2"><span className="text-zinc-400">USD:</span><span className="font-semibold">{rates.usd}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-zinc-400">RUB:</span><span className="font-semibold">{rates.rub}</span></div>
                </div>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">Цитата дня</span>
                  <button
                    onClick={() => setQuoteIndex((p) => (p + 1) % QUOTES.length)}
                    className="text-xs bg-red-600/25 hover:bg-red-600 text-red-200 hover:text-white px-2.5 py-1 rounded border border-white/20 transition cursor-pointer font-mono"
                  >
                    Следующая ↻
                  </button>
                </div>
                <p className="text-red-100 font-medium leading-relaxed italic min-h-[40px]">{QUOTES[quoteIndex]}</p>
              </div>

              {news.length > 0 && (
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs flex flex-col gap-2">
                  <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">IT-новости · Dev.to</span>
                  {news.map((n) => (
                    <a key={n.url} href={n.url} target="_blank" rel="noreferrer" className="text-red-100 hover:text-white line-clamp-2">{n.title}</a>
                  ))}
                </div>
              )}

              <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">🎉 {bdayName}</span>
                  <button onClick={() => setIsEditingBday(!isEditingBday)} className="text-xs text-zinc-400 hover:text-white underline cursor-pointer p-1">
                    {isEditingBday ? 'Сохранить' : 'Изменить'}
                  </button>
                </div>
                {isEditingBday ? (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <input type="text" value={bdayName} onChange={(e) => setBdayName(e.target.value)} placeholder="Чьё ДР" className={input} />
                    {/* Нативный календарь вместо ручного ввода «ММ-ДД»: нельзя ввести кривую дату */}
                    <input
                      type="date"
                      value={`2000-${bdayDate}`}
                      onChange={(e) => e.target.value && setBdayDate(e.target.value.slice(5))}
                      className={`${input} font-mono`}
                    />
                  </div>
                ) : isBdayToday ? (
                  <div className="text-xs font-bold text-amber-400 animate-pulse">🎁 Сегодня праздничный день! 🥳</div>
                ) : (
                  <div className="font-medium text-red-100">Осталось <span className="text-orange-400 font-bold">{daysToBday}</span> дн.</div>
                )}
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs flex items-center justify-between">
                <div>
                  <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">☀️ До лета (1 июня)</span>
                  <div className="font-medium text-red-100 mt-0.5">Осталось <span className="text-amber-400 font-bold">{daysToSummer}</span> дн.</div>
                </div>
                <span className="text-lg">🌴</span>
              </div>
            </div>

            <div className={`${card} p-4 sm:p-5 lg:col-span-3 flex flex-col gap-3`}>
              <h2 className="text-lg font-semibold text-red-500">📝 Заметки</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Быстрые мысли, ссылки, идеи..." className={`${input} w-full resize-y`} />
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
          </div>
        )}

        {/* ДРЕВО */}
        {activeTab === 'skills' && (
          <div className={`${card} p-4 sm:p-6`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/20">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-red-500 flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500 fill-orange-500" /> Древо целей и задач
                </h2>
                <p className="text-xs text-red-300/60 mt-1">Нажми на руну — навык освоен (+15 XP за первый раз)</p>
              </div>
              <form onSubmit={addBranch} className="flex gap-2 w-full md:w-auto">
                <input type="text" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder="Название новой ветки" className={`${input} flex-1 min-w-0`} />
                <button type="submit" className={`px-4 py-2 ${grad} rounded-xl text-sm cursor-pointer whitespace-nowrap`}>+ Ветка</button>
              </form>
            </div>

            <form onSubmit={addTask} className="bg-black/50 p-3 sm:p-4 rounded-xl border border-white/20 mb-6 flex flex-col md:flex-row gap-3">
              <select value={activeBranchId || ''} onChange={(e) => setSelectedBranchId(e.target.value)} className={`${input} w-full md:w-64 cursor-pointer`}>
                {skillTree.map((b) => (<option key={b.id} value={b.id}>{b.branchName}</option>))}
              </select>
              <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Новая задача" className={`${input} flex-1 w-full`} />
              <button type="submit" className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-500 transition cursor-pointer w-full md:w-auto">Добавить</button>
            </form>

            {/* Игровое древо навыков: светящаяся жила-ствол, узлы-ромбы, панели с рунами, искры */}
            <div
              className="relative overflow-hidden rounded-2xl border border-amber-900/50 p-4 sm:p-6"
              style={{ background: 'radial-gradient(ellipse 80% 35% at 50% 100%, rgba(234,88,12,.28), transparent 70%), radial-gradient(ellipse 60% 25% at 50% 0%, rgba(220,38,38,.18), transparent 70%), repeating-linear-gradient(45deg, rgba(255,255,255,.015) 0 2px, transparent 2px 6px), #07050a' }}
            >
              <style>{`
                @keyframes sparkrise{0%{top:104%;opacity:0}20%{opacity:.9}100%{top:-4%;opacity:0}}
                @media (prefers-reduced-motion: reduce){.fx{display:none}}
              `}</style>

              <div className="relative flex flex-col gap-6 pb-2">
                {/* ствол: светящаяся жила энергии */}
                <div className="absolute left-4 md:left-1/2 top-4 bottom-4 w-6 -translate-x-1/2 bg-orange-600/30 blur-lg rounded-full" />
                <div className="absolute left-4 md:left-1/2 top-4 bottom-4 w-1 -translate-x-1/2 rounded-full bg-gradient-to-t from-red-700 via-orange-500 to-amber-300 shadow-[0_0_14px_rgba(251,146,60,.9)]" />

                <div className="relative z-10 flex md:justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-black/85 border border-amber-600/60 text-sm text-amber-300 font-semibold shadow-[0_0_16px_rgba(245,158,11,.3)]">
                    <Trophy className="w-4 h-4" /> Освоено навыков: {leavesDone}/{allTasks.length}
                  </div>
                </div>

                {skillTree.length === 0 && <p className="relative z-10 text-sm text-zinc-500 italic pl-10 md:text-center">Веток пока нет. Создай первую выше.</p>}

                {skillTree.map((b, i) => [b, i]).reverse().map(([branch, i]) => {
                  const right = i % 2 === 0;
                  const count = branch.tasks.length;
                  const done = branch.tasks.filter((t) => t.done).length;
                  const full = count > 0 && done === count;
                  return (
                    <div key={branch.id} className={`relative pl-10 md:w-1/2 ${right ? 'md:ml-auto' : 'md:pl-0 md:pr-10'}`}>
                      <span className={`absolute top-8 h-0.5 bg-gradient-to-r from-orange-500 to-red-700 shadow-[0_0_8px_rgba(251,146,60,.8)] left-4 w-6 ${right ? 'md:left-0 md:w-10' : 'md:left-auto md:right-0 md:w-10'}`} />
                      <span className={`absolute top-[27px] w-3 h-3 rotate-45 bg-amber-400 shadow-[0_0_10px_#fbbf24] left-4 -translate-x-1/2 ${right ? 'md:left-0' : 'md:left-auto md:right-0 md:translate-x-1/2'}`} />
                      <div className={`relative p-3 sm:p-4 bg-[#0d0a0f]/90 border rounded-lg group/branch transition-all duration-200 md:hover:bg-red-900/70 md:hover:border-red-500 ${full ? 'border-amber-400/80 shadow-[0_0_24px_rgba(251,146,60,.45)]' : 'border-amber-900/50 border-t-amber-600/80'}`}>
                        <div className="flex justify-between items-center gap-2 mb-2">
                          <h3 className={`font-bold flex items-center gap-2 text-base min-w-0 ${full ? 'text-amber-300' : 'text-amber-100'}`}>
                            <span className="truncate">{branch.branchName}</span>
                            {full && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400 text-black font-bold shrink-0">MAX</span>}
                          </h3>
                          <button onClick={() => removeBranch(branch)} className="md:opacity-0 md:group-hover/branch:opacity-100 shrink-0 transition cursor-pointer px-2.5 py-1.5 flex items-center gap-1 text-xs text-white bg-black/60 rounded-lg border border-white/40 hover:bg-black/80" aria-label="Удалить ветку">
                            <Trash2 className="w-4 h-4" /> Удалить ветку
                          </button>
                        </div>
                        {count > 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1 flex gap-0.5">
                              {branch.tasks.map((t) => (
                                <span key={t.id} className={`flex-1 h-1.5 rounded-sm ${t.done ? 'bg-gradient-to-r from-orange-500 to-amber-300 shadow-[0_0_6px_rgba(251,146,60,.8)]' : 'bg-white/10'}`} />
                              ))}
                            </div>
                            <span className="text-[11px] font-mono text-amber-200/80">{done}/{count}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          {count === 0 && <p className="text-xs text-white/60 italic">Навыков нет — добавь задачу выше.</p>}
                          {branch.tasks.map((task) => (
                            <div key={task.id} className={`flex items-center gap-2 rounded-md border pr-1 ${task.done ? 'bg-amber-950/40 border-amber-500/50' : 'bg-black/50 border-white/15'}`}>
                              <button onClick={() => toggleTask(branch.id, task.id)} aria-pressed={!!task.done} className="flex-1 min-w-0 flex items-center gap-2.5 p-2 text-left cursor-pointer">
                                <span className={`w-7 h-7 shrink-0 grid place-items-center rotate-45 rounded-sm border ${task.done ? 'bg-gradient-to-br from-amber-300 to-orange-600 border-amber-200 text-black shadow-[0_0_12px_rgba(251,146,60,.8)]' : 'bg-zinc-900 border-white/25 text-zinc-600'}`}>
                                  <Zap className="w-3.5 h-3.5 -rotate-45" />
                                </span>
                                <span className={`text-sm break-words min-w-0 ${task.done ? 'text-amber-200' : 'text-zinc-300'}`}>{task.title}</span>
                              </button>
                              <button onClick={() => removeTask(branch.id, task.id)} className="px-2 py-1 text-white/40 hover:text-white cursor-pointer" aria-label="Удалить задачу">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="relative z-10 flex md:justify-center">
                  <div className="-ml-3 md:ml-0 flex flex-col items-center">
                    <div className="w-14 h-16 grid place-items-center bg-gradient-to-b from-amber-300 to-orange-700 text-black text-xl font-extrabold shadow-[0_0_20px_rgba(251,146,60,.8)]" style={{ clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}>{level}</div>
                    <span className="text-[11px] text-amber-300/80 mt-1">Ранг</span>
                  </div>
                </div>
              </div>

              {Array.from({ length: 14 }, (_, i) => (
                <span key={`s${i}`} className="fx absolute w-1 h-1 rounded-full bg-orange-400 shadow-[0_0_6px_#fb923c] pointer-events-none" style={{ left: `${(i * 7 + 4) % 96}%`, animation: `sparkrise ${6 + (i % 4) * 2}s linear ${-i * 1.1}s infinite` }} />
              ))}
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

            <div className="p-5 bg-black/70 border border-white/20 rounded-2xl flex flex-col items-center shadow-inner">
              <span className="text-xs text-zinc-400 uppercase font-mono tracking-wider mb-1">Общий баланс</span>
              <span className={`text-3xl font-extrabold font-mono ${total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(total)}</span>
            </div>

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
