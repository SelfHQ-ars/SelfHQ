// Чистая функция: решает, что отправить в облако, что забрать, а где нужен выбор пользователя.
// remote: { ключ: { v, t } }, meta: { ключ: время локального изменения }, isEmpty(raw) -> bool
export function planSync({ keys, remote, getLocal, meta, isEmpty }) {
  const push = [];
  const pull = [];
  const conflicts = [];
  const same = [];
  for (const key of keys) {
    const r = remote[key];
    const raw = getLocal(key);
    const hasLocal = raw !== null && raw !== undefined && !isEmpty(raw);
    const hasRemote = Boolean(r) && typeof r.v === 'string' && !isEmpty(r.v);
    if (!hasLocal && !hasRemote) continue;
    if (hasLocal && !hasRemote) push.push(key);
    else if (!hasLocal && hasRemote) pull.push(key);
    else if (r.v === raw) same.push(key);
    else {
      const lt = meta[key] || 0;
      if (lt === 0) conflicts.push(key); // у локальных данных нет метки времени — решает пользователь
      else if (lt > (r.t || 0)) push.push(key); // последняя правка выигрывает
      else pull.push(key);
    }
  }
  return { push, pull, conflicts, same };
}
