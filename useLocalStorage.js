import { useState, useEffect, useCallback } from 'react';
import { readKey, writeKey, subscribe } from '../store';

// useState, значение которого хранится в localStorage и синхронизируется
// между вкладками и с облаком. Использование то же: const [value, setValue] = useLocalStorage(key, initial)
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => readKey(key, initial));

  useEffect(() => {
    setValue(readKey(key, initial));
    return subscribe(key, (v) => setValue(v === undefined ? initial : v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next) => {
      const current = readKey(key, initial);
      writeKey(key, typeof next === 'function' ? next(current) : next); // бросает, если память браузера заполнена
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, set];
}
