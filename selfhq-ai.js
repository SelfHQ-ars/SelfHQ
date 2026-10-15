// Cloudflare Worker — прокси между сайтом SelfHQ и API Anthropic.
// Ключ НЕ хранится в коде: он лежит в секрете ANTHROPIC_API_KEY (Settings → Variables and Secrets).
// Переменная ALLOWED_ORIGIN — адрес сайта без пути, например https://nick.github.io

const SYSTEM =
  'Ты ассистент личного дашборда SelfHQ. Отвечай по-русски, коротко и по делу. ' +
  'Помогай с кодом, учёбой, планированием дня и финансами. Не выдумывай факты.';

export default {
  async fetch(req, env) {
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin'
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST' || !allowed.includes(origin)) return json({ error: 'forbidden' }, 403);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'ключ не настроен' }, 500);

    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad request' }, 400);
    }

    // Только последние 12 сообщений, каждое до 4000 символов; диалог должен начинаться с пользователя
    let messages = (Array.isArray(body.messages) ? body.messages : [])
      .slice(-12)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 4000) }))
      .filter((m) => m.content);
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'bad request' }, 400);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: 600, system: SYSTEM, messages })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: data?.error?.message || 'ошибка API' }, 502);
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    return json({ text });
  }
};
