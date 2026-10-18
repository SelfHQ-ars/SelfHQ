// Сюда вставляются настройки твоего проекта Firebase (Project settings → General → Your apps → Web app → Config).
// Это НЕ секрет: защита данных держится на правилах базы (см. firebase-setup/database.rules.json).
// Пока apiKey пустой, сайт работает как раньше: вход только на этом устройстве, без облака.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '', // например https://selfhq-xxxxx-default-rtdb.europe-west1.firebasedatabase.app
  projectId: '',
  appId: ''
};
