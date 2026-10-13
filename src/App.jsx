import React, { useState } from 'react';
import { Trophy, CheckCircle, Clock, Zap, BookOpen, Flame, BookText, Plus, Trash2, ChevronRight, Sparkles, Sword } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';

// Импортируем картинки прямо из папки public/src, чтобы сборщик Vite правильно привязал пути при деплое
import bgImg from '/bg.jpg';
import avatarImg from '/avatar.jpg';

export default function App() {
  // Живой блок qw (погода, валюта, IT-новости)
  const [weather, setWeather] = React.useState({ temp: '...', desc: 'загрузка...' });
  const [rates, setRates] = React.useState({ usd: '...', rub: '...' });
  const [news, setNews] = React.useState([
    { title: 'Загрузка свежих IT-новостей...', source: 'Dev.to', url: '#' }
  ]);

  React.useEffect(() => {
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
  const [xp, setXp] = useLocalStorage('selfhq_xp', 240);
  const [level, setLevel] = useLocalStorage('selfhq_level', 3);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'skills' | 'diary'

  // 1. Ежедневные квесты
  const [quests, setQuests] = useLocalStorage('selfhq_quests', [
    { id: 1, text: 'Успеть вовремя в колледж (не опоздать)', xp: 50, completed: false },
    { id: 2, text: 'Полноценная тренировка', xp: 70, completed: false },
    { id: 3, text: 'Убраться в комнате', xp: 40, completed: false },
    { id: 4, text: 'Протереть пыль в комнате', xp: 30, completed: false }
  ]);

  // 2. Древо задач (с возможностью добавлять свои)
  const [skillTree, setSkillTree] = useLocalStorage('selfhq_skilltree', [
    {
      id: 'branch-1',
      branchName: 'Путь воина (Колледж и Учеба)',
      tasks: [
        { id: 't1', title: 'Сдать все задания в срок', status: 'in-progress', desc: 'Основная цель на эту неделю' }
      ]
    }
  ]);

  const [newTaskText, setNewTaskText] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('branch-1');
  const [newBranchName, setNewBranchName] = useState('');

  // 3. Дневник (пустой, только ваши мысли)
  const [diaryEntries, setDiaryEntries] = useLocalStorage('selfhq_diary', []);
  const [newDiaryText, setNewDiaryText] = useState('');

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

  // Добавление своей задачи в Древо
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
          backgroundImage: `linear-gradient(rgba(2, 2, 2, 0.8), rgba(3, 3, 3, 0.85)), url('/bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat'
        }}
      >
        
        {/* Декоративный фон в стиле хаори Танджиро (клетка) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0c0c_1px,transparent_1px),linear-gradient(to_bottom,#1f0c0c_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>

        {/* Шапка / Навигация */}
        <header className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-zinc-950/80 backdrop-blur-md border-2 border-white/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.25)]">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-white via-zinc-300 to-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
    <img 
      src="/avatar.jpg" 
      alt="Avatar" 
      className="w-full h-full object-cover rounded-full border border-black"
    />
  </div>
            <div>
            <h1 className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-red-500 via-orange-500 to-amber-300 bg-clip-text text-transparent">SelfHQ</h1>
            <p className="text-xs text-white/80 font-mono tracking-widest uppercase">Путь </p>
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
            Дашборд
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
              </div>
            </div>

            {/* Быстрые ссылки */}
            <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-5 rounded-2xl shadow-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-500">
                <BookOpen className="w-5 h-5 text-orange-500" /> Быстрые ссылки
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="p-3.5 bg-black/50 border border-white/20 rounded-xl text-sm font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group">
                  <span className="text-red-200 group-hover:text-white font-semibold">GitHub</span>
                  <ChevronRight className="w-4 h-4 text-red-600/50 group-hover:text-white" />
                </a>
                <a href="https://figma.com" target="_blank" rel="noreferrer" className="p-3.5 bg-black/50 border border-white/20 rounded-xl text-sm font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group">
                  <span className="text-red-200 group-hover:text-white font-semibold">Figma</span>
                  <ChevronRight className="w-4 h-4 text-red-600/50 group-hover:text-white" />
                </a>
                <a href="https://stitch.withgoogle.com" target="_blank" rel="noreferrer" className="p-3.5 bg-black/50 border border-white/20 rounded-xl text-sm font-medium hover:border-red-500 hover:bg-red-600/10 transition flex items-center justify-between group">
                  <span className="text-red-200 group-hover:text-white font-semibold">Stitch</span>
                  <ChevronRight className="w-4 h-4 text-red-600/50 group-hover:text-white" />
                </a>
              </div>
            </div>

            {/* Блок qw: Живые данные погоды, валют и IT-новостей */}
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

  {/* 2. IT Новости */}
  <div className="flex flex-col gap-2.5">
    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
      💋 IT Сфера & Новости
    </h3>
    
    <div className="space-y-2 text-xs">
      {news.map((item, index) => (
        <a 
          key={index} 
          href={item.url} 
          target="_blank" 
          rel="noreferrer"
          className="block p-2.5 bg-black/40 rounded-xl border border-white/10 hover:border-white/30 transition cursor-pointer"
        >
          <span className="text-zinc-400 block text-[10px] mb-0.5">{item.source}</span>
          <p className="font-medium text-white line-clamp-1">{item.title}</p>
        </a>
      ))}
    </div>
  </div>

</div>

          </div>
        )}

        {/* ВКЛАДКА 2: ДРЕВО (Свои задачи и ветки) */}
        {activeTab === 'skills' && (
          <div className="bg-zinc-950/90 backdrop-blur-md border border-white/30 p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/20">
              <div>
                <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500 fill-orange-500" /> Древо целей и задач
                </h2>
                <p className="text-xs text-red-300/60 mt-1">Создавайте собственные ветки и записывайте задачи самостоятельно</p>
              </div>

              {/* Форма добавления новой ветки */}
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

            {/* Форма добавления задачи в выбранную ветку */}
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

            {/* Вывод веток и задач */}
            <div className="space-y-6">
              {skillTree.map((branch) => (
                <div key={branch.id} className="p-5 bg-zinc-900/40 border border-white/20 rounded-xl relative group/branch transition-all duration-200 hover:bg-red-600 hover:border-red-600">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg group-hover/branch:text-white">
                      <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-600 to-orange-500 shadow-[0_0_10px_rgba(239,68,68,1)]"></span>
                      {branch.branchName}
                    </h3>
                    
                    {/* Кнопка удаления всей ветки */}
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

        {/* ВКЛАДКА 3: ДНЕВНИК (Увеличенный, без лишнего текста) */}
        {activeTab === 'diary' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Форма ввода записи */}
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

            {/* Список записей (сделан больше и просторнее) */}
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

      </main>
    </div>
  );
}