import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, Clock, Zap, BookOpen, Flame, BookText, Plus, Trash2, ChevronRight, Sparkles, Sword } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';

export default function App() {
  // Базовый путь для ассетов из папки public (работает и локально, и на GitHub Pages)
  const baseUrl = import.meta.env.BASE_URL || '/';

  // Живой блок qw (погода, валюта, IT-новости)
  const [weather, setWeather] = useState({ temp: '...', desc: 'загрузка...' });
  const [rates, setRates] = useState({ usd: '...', rub: '...' });
  const [news, setNews] = useState([
    { title: 'Загрузка свежих IT-новостей...', source: 'Dev.to', url: '#' }
  ]);

  useEffect(() => {
    // 1. Погода в Уральске (Open-Meteo API)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=51.2333&longitude=51.3667&current=temperature_2m')
      .then(res => res.json())
      .then(data => {
        if (data?.current) {
          setWeather({ temp: Math.round(data.current.temperature_2m), desc: 'ясно' });
        }
      })
      .catch(() => setWeather({ temp: '+18', desc: 'ясно' }));

    // 2. Курсы валют к тенге (ExchangeRate API)
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data?.rates) {
          const usdToKzt = data.rates.KZT;
          const rubToUsd = data.rates.RUB;
          const rubToKzt = usdToKzt / rubToUsd;
          setRates({
            usd: usdToKzt.toFixed(2),
            rub: rubToKzt.toFixed(2)
          });
        }
      })
      .catch(() => setRates({ usd: '492.50', rub: '5.20' }));

    // 3. Реальные IT-новости с Dev.to
    fetch('https://dev.to/api/articles?per_page=2')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNews(data.map(item => ({
            title: item.title,
            source: 'Dev.to • ' + new Date(item.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            url: item.url
          })));
        }
      })
      .catch(() => {});
  }, []);

  const quotesList = [
  "«Сначала напиши код, который работает. Затем сделай его красивым. И потом — быстрым».",
  "«Простота — необходимое условие надежности». — Эдсгер Дейкстра",
  "«Чистый код выглядит так, будто он был написан кем-то, кому не все равно».",
  "«Ошибки в коде — это не провал, а шаг к пониманию того, как всё устроено».",
  "«Лучший код — это тот, который не пришлось писать».",
  "«Дисциплина — разница между тем, чего ты хочешь сейчас, и тем, чего хочешь больше всего».",
  "«Seni jeńgen zat seni küştırek etedı (Что не убивает — делает сильнее)».",
  "«Каждая написанная строка кода — это инвестиция в твои навыки».",
  "«Сложность создаёт проблемы, простота создаёт решения».",
  "«Не переживай, если что-то не работает. Если бы всё работало, у тебя не было бы работы».",
  "«Маленькие ежедневные шаги дают огромный результат на дистанции».",
  "«Концентрируйся на процессе, а результат подтянется сам»."
];

const [quoteIndex, setQuoteIndex] = useState(0);

// Состояния для Дня рождения и обратного отсчета
const [bdayName, setBdayName] = useLocalStorage('selfhq_bday_name', 'Мой День Рождения');
const [bdayDate, setBdayDate] = useLocalStorage('selfhq_bday_date', '05-15');
const [isEditingBday, setIsEditingBday] = useState(false);

// Проверка: сегодня ли День Рождения?
const today = new Date();
const currentMMDD = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
const isBdayToday = bdayDate === currentMMDD;

