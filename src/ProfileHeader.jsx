import React, { useState } from 'react';
import { Trophy, ImagePlus, LogOut, X } from 'lucide-react';

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

const DEFAULT_BANNER =
  'radial-gradient(ellipse 60% 120% at 15% 130%, rgba(234,88,12,.55), transparent 60%), radial-gradient(ellipse 50% 110% at 95% -20%, rgba(220,38,38,.45), transparent 60%), repeating-linear-gradient(45deg, rgba(255,255,255,.02) 0 2px, transparent 2px 7px), linear-gradient(135deg, #1a0505, #0a0a0a 60%, #1f0c0c)';

export default function ProfileHeader({
  nick, tagline, setTagline, avatar, setAvatar, onAvatar, defaultAvatar,
  banner, setBanner, level, xp, xpMax, onLogout
}) {
  const [editTag, setEditTag] = useState(false);

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
    <header className="relative z-10 max-w-6xl mx-auto mb-4 md:mb-6 overflow-hidden bg-zinc-950/85 backdrop-blur-md border-2 border-white/40 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.25)]">
      {/* Баннер */}
      <div
        className="group/banner relative h-32 md:h-36 bg-cover bg-center"
        style={banner ? { backgroundImage: `url(${banner})` } : { background: DEFAULT_BANNER }}
      >
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/70 to-transparent pointer-events-none" />
        {onLogout && (
          <button onClick={onLogout} className="absolute top-2 left-2 flex items-center gap-1.5 text-xs text-white bg-black/60 hover:bg-black/80 border border-white/30 rounded-lg px-2.5 py-1.5 cursor-pointer" aria-label="Выйти">
            <LogOut className="w-3.5 h-3.5" /> Выйти
          </button>
        )}
        {/* На тач-экранах hover нет — кнопка видна всегда */}
        <div className="absolute top-2 right-2 flex gap-1.5 md:opacity-0 md:group-hover/banner:opacity-100 md:focus-within:opacity-100 transition">
          <label className="flex items-center gap-1.5 text-xs text-white bg-black/60 hover:bg-red-600 border border-white/30 rounded-lg px-2.5 py-1.5 cursor-pointer transition">
            <ImagePlus className="w-3.5 h-3.5" /> Баннер
            <input type="file" accept="image/*" onChange={onBanner} className="hidden" />
          </label>
          {banner && (
            <button onClick={() => setBanner('')} className="p-1.5 text-white bg-black/60 hover:bg-black/80 border border-white/30 rounded-lg cursor-pointer" aria-label="Убрать баннер" title="Вернуть стандартный">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Профиль */}
      <div className="px-4 sm:px-6 pb-4 flex flex-col md:flex-row md:items-end gap-3 md:gap-6">
        <div className="flex items-end gap-3 sm:gap-4 min-w-0">
          <label className="relative group shrink-0 -mt-10 sm:-mt-12 w-20 h-20 sm:w-24 sm:h-24 rounded-full p-0.5 bg-gradient-to-tr from-white via-zinc-300 to-zinc-500 ring-4 ring-zinc-950 shadow-[0_0_18px_rgba(255,255,255,0.35)] cursor-pointer" title="Сменить аватар">
            <img src={avatar || defaultAvatar} alt="Аватар" className="w-full h-full object-cover rounded-full border border-black" />
            <span className="absolute inset-0 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition">✎</span>
            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] grid place-items-center border border-black md:hidden">✎</span>
            <input type="file" accept="image/*" onChange={onAvatar} className="hidden" />
          </label>

          <div className="min-w-0 pb-1">
            <h1 className="font-extrabold tracking-wide text-2xl sm:text-3xl text-white truncate drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">{nick || 'SelfHQ'}</h1>
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
                  <input autoFocus value={tagline} maxLength={30} onChange={(e) => setTagline(e.target.value)} className="bg-black/70 border border-white/30 rounded px-2 py-1 text-base md:text-sm text-white w-40 sm:w-44" />
                  <button type="submit" className="text-xs px-2 py-1.5 rounded bg-red-600 text-white cursor-pointer">OK</button>
                </div>
                {avatar && (
                  <button type="button" onClick={() => setAvatar('')} className="text-[11px] text-zinc-400 hover:text-white underline text-left cursor-pointer">Вернуть стандартную аву</button>
                )}
              </form>
            ) : (
              <button onClick={() => setEditTag(true)} className="group flex items-center gap-1.5 cursor-pointer text-left" title="Изменить подпись">
                <span className="text-xs text-white/80 font-mono tracking-widest uppercase truncate">{tagline || 'Личный штаб'}</span>
                <span className="text-xs text-white/40 group-hover:text-white">✎</span>
              </button>
            )}
          </div>
        </div>

        <div className="md:ml-auto flex items-center gap-3 bg-black/70 px-3 py-2 rounded-xl border border-white/30 shadow-inner">
          <div className="flex items-center gap-1.5 text-white font-semibold text-sm whitespace-nowrap">
            <Trophy className="w-4 h-4 text-orange-500" /> Ранг {level}
          </div>
          <div className="flex-1 md:w-32 md:flex-none bg-zinc-900 h-2.5 rounded-full overflow-hidden border border-white/30">
            <div className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 h-full transition-all duration-500" style={{ width: `${(xp / xpMax) * 100}%` }} />
          </div>
          <span className="text-xs text-orange-300 font-mono whitespace-nowrap">{xp}/{xpMax} XP</span>
        </div>
      </div>
    </header>
  );
}
