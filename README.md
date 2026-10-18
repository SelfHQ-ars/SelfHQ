# Подключение облака (Firebase) за 10 минут

Бесплатного тарифа Spark хватает для личного использования. Банковская карта не нужна.

## 1. Проект
1. Открой https://console.firebase.google.com → **Add project** → название `selfhq` (аналитику Google можно выключить).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
3. **Build → Realtime Database → Create database** → регион ближе к тебе (например `europe-west1`) → **Start in locked mode**.
4. Вкладка **Rules** → вставь содержимое файла `database.rules.json` из этой папки → **Publish**.
   Правила разрешают каждому пользователю читать и писать только свою ветку `users/<его uid>`.

## 2. Ключи в код
1. **Project settings (шестерёнка) → General → Your apps → значок `</>` (Web)** → зарегистрируй приложение.
2. Скопируй объект `firebaseConfig` в `src/firebaseConfig.js` (поля `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId`).
   Эти значения не секретные. Защищают данные правила базы.
3. **Authentication → Settings → Authorized domains → Add domain** → `твой-ник.github.io`.
4. По желанию: Google Cloud Console → APIs & Services → Credentials → твой Browser key → Application restrictions → HTTP referrers → `https://твой-ник.github.io/*` и `http://localhost:*`.

## 3. Пакет и запуск
```
npm install firebase
npm run dev
```
После деплоя на GitHub Pages ничего больше делать не нужно.

## Как это работает
- Вход по нику и паролю. Ник превращается в служебный адрес `…@selfhq.invalid` (письма не отправляются), поэтому **восстановления пароля нет**: забыл пароль, потерял аккаунт. Храни пароль в менеджере паролей.
- Данные лежат в `users/<uid>/data/<ключ>`. Устройство работает и без сети, всё досылается при появлении связи.
- Конфликты решает последняя правка по каждому разделу. При первом входе на устройстве, где уже есть свои данные, спросим, что оставить.
- Фото хранятся внутри данных. Лимит на один раздел около 9 МБ, при превышении индикатор покажет ошибку.
- Данные не шифруются сквозным шифрованием: владелец проекта Firebase технически может их видеть.
