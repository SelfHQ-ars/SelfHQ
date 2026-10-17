import React, { useState } from 'react';

const ACC = 'selfhq_accounts'; // { [nick]: { salt, hash } }
const SES = 'selfhq_session'; // ник вошедшего

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha = async (salt, pw) => {
  if (!window.crypto?.subtle) throw new Error('Нужен https-адрес (на GitHub Pages он есть)');
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pw}`)));
};

export const getSessionNick = () => read(SES, '');
export const logout = () => {
  localStorage.removeItem(SES);
  window.location.reload();
};

const field =
  'w-full bg-[rgb(var(--c-black)/0.7)] border border-[rgb(var(--c-white)/0.18)] rounded-xl px-3 py-3 text-base text-[rgb(var(--c-red-100))] placeholder:text-[rgb(var(--c-zinc-600))] focus:outline-none focus:border-[rgb(var(--c-red-500))]';

export default function AuthGate({ children }) {
  const [nick, setNick] = useState(getSessionNick);
  const [mode, setMode] = useState(Object.keys(read(ACC, {})).length ? 'login' : 'register');
  const [form, setForm] = useState({ nick: '', pw: '', pw2: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (nick) return children;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const name = form.nick.trim();
    const accounts = read(ACC, {});
    const key = name.toLowerCase();
    setBusy(true);
    try {
      if (mode === 'register') {
        if (name.length < 2 || name.length > 20) throw new Error('Ник: от 2 до 20 символов');
        if (form.pw.length < 6) throw new Error('Пароль: минимум 6 символов');
        if (form.pw !== form.pw2) throw new Error('Пароли не совпадают');
        if (accounts[key]) throw new Error('Такой ник уже занят');
        const salt = crypto.getRandomValues(new Uint32Array(4)).join('-');
        accounts[key] = { nick: name, salt, hash: await sha(salt, form.pw) };
        localStorage.setItem(ACC, JSON.stringify(accounts));
        localStorage.setItem(SES, JSON.stringify(name));
        setNick(name);
      } else {
        const acc = accounts[key];
        if (!acc || (await sha(acc.salt, form.pw)) !== acc.hash) throw new Error('Неверный ник или пароль');
        localStorage.setItem(SES, JSON.stringify(acc.nick));
        setNick(acc.nick);
      }
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy(false);
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center p-4 bg-[rgb(var(--c-page))] text-[rgb(var(--c-red-50))] font-sans">
      <form onSubmit={submit} className="w-full max-w-sm bg-[rgb(var(--c-zinc-950)/0.9)] border border-[rgb(var(--c-white)/0.18)] rounded-2xl shadow-lg p-6 flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold text-center text-[rgb(var(--c-white))]">SelfHQ</h1>
        <p className="text-center text-xs text-[rgb(var(--c-white)/0.6)] font-medium tracking-widest uppercase mb-2">{mode === 'login' ? 'Вход' : 'Создать аккаунт'}</p>
        <input className={field} placeholder="Ник" autoComplete="username" value={form.nick} onChange={(e) => setForm({ ...form, nick: e.target.value })} />
        <input className={field} type="password" placeholder="Пароль" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.pw} onChange={(e) => setForm({ ...form, pw: e.target.value })} />
        {mode === 'register' && (
          <input className={field} type="password" placeholder="Повтори пароль" autoComplete="new-password" value={form.pw2} onChange={(e) => setForm({ ...form, pw2: e.target.value })} />
        )}
        {err && <p className="text-xs text-[rgb(var(--c-red-400))]">{err}</p>}
        <button disabled={busy} className="py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--c-red-600))] to-[rgb(var(--c-orange-600))] text-white font-bold cursor-pointer disabled:opacity-60">
          {mode === 'login' ? 'Войти' : 'Создать и войти'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} className="text-xs text-[rgb(var(--c-zinc-400))] hover:text-[rgb(var(--c-white))] underline cursor-pointer">
          {mode === 'login' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  );
}
