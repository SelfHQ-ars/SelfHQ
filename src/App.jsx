import React, { useState, useEffect } from 'react';
import { BookText, Trash2, Sparkles, Wallet, ImagePlus, X, LayoutGrid } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { card, input, grad, fitToDataUrl } from './kit';
import ProfileHeader from './ProfileHeader';
import Finance from './Finance';
import { useTheme } from './theme';
import Space from './Space';
import AuthGate, { getSessionNick, logout } from './AuthGate';

/* ---------- константы и хелперы ---------- */
const XP_PER_LEVEL = 500;

const TABS = [
  ['finance', 'Финансы', Wallet],
  ['diary', 'Дневник', BookText],
  ['space', 'Пространство', LayoutGrid]
];




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

        {activeTab === 'finance' && <Finance gainXp={gainXp} onPhoto={setLightbox} />}
        {activeTab === 'space' && <Space />}
      </main>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4 cursor-zoom-out" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Фото" className="max-w-full max-h-full rounded-xl border border-[rgb(var(--c-white)/0.18)] shadow-2xl" />
        </div>
      )}
    </div>
  );
}
