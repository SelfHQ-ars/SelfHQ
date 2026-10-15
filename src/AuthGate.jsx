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
  'w-full bg-black/70 border border-white/30 rounded-xl px-3 py-3 text-base text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500';

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
    <div className="min-h-[100dvh] grid place-items-center p-4 bg-[#020202] text-red-50 font-sans">
      <form onSubmit={submit} className="w-full max-w-sm bg-zinc-950/90 border border-white/30 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.25)] p-6 flex flex-col gap-3">
        <h1 className="text-3xl font-extrabold text-center text-white drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]">SelfHQ</h1>
        <p className="text-center text-xs text-white/60 font-mono tracking-widest uppercase mb-2">{mode === 'login' ? 'Вход' : 'Создать аккаунт'}</p>
        <input className={field} placeholder="Ник" autoComplete="username" value={form.nick} onChange={(e) => setForm({ ...form, nick: e.target.value })} />
        <input className={field} type="password" placeholder="Пароль" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.pw} onChange={(e) => setForm({ ...form, pw: e.target.value })} />
        {mode === 'register' && (
          <input className={field} type="password" placeholder="Повтори пароль" autoComplete="new-password" value={form.pw2} onChange={(e) => setForm({ ...form, pw2: e.target.value })} />
        )}
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button disabled={busy} className="py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold cursor-pointer disabled:opacity-60">
          {mode === 'login' ? 'Войти' : 'Создать и войти'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }} className="text-xs text-zinc-400 hover:text-white underline cursor-pointer">
          {mode === 'login' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  );
}