// Функция расчета дней
const getDaysLeft = (targetMMDD) => {
  if (!targetMMDD || !targetMMDD.includes('-')) return 0;
  const now = new Date();
  const [month, day] = targetMMDD.split('-').map(Number);
  let target = new Date(now.getFullYear(), month - 1, day);
  if (target < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    target = new Date(now.getFullYear() + 1, month - 1, day);
  }
  const diff = target - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const daysToBday = getDaysLeft(bdayDate);
const daysToSummer = getDaysLeft('06-01');

const [xp, setXp] = useLocalStorage('selfhq_xp', 240);
  const [level, setLevel] = useLocalStorage('selfhq_level', 3);
  const [activeTab, setActiveTab] = useState('dashboard');

  // 1. Ежедневные квесты
  const [quests, setQuests] = useLocalStorage('selfhq_quests', [
    { id: 1, text: 'Успеть вовремя в колледж (не опоздать)', xp: 50, completed: false },
    { id: 2, text: 'Полноценная тренировка', xp: 70, completed: false },
    { id: 3, text: 'Убраться в комнате', xp: 40, completed: false },
    { id: 4, text: 'Протереть пыль в комнате', xp: 30, completed: false }
  ]);

  // 2. Древо задач
  const [skillTree, setSkillTree] = useLocalStorage('selfhq_skilltree', [
    {
      id: 'branch-1',
      branchName: '(Колледж и Учеба)',
      tasks: [
        { id: 't1', title: 'Сдать все задания в срок', status: 'in-progress', desc: 'Основная цель на эту неделю' }
      ]
    }
  ]);

  const [newTaskText, setNewTaskText] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('branch-1');
  const [newBranchName, setNewBranchName] = useState('');

  // 3. Дневник
  const [diaryEntries, setDiaryEntries] = useLocalStorage('selfhq_diary', []);
  const [newDiaryText, setNewDiaryText] = useState('');
// 4. Финансы с выпадающей аналитикой
  const [financeData, setFinanceData] = useLocalStorage('selfhq_finance', {
    expenses: []
  });
  const [amount, setAmount] = useState('');
  
  const getTodayFormatted = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getTodayFormatted());
  
  // Состояние для активного режима выписки ('none' | 'week' | 'month' | 'year' | 'day')
  const [activeReport, setActiveReport] = useState('none');

  const addMoney = (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val)) return;

    const newTransaction = {
      id: Date.now(),
      amount: val,
      date: selectedDate
    };

    setFinanceData({
      ...financeData,
      expenses: [newTransaction, ...(financeData.expenses || [])]
    });
    setAmount('');
  };

  const deleteMoney = (id) => {
    const newExpenses = (financeData.expenses || []).filter(item => item.id !== id);
    setFinanceData({ ...financeData, expenses: newExpenses });
  };

  // Общий баланс
  const allExpenses = financeData.expenses || [];
  const total = allExpenses.reduce((acc, curr) => acc + (typeof curr === 'number' ? curr : curr.amount), 0);

  // Расчеты для выписок
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const yearTotal = allExpenses
    .filter(item => typeof item === 'object' && new Date(item.date).getFullYear() === currentYear)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const monthTotal = allExpenses
    .filter(item => {
      if (typeof item !== 'object') return false;
      const d = new Date(item.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(now.getDate() - 7);
  const weekTotal = allExpenses
    .filter(item => typeof item === 'object' && new Date(item.date) >= oneWeekAgo)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const filteredExpenses = allExpenses.filter(item => typeof item === 'object' && item.date === selectedDate);
  const dayTotal = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  // Завершение квеста
  const completeQuest = (id, reward) => {
    setQuests(quests.map(q => q.id === id ? { ...q, completed: true } : q));
    const newXp = xp + reward;
    if (newXp >= 500) {
      setLevel(level + 1);
      setXp(newXp - 500);
    } else {
      setXp(newXp);
    }
  };

  // Добавление задачи в Древо
  const addTaskToBranch = (branchId, e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    
    setSkillTree(skillTree.map(branch => {
      if (branch.id === branchId) {
        return {
          ...branch,
          tasks: [
            ...branch.tasks,
            { id: Date.now().toString(), title: newTaskText, status: 'in-progress', desc: 'Личная цель' }
          ]
        };
      }
      return branch;
    }));
    setNewTaskText('');
  };

  // Добавление новой ветки в Древо
  const addBranch = (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    const newBranch = {
      id: Date.now().toString(),
      branchName: newBranchName,
      tasks: []
    };
    setSkillTree([...skillTree, newBranch]);
    setNewBranchName('');
  };

  // Удаление задачи из Древа
  const removeTask = (branchId, taskId) => {
    setSkillTree(skillTree.map(branch => {
      if (branch.id === branchId) {
        return { ...branch, tasks: branch.tasks.filter(t => t.id !== taskId) };
      }
      return branch;
    }));
  };

  // Добавление записи в Дневник
  const addDiaryEntry = (e) => {
    e.preventDefault();
    if (!newDiaryText.trim()) return;
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      text: newDiaryText
    };
    setDiaryEntries([newEntry, ...diaryEntries]);
    setNewDiaryText('');
  };

  return (
    <div        
  className="min-h-screen text-red-50 p-6 font-sans relative overflow-x-hidden"       
  style={{         
    backgroundImage: `url('${baseUrl}bg.jpg')`, 
    backgroundSize: 'contain', 
    backgroundPosition: 'center', 
    imageRendering: 'high-quality', 
    backgroundAttachment: 'scroll', 
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#020202' 
  }}     
>

      
      {/* Декоративный фон в стиле хаори Танджиро (клетка) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0c0c_1px,transparent_1px),linear-gradient(to_bottom,#1f0c0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

      {/* Шапка / Навигация */}
      <header className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-zinc-950/80 backdrop-blur-md border-2 border-white/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.25)]">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-white via-zinc-300 to-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            <img 
              src={`${baseUrl}avatar.jpg`} 
              alt="Avatar" 
              className="w-full h-full object-cover rounded-full border border-black"
            />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-300 bg-clip-text text-transparent">SelfHQ</h1>
            <p className="text-xs text-white/80 font-mono tracking-widest uppercase">Путь гондона</p>
          </div>
        </div>

        {/* Прогресс уровня и XP */}
        <div className="flex items-center gap-4 bg-black/70 px-4 py-2 rounded-xl border border-white/30 shadow-inner">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Trophy className="w-4 h-4 text-orange-500" /> Ранг {level}
          </div>
          <div className="w-32 bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-white/30">
            <div 
              className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 h-full transition-all duration-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]" 
              style={{ width: `${(xp / 500) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs text-orange-300 font-mono">{xp}/500 XP</span>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex gap-2 bg-black/60 p-1.5 rounded-xl border border-white/30">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-red-300/70 hover:text-white'}`}
          >
            dashboard
          </button>
          <button 
            onClick={() => setActiveTab('skills')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === 'skills' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-red-300/70 hover:text-white'}`}
          >
            Древо
          </button>
          <button 
            onClick={() => setActiveTab('diary')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === 'diary' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-red-300/70 hover:text-white'}`}
          >
            Дневник
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${activeTab === 'finance' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-red-300/70 hover:text-white'}`}
          >
            Финансы
          </button>
        </div>
      </header>

      {/* Основной контент */}
      <main className="relative z-10 max-w-6xl mx-auto">
        
        {/* ВКЛАДКА 1: ДАШБОРД */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Квесты */}
            <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                  <Zap className="w-5 h-5 text-orange-500" /> Ежедневные испытания
                </h2>

                {isBdayToday ? (
                  <div className="py-8 text-center bg-red-950/30 border border-amber-500/40 rounded-xl p-4">
                    <p className="text-amber-400 font-bold text-base mb-1">🎉 Праздничный день!</p>
                    <p className="text-xs text-red-200">Сегодня {bdayName}! Все ежедневные квесты отменены — отдыхай и наслаждайся моментом! 🍰</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quests.map(q => (
                      <div key={q.id} className={`flex items-center justify-between p-3 rounded-xl border transition ${q.completed ? 'bg-red-950/20 border-white/20 opacity-50' : 'bg-black/50 border-white/20 hover:border-white/50'}`}>
                        <span className={`text-sm ${q.completed ? 'line-through text-zinc-500' : 'text-red-100'}`}>{q.text}</span>
                        {!q.completed ? (
                          <button 
                            onClick={() => completeQuest(q.id, q.xp)}
                            className="text-xs bg-red-600/20 text-red-300 px-3 py-1.5 rounded-lg border border-white/40 hover:bg-red-600 hover:text-white transition flex items-center gap-1 cursor-pointer font-medium shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                          >
                            +{q.xp} XP
                          </button>
                        ) : (
                          <CheckCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
           {/* Быстрые ссылки (Сетка в 2 колонки, выровненные по верху) */}
            <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-5 rounded-2xl shadow-xl flex flex-col justify-start">
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-red-500">
                  <BookOpen className="w-5 h-5 text-orange-500" /> Быстрые ссылки
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Dev & Tools</span>
              </div>

              {/* Сетка в 2 колонки, закрепленная вверху с вертикальным скроллом */}
              <div className="grid grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">GitHub</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://figma.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">Figma</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://stitch.withgoogle.com" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">Stitch</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://akspic.ru/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">akspic</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://www.typingclub.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">TypingClub</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://onepiecedl.com/episode-36" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">Van-Pis</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://tv.kinogo.mu/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">kinogo</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

                <a 
                  href="https://www.youtube.com/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-3 bg-black/50 border border-white/20 rounded-xl text-xs font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group shadow-sm hover:scale-[1.02]"
                >
                  <span className="text-red-200 group-hover:text-white font-semibold truncate">YouTube</span>
                  <ChevronRight className="w-3.5 h-3.5 text-red-600/50 group-hover:text-white" />
                </a>

              </div>
            </div>

            {/* Блок qw: Живые данные погоды, валют и цитат */}
            <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-5 rounded-2xl shadow-xl flex flex-col gap-4 text-white w-full">
              
              {/* 1. Погода и Валюта */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/10">
                {/* Погода в Уральске */}
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10">
                  <span className="text-2xl">⛅</span>
                  <div>
                    <div className="text-xs text-zinc-400">Уральск</div>
                    <div className="text-sm font-bold">{weather.temp}°C, {weather.desc}</div>
                  </div>
                </div>

                {/* Курсы валют */}
                <div className="flex flex-col justify-center bg-black/40 p-3 rounded-xl border border-white/10 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">USD/KZT:</span>
                    <span className="font-semibold">{rates.usd}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-zinc-400">RUB/KZT:</span>
                    <span className="font-semibold">{rates.rub}</span>
                  </div>
                </div>
              </div>

              {/* 2. Код & Мысль дня */}
              <div className="flex flex-col gap-2">  
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">Цитата Дня</span>
                    <button 
                      onClick={() => setQuoteIndex((prev) => (prev + 1) % quotesList.length)}
                      className="text-[10px] bg-red-600/25 hover:bg-red-600 text-red-200 hover:text-white px-2 py-0.5 rounded border border-white/20 transition cursor-pointer font-mono"
                    >
                      Следующая ↻
                    </button>
                  </div>
                  <p className="text-red-100 font-medium leading-relaxed italic min-h-[40px] flex items-center">
                    {quotesList[quoteIndex]}
                  </p>
                </div>
              </div>

              {/* 3. Обратный отсчет (ДР и Лето) */}
              <div className="flex flex-col gap-2 mt-1">
                {/* Виджет ДР */}
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">🎉 {bdayName}</span>
                    <button 
                      onClick={() => setIsEditingBday(!isEditingBday)}
                      className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      {isEditingBday ? 'Сохранить' : 'Изменить'}
                    </button>
                  </div>

                  {isEditingBday ? (
                    <div className="flex flex-col gap-1.5 mt-2">
                      <input 
                        type="text" 
                        value={bdayName} 
                        onChange={(e) => setBdayName(e.target.value)}
                        placeholder="Чье ДР (например, ДР Костяна)"
                        className="bg-zinc-900 border border-white/20 rounded px-2 py-1 text-xs text-white"
                      />
                      <input 
                        type="text" 
                        value={bdayDate} 
                        onChange={(e) => setBdayDate(e.target.value)}
                        placeholder="Формат: ММ-ДД (например, 05-15)"
                        className="bg-zinc-900 border border-white/20 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      {isBdayToday ? (
                        <div className="text-xs font-bold text-amber-400 animate-pulse mt-0.5">
                          🎁 Сегодня праздничный день! Отдыхай! 🥳
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-red-100 mt-0.5">
                          Осталось <span className="text-orange-400 font-bold">{daysToBday}</span> дней
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Виджет Лето */}
                <div className="p-3 bg-black/40 rounded-xl border border-white/10 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">☀️ До лета (1 июня)</span>
                    <div className="text-xs font-medium text-red-100 mt-0.5">
                      Осталось <span className="text-amber-400 font-bold">{daysToSummer}</span> дней
                    </div>
                  </div>
                  <span className="text-lg">🌴</span>
                </div>
              </div>

            </div>
            </div>

          
        )}

        {/* ВКЛАДКА 2: ДРЕВО */}
        {activeTab === 'skills' && (
          <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/20">
              <div>
                <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500 fill-orange-500" /> Древо целей и задач
                </h2>
                <p className="text-xs text-red-300/60 mt-1">Создавайте собственные ветки и записывайте задачи самостоятельно</p>
              </div>

              <form onSubmit={addBranch} className="flex gap-2 w-full md:w-auto">
                <input 
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Название новой ветки..."
                  className="bg-black/60 border border-white/30 rounded-xl px-3 py-2 text-sm text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500"
                />
                <button type="submit" className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                  + Ветка
                </button>
              </form>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-white/20 mb-6 flex flex-col md:flex-row gap-3 items-center">
              <select 
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-zinc-900 border border-white/30 rounded-xl px-3 py-2.5 text-sm text-red-200 focus:outline-none focus:border-red-500 w-full md:w-64 cursor-pointer"
              >
                {skillTree.map(b => (
                  <option key={b.id} value={b.id}>{b.branchName}</option>
                ))}
              </select>

              <input 
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Введите вашу личную задачу..."
                className="bg-black/60 border border-white/30 rounded-xl px-4 py-2.5 text-sm text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 flex-1 w-full"
              />

              <button 
                onClick={(e) => addTaskToBranch(selectedBranchId, e)}
                className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-500 transition cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.5)] w-full md:w-auto"
              >
                Добавить задачу
              </button>
            </div>

            <div className="space-y-6">
              {skillTree.map((branch) => (
                <div key={branch.id} className="p-5 bg-zinc-900/40 border border-white/20 rounded-xl relative group/branch transition-all duration-200 hover:bg-red-600 hover:border-red-600">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg group-hover/branch:text-white">
                      <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
                      {branch.branchName}
                    </h3>
                    
                    <button 
                      onClick={() => setSkillTree(skillTree.filter(b => b.id !== branch.id))}
                      className="text-white hover:text-white transition opacity-0 group-hover/branch:opacity-100 cursor-pointer p-1.5 flex items-center gap-1 text-xs bg-black/60 rounded-lg border border-white/40 hover:bg-black/80"
                      title="Удалить ветку"
                    >
                      <Trash2 className="w-4 h-4" /> Удалить ветку
                    </button>
                  </div>

                  <div className="space-y-3">
                    {branch.tasks.length === 0 ? (
                      <p className="text-xs text-white/90 italic pl-5 group-hover/branch:text-white">В этой ветке пока нет задач. Добавьте первую сверху!</p>
                    ) : (
                      branch.tasks.map(task => (
                        <div key={task.id} className="p-3.5 bg-black/60 border border-white/20 rounded-xl flex justify-between items-center group hover:border-white/50 transition">
                          <span className="text-sm text-red-100 font-medium">{task.title}</span>
                          <button 
                            onClick={() => removeTask(branch.id, task.id)}
                            className="text-white/70 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer p-1 bg-black/40 rounded hover:bg-black/60"
                            title="Удалить задачу"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 3: ДНЕВНИК */}
        {activeTab === 'diary' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-6 rounded-2xl shadow-xl h-fit">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-500">
                <BookText className="w-6 h-6 text-orange-500" /> Новая запись
              </h2>
              <form onSubmit={addDiaryEntry} className="space-y-4">
                <textarea 
                  value={newDiaryText}
                  onChange={(e) => setNewDiaryText(e.target.value)}
                  placeholder="Запишите сюда свои мысли, итоги дня или планы..."
                  rows="7"
                  className="w-full bg-black/80 border border-white/30 rounded-xl p-4 text-sm text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 resize-none shadow-inner"
                ></textarea>
                <button 
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition cursor-pointer shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                >
                  Опубликовать в дневник
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-zinc-950/90 backdrop-blur-md border border-white/30 p-8 rounded-2xl shadow-xl min-h-[500px]">
              <h2 className="text-2xl font-bold mb-6 text-red-500 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" /> Личный архив мыслей
              </h2>

              {diaryEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-white/20 rounded-2xl p-6">
                  <BookText className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500 font-medium">Ваш дневник пока пуст.</p>
                  <p className="text-xs text-zinc-600 mt-1">Напишите свою первую мысль в форме слева.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {diaryEntries.map(entry => (
                    <div key={entry.id} className="p-6 bg-black/60 border border-white/30 rounded-2xl relative group hover:border-red-500 transition shadow-lg">
                      <span className="text-xs text-orange-400 font-mono mb-2 block tracking-wider uppercase">{entry.date}</span>
                      <p className="text-base text-red-50 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                      <button 
                        onClick={() => setDiaryEntries(diaryEntries.filter(item => item.id !== entry.id))}
                        className="absolute top-5 right-5 text-zinc-600 hover:text-red-500 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Удалить запись"
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
{/* ВКЛАДКА 4: ФИНАНСЫ И МЕНЮ ВЫПИСОК */}
        {activeTab === 'finance' && (
          <div className="max-w-xl mx-auto bg-zinc-950/90 backdrop-blur-md border border-white/30 p-8 rounded-2xl shadow-xl flex flex-col gap-6">
            <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
              💳 Финансы
            </h2>

            {/* Главный блок: Чистый общий баланс */}
            <div className="p-6 bg-black/70 border border-white/20 rounded-2xl flex flex-col items-center justify-center shadow-inner">
              <span className="text-xs text-zinc-400 uppercase font-mono tracking-wider mb-1">Общий баланс</span>
              <span className={`text-3xl font-extrabold font-mono ${total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {total > 0 ? `+${total}` : total} ₸
              </span>
            </div>

            {/* Кнопки меню для просмотра выписок */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-zinc-400 font-mono uppercase">Выписки и аналитика:</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button 
                  onClick={() => setActiveReport(activeReport === 'week' ? 'none' : 'week')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${activeReport === 'week' ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-black/40 border-white/20 text-red-200 hover:border-white/50'}`}
                >
                  За неделю
                </button>
                <button 
                  onClick={() => setActiveReport(activeReport === 'month' ? 'none' : 'month')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${activeReport === 'month' ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-black/40 border-white/20 text-red-200 hover:border-white/50'}`}
                >
                  За месяц
                </button>
                <button 
                  onClick={() => setActiveReport(activeReport === 'year' ? 'none' : 'year')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${activeReport === 'year' ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-black/40 border-white/20 text-red-200 hover:border-white/50'}`}
                >
                  За год
                </button>
                <button 
                  onClick={() => setActiveReport(activeReport === 'day' ? 'none' : 'day')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition cursor-pointer ${activeReport === 'day' ? 'bg-red-600 border-red-500 text-white font-bold' : 'bg-black/40 border-white/20 text-red-200 hover:border-white/50'}`}
                >
                  По дням
                </button>
              </div>

              {/* Выпадающий блок с результатами выбранной выписки */}
              {activeReport !== 'none' && (
                <div className="p-4 bg-black/80 border border-red-500/40 rounded-xl mt-2 flex justify-between items-center animate-fadeIn">
                  <span className="text-xs text-zinc-300 font-mono">
                    {activeReport === 'week' && 'Трата/доход за последние 7 дней:'}
                    {activeReport === 'month' && 'Трата/доход за текущий месяц:'}
                    {activeReport === 'year' && 'Трата/доход за текущий год:'}
                    {activeReport === 'day' && `Баланс за ${selectedDate}:`}
                  </span>
                  <span className={`text-sm font-bold font-mono ${
                    (activeReport === 'week' ? weekTotal : activeReport === 'month' ? monthTotal : activeReport === 'year' ? yearTotal : dayTotal) >= 0 
                    ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {(activeReport === 'week' ? weekTotal : activeReport === 'month' ? monthTotal : activeReport === 'year' ? yearTotal : dayTotal) > 0 ? '+' : ''}
                    {activeReport === 'week' ? weekTotal : activeReport === 'month' ? monthTotal : activeReport === 'year' ? yearTotal : dayTotal} ₸
                  </span>
                </div>
              )}

              {/* Если выбран режим «По дням», показываем календарь */}
              {activeReport === 'day' && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-black/80 border border-white/30 rounded-xl px-4 py-2 text-xs text-red-100 focus:outline-none focus:border-red-500 font-mono cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Форма добавления транзакции */}
            <form onSubmit={addMoney} className="flex gap-2 mt-2">
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Сумма (например, 2000 или -500)"
                className="flex-1 bg-black/80 border border-white/30 rounded-xl px-4 py-2.5 text-sm text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 font-mono"
              />
              <button 
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.5)]"
              >
                + Записать
              </button>
            </form>

            {/* Общая история всех транзакций */}
            <div className="flex flex-col gap-2.5 max-h-[240px] overflow-y-auto pr-1">
              <div className="text-xs text-orange-400 font-mono uppercase tracking-wider mb-1">
                Все операции:
              </div>
              
              {allExpenses.length === 0 ? (
                <p className="text-xs text-zinc-500 italic text-center py-4">История транзакций пуста.</p>
              ) : (
                allExpenses.map((item) => {
                  const itemAmount = typeof item === 'object' ? item.amount : item;
                  const itemDate = typeof item === 'object' ? item.date : 'Без даты';
                  const itemId = typeof item === 'object' ? item.id : item;
                  return (
                    <div key={itemId} className="p-3 bg-black/50 border border-white/20 rounded-xl flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className={`font-mono font-semibold text-sm ${itemAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {itemAmount > 0 ? `+${itemAmount}` : itemAmount} ₸
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">{itemDate}</span>
                      </div>
                      <button 
                        onClick={() => deleteMoney(itemId)}
                        className="text-zinc-500 hover:text-red-500 transition cursor-pointer p-1"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
