import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Trash2 } from 'lucide-react';
import { useLocalStorage } from './hooks/useLocalStorage';

// Адрес Worker берётся из .env.production: VITE_AI_URL=https://selfhq-ai.xxx.workers.dev (это не секрет)
const AI_URL = import.meta.env.VITE_AI_URL;

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useLocalStorage('selfhq_ai_chat', []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, open, busy]);

  const send = async (e) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: 'user', content: q }].slice(-20);
    setMsgs(next);
    setText('');
    setBusy(true);
    try {
      if (!AI_URL) throw new Error('no-url');
      const r = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.filter((m) => !m.error).map(({ role, content }) => ({ role, content })) })
      });
      const d = await r.json();
      if (!r.ok || !d.text) throw new Error(d.error || 'fail');
      setMsgs([...next, { role: 'assistant', content: d.text }]);
    } catch (ex) {
      const why = ex.message === 'no-url' ? 'Ассистент не подключён: не задан VITE_AI_URL' : navigator.onLine ? 'Не удалось получить ответ, попробуй ещё раз' : 'Нет интернета';
      setMsgs([...next, { role: 'assistant', content: `⚠️ ${why}`, error: true }]);
    }
    setBusy(false);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Открыть ассистента"
          className="fixed z-40 bottom-20 md:bottom-6 right-3 md:right-6 w-12 h-12 rounded-full grid place-items-center bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] cursor-pointer"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div className="fixed z-40 bottom-20 md:bottom-6 right-3 md:right-6 w-[calc(100vw-1.5rem)] sm:w-96 h-[70dvh] max-h-[560px] flex flex-col bg-zinc-950/95 backdrop-blur-md border border-white/30 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
            <span className="flex items-center gap-2 font-semibold text-red-500"><Bot className="w-5 h-5 text-orange-500" /> Ассистент</span>
            <div className="flex items-center gap-1">
              {msgs.length > 0 && (
                <button onClick={() => window.confirm('Очистить чат?') && setMsgs([])} className="p-2 text-zinc-400 hover:text-red-500 cursor-pointer" aria-label="Очистить чат"><Trash2 className="w-4 h-4" /></button>
              )}
              <button onClick={() => setOpen(false)} className="p-2 text-zinc-400 hover:text-white cursor-pointer" aria-label="Закрыть"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
            {msgs.length === 0 && <p className="text-xs text-zinc-500 italic text-center mt-6">Спроси что угодно: код, учёба, план на день.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${m.role === 'user' ? 'self-end bg-red-600/30 border border-red-500/40 text-red-50' : 'self-start bg-black/60 border border-white/20 text-zinc-200'}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="self-start text-xs text-zinc-500 animate-pulse">Думаю…</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 p-3 border-t border-white/20">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение" maxLength={2000} className="flex-1 min-w-0 bg-black/70 border border-white/30 rounded-xl px-3 py-2.5 text-base md:text-sm text-red-100 placeholder-zinc-600 focus:outline-none focus:border-red-500" />
            <button type="submit" disabled={busy} className="px-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white cursor-pointer disabled:opacity-50" aria-label="Отправить"><Send className="w-4 h-4" /></button>
          </form>
        </div>
      )}
    </>
  );
}
