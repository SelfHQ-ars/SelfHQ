// Общие стили и хелперы для новых вкладок
export const card = 'bg-[rgb(var(--c-zinc-950)/0.9)] backdrop-blur-md border border-[rgb(var(--c-white)/0.3)] rounded-2xl shadow-xl';
export const input = 'bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.3)] rounded-xl px-3 py-2.5 text-base md:text-sm text-[rgb(var(--c-red-100))] placeholder:text-[rgb(var(--c-zinc-600))] focus:outline-none focus:border-[rgb(var(--c-red-500))]';
export const grad = 'bg-gradient-to-r from-[rgb(var(--c-red-600))] to-[rgb(var(--c-orange-600))] text-white font-bold';

// Фото: вписываем в max×max и сжимаем, чтобы влезло в localStorage
export const fitToDataUrl = (file, max = 900, q = 0.72) =>
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

const pad = (n) => String(n).padStart(2, '0');
// Локальная дата (а не UTC, как у toISOString) — иначе ночью в Казахстане дата «вчера»
export const localISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const money = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;