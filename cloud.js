import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

export const cloudEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);
const app = cloudEnabled ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getDatabase(app) : null;

// Firebase входит по e-mail, а у нас ник. Делаем из ника служебный адрес (письма на него не отправляются).
// Ник приводим к нижнему регистру и берём SHA-256, чтобы кириллица и пробелы не ломали адрес.
const norm = (nick) => nick.trim().toLowerCase().normalize('NFC');
export async function emailFor(nick) {
  if (!globalThis.crypto?.subtle) throw new Error('Для входа нужен https-адрес (на GitHub Pages он есть)');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`selfhq:${norm(nick)}`));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `u${hex.slice(0, 40)}@selfhq.invalid`;
}

let nickNow = '';
export const getCloudNick = () => nickNow;
export const setCloudNick = (n) => {
  nickNow = n || '';
};

export async function signUp(nick, password) {
  const cred = await createUserWithEmailAndPassword(auth, await emailFor(nick), password);
  setCloudNick(nick.trim());
  try {
    await updateProfile(cred.user, { displayName: nick.trim() });
  } catch {
    /* ник не сохранился в профиле — покажем введённый */
  }
  return cred.user;
}
export async function signIn(nick, password) {
  const cred = await signInWithEmailAndPassword(auth, await emailFor(nick), password);
  return cred.user;
}
export const signOutCloud = () => signOut(auth);
export const onUser = (cb) => onAuthStateChanged(auth, cb);

export function authMessage(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'Такой ник уже занят';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found') || code.includes('invalid-login')) return 'Неверный ник или пароль';
  if (code.includes('weak-password')) return 'Пароль слишком простой: минимум 6 символов';
  if (code.includes('network-request-failed')) return 'Нет соединения с интернетом';
  if (code.includes('too-many-requests')) return 'Слишком много попыток, подожди несколько минут';
  if (code.includes('operation-not-allowed')) return 'В Firebase не включён вход по паролю (Authentication → Sign-in method → Email/Password)';
  if (code.includes('api-key')) return 'Неверные настройки Firebase в firebaseConfig.js';
  return err?.message || 'Не удалось выполнить вход';
}
