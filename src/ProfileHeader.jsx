import React, { useState } from 'react';
import { Trophy, ImagePlus, LogOut, X, Palette } from 'lucide-react';
import { PRESETS, swatch } from './theme';

// Обрезка по центру (cover) + сжатие, чтобы картинка поместилась в localStorage
export const resizeToDataUrl = (file, w, h, q = 0.8) =>
  new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('not image'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const k = Math.max(w / img.width, h / img.height);
      const sw = w / k;
      const sh = h / k;
      c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('load'));
    };
    img.src = url;
  });

// Баннер по умолчанию собран из цветов темы, поэтому меняется вместе с акцентом
const DEFAULT_BANNER =
  'radial-gradient(ellipse 60% 120% at 15% 130%, rgb(var(--c-orange-600) / .55), transparent 60%), radial-gradient(ellipse 50% 110% at 95% -20%, rgb(var(--c-red-600) / .45), transparent 60%), repeating-linear-gradient(45deg, rgb(var(--c-white) / .02) 0 2px, transparent 2px 7px), linear-gradient(135deg, rgb(var(--c-red-950)), rgb(var(--c-black)) 60%, rgb(var(--c-red-900) / .6))';

export default function ProfileHeader({
  nick, tagline, setTagline, avatar, setAvatar, onAvatar, defaultAvatar,
  banner, setBanner, level, xp, xpMax, onLogout, theme, onTheme
}) {
  const [editTag, setEditTag] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const onBanner = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBanner(await resizeToDataUrl(file, 1200, 300, 0.8));
    } catch {
      alert('Не удалось установить баннер (возможно, не хватает места в браузере)');
    }
  };

  return (
    <header className="relative z-10 max-w-6xl mx-auto mb-3 md:mb-4 overflow-hidden bg-[rgb(var(--c-zinc-950)/0.85)] backdrop-blur-md border border-[rgb(var(--c-white)/0.15)] rounded-2xl shadow-lg">
      {/* Баннер */}
      <div
        className="group/banner relative h-32 md:h-36 bg-cover bg-center"
        style={banner ? { backgroundImage: `url(${banner})` } : { background: DEFAULT_BANNER }}
      >
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[rgb(var(--c-zinc-950)/0.7)] to-transparent pointer-events-none" />
        {onLogout && (
          <button onClick={onLogout} className="absolute top-2 left-2 flex items-center gap-1.5 text-xs text-white bg-black/60 hover:bg-black/80 border border-white/30 rounded-lg px-2.5 py-1.5 cursor-pointer" aria-label="Выйти">
            <LogOut className="w-3.5 h-3.5" /> Выйти
          </button>
        )}
        {/* На тач-экранах hover нет — кнопка видна всегда */}
        <div className="absolute top-2 right-2 flex gap-1.5 md:opacity-0 md:group-hover/banner:opacity-100 md:focus-within:opacity-100 transition">
          <button type="button" onClick={() => setThemeOpen(!themeOpen)} aria-expanded={themeOpen} className="p-1.5 text-sm leading-none text-white bg-black/60 hover:bg-black/80 border border-white/30 rounded-lg cursor-pointer" aria-label="Тема и цвет" title="Тема и акцентный цвет (клавиша T — светлая/тёмная)"><Palette className="w-4 h-4" /></button>
          <label className="flex items-center gap-1.5 text-xs text-white bg-black/60 hover:bg-[rgb(var(--c-red-600))] border border-white/30 rounded-lg px-2.5 py-1.5 cursor-pointer transition">
            <ImagePlus className="w-3.5 h-3.5" /> Баннер
            <input type="file" accept="image/*" onChange={onBanner} className="hidden" />
          </label>
          {banner && (
            <button onClick={() => setBanner('')} className="p-1.5 text-white bg-black/60 hover:bg-black/80 border border-white/30 rounded-lg cursor-pointer" aria-label="Убрать баннер" title="Вернуть стандартный">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {themeOpen && (
          <div className="absolute z-20 top-12 right-2 flex items-center gap-2 p-2 rounded-xl bg-[rgb(var(--c-zinc-950))] border border-[rgb(var(--c-white)/0.18)] shadow-xl">
            {[['dark', '☾', 'Тёмная тема'], ['light', '☀', 'Светлая тема']].map(([m, icon, label]) => (
              <button key={m} type="button" onClick={() => onTheme({ mode: m })} aria-pressed={theme.mode === m} aria-label={label} title={label} className={`w-8 h-8 rounded-lg border text-sm cursor-pointer ${theme.mode === m ? 'bg-[rgb(var(--c-red-600))] border-[rgb(var(--c-red-500))] text-white' : 'bg-[rgb(var(--c-black)/0.4)] border-[rgb(var(--c-white)/0.12)] text-[rgb(var(--c-zinc-300))]'}`}>{icon}</button>
            ))}
            <span className="w-px h-6 bg-[rgb(var(--c-white)/0.2)]" />
            {Object.keys(PRESETS).map((id) => (
              <button key={id} type="button" onClick={() => onTheme({ accent: id })} aria-pressed={theme.accent === id} aria-label={`Акцент: ${PRESETS[id].name}`} title={PRESETS[id].name} className={`w-6 h-6 rounded-full cursor-pointer border-2 transition ${theme.accent === id ? 'border-[rgb(var(--c-white))] scale-110' : 'border-transparent'}`} style={{ background: swatch(id) }} />
            ))}
          </div>
        )}
      </div>

      {/* Профиль */}
      <div className="px-4 sm:px-6 pb-4 flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
        <div className="flex items-end gap-3 sm:gap-4 min-w-0">
          <label className="relative group shrink-0 -mt-10 sm:-mt-12 w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0.5 bg-gradient-to-tr from-[rgb(var(--c-white))] via-[rgb(var(--c-zinc-300))] to-[rgb(var(--c-zinc-500))] ring-4 ring-[rgb(var(--c-zinc-950))] shadow-md cursor-pointer" title="Сменить аватар">
            <img src={avatar || defaultAvatar} alt="Аватар" className="w-full h-full object-cover rounded-full border border-[rgb(var(--c-black))]" />
            <span className="absolute inset-0 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition">✎</span>
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[rgb(var(--c-red-600))] text-white text-[10px] grid place-items-center border border-[rgb(var(--c-black))] md:hidden">✎</span>
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>

          <div className="min-w-0 pb-1">
            <h1 className="font-extrabold tracking-wide text-2xl sm:text-3xl text-[rgb(var(--c-white))] truncate">{nick || 'SelfHQ'}</h1>
            {editTag ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tagline.trim()) setTagline('Личный штаб');
                  setEditTag(false);
                }}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center gap-1.5">
                  <input autoFocus value={tagline} maxLength={30} onChange={(e) => setTagline(e.target.value)} className="bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.18)] rounded px-2 py-1 text-base md:text-sm text-[rgb(var(--c-white))] w-40 sm:w-44" />
                  <button type="submit" className="text-xs px-2 py-1.5 rounded bg-[rgb(var(--c-red-600))] text-white cursor-pointer">OK</button>
                </div>
                {avatar && (
                  <button type="button" onClick={() => setAvatar('')} className="text-[11px] text-[rgb(var(--c-zinc-400))] hover:text-[rgb(var(--c-white))] underline text-left cursor-pointer">Вернуть стандартную аву</button>
                )}
              </form>
            ) : (
              <button onClick={() => setEditTag(true)} className="group flex items-center gap-1.5 cursor-pointer text-left" title="Изменить подпись">
                <span className="text-xs text-[rgb(var(--c-white)/0.8)] font-medium tracking-widest uppercase truncate">{tagline || 'Личный штаб'}</span>
                <span className="text-xs text-[rgb(var(--c-white)/0.4)] group-hover:text-[rgb(var(--c-white))]">✎</span>
              </button>
            )}
          </div>
        </div>

        <div className="md:ml-auto flex items-center gap-3 bg-[rgb(var(--c-black)/0.7)] px-3 py-2 rounded-xl border border-[rgb(var(--c-white)/0.18)] shadow-inner">
          <div className="flex items-center gap-1.5 text-[rgb(var(--c-white))] font-semibold text-sm whitespace-nowrap">
            <Trophy className="w-4 h-4 text-[rgb(var(--c-orange-500))]" /> Ранг {level}
          </div>
          <div className="flex-1 md:w-32 md:flex-none bg-[rgb(var(--c-zinc-900))] h-2.5 rounded-full overflow-hidden border border-[rgb(var(--c-white)/0.18)]">
            <div className="bg-gradient-to-r from-[rgb(var(--c-red-600))] via-[rgb(var(--c-orange-500))] to-[rgb(var(--c-amber-400))] h-full transition-all duration-500" style={{ width: `${(xp / xpMax) * 100}%` }} />
          </div>
          <span className="text-xs text-[rgb(var(--c-orange-300))] font-mono whitespace-nowrap">{xp}/{xpMax} XP</span>
        </div>
      </div>
    </header>
  );
}
