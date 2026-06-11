🌐 **Другие языки:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Español](README_ES.md)

Мессенджер со сквозным шифрованием в стиле WeChat. Бессостоянный ECDH + XSalsa20-Poly1305 шифрование для каждого сообщения, видеозвонки в реальном времени, хранение файлов Cloudflare R2, поддержка нескольких языков и развёртывание iOS PWA.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20Mesh-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-Скачать-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-Скачать-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-Скачать-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-Скачать-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

---

<details>
<summary>📸 Скриншоты (нажмите для просмотра)</summary>


<img width=30% height=30% src="screenshot/ui1.jpg" alt="ui1">
<img width=30% height=30% src="screenshot/ui2.jpg" alt="ui2">
<img width=30% height=30% src="screenshot/ui3.jpg" alt="ui3">
<img width=30% height=30% src="screenshot/ui4.jpg" alt="ui4">
<img width=30% height=30% src="screenshot/ui5.jpg" alt="ui5">
<img width=30% height=30% src="screenshot/ui6.jpg" alt="ui6">
<img width=30% height=30% src="screenshot/ui7.jpg" alt="ui7">
<img width=30% height=30% src="screenshot/ui8.jpg" alt="ui8">
<img width=30% height=30% src="screenshot/ui9.jpg" alt="ui9">
<img width=30% height=30% src="screenshot/ui10.jpg" alt="ui10">
<img width=30% height=30% src="screenshot/ui11.jpg" alt="ui11">
<img width=30% height=30% src="screenshot/ui12.jpg" alt="ui12">
<img width=30% height=30% src="screenshot/ui13.jpg" alt="ui13">
<img width=30% height=30% src="screenshot/ui14.jpg" alt="ui14">
<img width=30% height=30% src="screenshot/ui15.jpg" alt="ui15">
<img width=30% height=30% src="screenshot/ui16.jpg" alt="ui16">
<img width=30% height=30% src="screenshot/ui17.jpg" alt="ui17">
<img width=30% height=30% src="screenshot/ui18.jpg" alt="ui18">

</details>

## Функции
| Функция | Описание |
|---------|----------|
| 🔐 Сквозное шифрование | Бессостоянный ECDH + XSalsa20-Poly1305 — эфемерные ключи для каждого сообщения, прямая секретность, верификация номера безопасности в стиле Signal |
| 🗝️ Сервер с нулевым знанием | Сервер хранит только зашифрованный текст; приватные ключи никогда не покидают устройство |
| 📹 Видео- и голосовые звонки | WebRTC P2P (1:1) + Mesh (групповые), Cloudflare TURN для обхода NAT |
| 🎙️ Изменение голоса | Эффекты голоса в реальном времени для голосовых сообщений, звонков 1:1 и групповых звонков — 3 режима (0.8x низкий / 1.0x обычный / 1.2x высокий), на основе Web Audio API |
| 👥 Групповой чат | До 2000 участников, сообщения в открытом виде (без шифрования), режим «Не беспокоить», управление участниками |
| 👫 Система друзей | Заявки в друзья требуют одобрения с сообщением до 512 символов; пользовательские никнеймы; группировка по нескольким тегам |
| ⏱️ Автоудаление сообщений | 5 уровней (никогда / 1 день / 3 дня / 1 неделя / 1 месяц), настраивается любой стороной в личных сообщениях, только владельцем в группах |
| 🔔 Push-уведомления | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS пятиканальная доставка — доступность пользователей даже в офлайне (поддержка нативного iOS + китайских Android без Google Services) |
| 🌐 Мультиязычность | Китайский, английский, японский, корейский, французский, немецкий, русский, испанский — автоопределение + ручное переключение |
| 📱 iOS — без корпоративного сертификата | PWA через Safari «На экран Домой», работает бессрочно без подписи Apple |
| 📱 Нативное Android-приложение | Доступно в [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), с поддержкой FCM push-уведомлений |
| 📱 Нативное iOS-приложение | Доступно в [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178), с поддержкой APNS push-уведомлений |
| 🖥️ Десктопный клиент Windows | Нативное настольное приложение для Windows, [скачать здесь](https://github.com/619dev/ppp-win/releases) |
| 🍎 Десктопный клиент Mac | Нативное настольное приложение для Mac, [скачать здесь](https://github.com/619dev/ppp-mac/releases) |
| 💬 Расширенные сообщения | Текст, изображения, видео, документы, голосовые сообщения, 200+ эмодзи, стикер-паки Telegram, отчёты о доставке, индикаторы набора текста |
| 📤 Загрузка файлов | До 500 МБ на файл, Cloudflare R2 или локальное хранилище, с анимацией прогресса |
| 🌐 Моменты | Социальная лента в стиле WeChat: текст + до 9 фото или 1 видео (≤ 10 мин), лайки, комментарии, видимость по тегам |
| 👤 Профиль пользователя | Страница контактного профиля с двусторонним управлением приватностью Моментов |
| 📰 Лента | Публичная лента в стиле Xiaohongshu — двухколоночная кладка, анонимные публикации, лайки и комментарии |
| 🏷️ Теги друзей | Назначение нескольких тегов друзьям (палитра из 12 цветов), фильтрация контактов по тегу |
| 🗂️ Объектное хранилище R2 | Cloudflare R2 для изображений/голосовых файлов — опциональный публичный CDN URL |
| 🔑 Двухфакторная аутентификация (2FA) | TOTP совместимый с Google Authenticator, 8 кодов восстановления, проверка при входе |
| 📷 Сканирование и обмен QR-кодами | Сканируйте QR-коды для добавления друзей или вступления в группы с настраиваемым сроком действия |
| 🏗️ Самостоятельный хостинг | Docker Compose, Zeabur в один клик или фронтенд на Vercel |
| 🌐 Настройки прокси | Поддержка SOCKS5 / HTTP / HTTPS прокси — настройка на страницах входа и настроек с указанием адреса сервера, порта, имени пользователя и пароля для ограниченных сетевых сред |
| 🛡️ Модерация контента | Жалобы пользователей (6 категорий) + блокировка пользователей (мгновенное скрытие постов/сообщений) + Условия использования (EULA) |
| 🔧 Панель администратора | Встроенная веб-панель администратора (`/admin`, путь настраивается), защита паролем, проверка жалоб, удаление нарушающего контента, бан пользователей — поддержка 8 языков |

---

## Технологический стек
```
Бэкенд (server/)
  Rust (Axum 0.8) — Высокопроизводительный асинхронный веб-фреймворк
  sqlx + MySQL 8.0 — Хранение данных пользователей/сообщений
  deadpool-redis + Redis 7 — Онлайн-статус + маршрутизация между узлами
  aws-sdk-s3 — Файловое хранилище Cloudflare R2 (S3-совместимый API)
  argon2 + jsonwebtoken аутентификация

Фронтенд (client/)
  React 19 + TypeScript + Vite 6
  Zustand управление состоянием
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — видео / голосовые звонки
  Web Audio API — изменение голоса в реальном времени (аудиоцепочка ScriptProcessorNode)
  PWA: manifest.json + Service Worker

Криптографический уровень
  Бессостоянный ECDH + XSalsa20-Poly1305 — эфемерная пара ключей для каждого сообщения
  Четырёхуровневое хранение ключей: memory → localStorage → sessionStorage → IndexedDB
  Все приватные ключи хранятся только на устройстве — никогда не отправляются на сервер
```

---

### Вариант 0: Zeabur — облачное развёртывание в один клик
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> [!TIP]
> **Продвинутый вариант: гибридное развёртывание Zeabur + Vercel**
> После развёртывания на Zeabur вы можете вручную удалить сервис **client** и развернуть фронтенд на Vercel (см. Вариант 2 ниже).
> Таким образом сервер/MySQL/Redis размещаются на Zeabur, а фронтенд ускоряется глобальной CDN Vercel.
> Фронтенд **не требует переменных окружения на Vercel** — пользователи просто вводят адрес бэкенд-сервера на странице входа.

### Вариант 1: Docker Compose (Рекомендуется)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# Отредактируйте: DB_PASS / JWT_SECRET / CF_CALLS_APP_ID и т.д.
docker compose up -d
open http://localhost
```

### Вариант 2: Фронтенд на Vercel
```bash
# 1. Сделайте форк этого репозитория
# 2. Импортируйте в Vercel: Root Directory = client/, Build = npm run build, Output = dist/
#    Переменные окружения не требуются
# 3. Разверните бэкенд через Docker или Zeabur
# 4. Откройте фронтенд, развёрнутый на Vercel, и введите адрес бэкенд-сервера на странице входа
#    например https://your-server.zeabur.app
```

### Вариант 3: Локальная разработка
```bash
# Бэкенд (Rust)
cd server && cp .env.example .env && cargo run --release

# Фронтенд (React)
cd client && npm install && npm run dev
```

---

## Изменение голоса

Голосовые сообщения, звонки 1:1 и групповые звонки поддерживают изменение голоса в реальном времени с 3 режимами на выбор:

| Режим | Скорость | Эффект |
|-------|----------|--------|
| 🐢 Медленный | 0.8x | Более глубокий, низкий голос — идеально для анонимности |
| 🔊 Обычный | 1.0x | Оригинальный голос, без обработки |
| 🐇 Быстрый | 1.2x | Более высокий голос — весело и игриво |

**Как это работает**: Используется Web Audio API для построения цепочки обработки звука (AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination), которая регулирует высоту тона/скорость микрофонного ввода в реальном времени.

- **Голосовые сообщения**: Выберите режим голоса во время записи. Экспортированный файл `.webm` уже содержит голосовой эффект — получатели не могут восстановить оригинальный голос, что обеспечивает настоящую анонимную переписку
- **Звонки 1:1 / групповые**: Нажмите кнопку изменения голоса во время звонка для переключения между режимами. Обработанная аудиодорожка заменяет оригинальную через `RTCRtpSender.replaceTrack()`

> Серверная настройка не требуется. Изменение голоса работает полностью на стороне клиента.

---

## Переменные окружения
| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `PORT` | Порт сервера | `3000` |
| `JWT_SECRET` | Ключ подписи JWT (**измените в продакшене**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | Подключение к MySQL | — |
| `REDIS_HOST` / `REDIS_PASS` | Подключение к Redis | — |
| `R2_ACCOUNT_ID` | ID аккаунта Cloudflare | — |
| `R2_ACCESS_KEY_ID` | Ключ доступа API-токена R2 | — |
| `R2_SECRET_ACCESS_KEY` | Секретный ключ API-токена R2 | — |
| `R2_BUCKET` | Название бакета R2 | — |
| `R2_PUBLIC_URL` | Публичный базовый URL R2 (опционально) | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID (опционально) | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret (опционально) | — |
| `METERED_TURN_API_KEY` | API-ключ Metered.ca TURN (опционально, бесплатная альтернатива) | — |
| `VAPID_PUBLIC_KEY` | Публичный ключ Web Push VAPID (опционально) | — |
| `VAPID_PRIVATE_KEY` | Приватный ключ Web Push VAPID (опционально) | — |
| `VAPID_SUBJECT` | Контактный email VAPID (опционально) | `mailto:admin@paperphone.app` |
| `FCM_PROJECT_ID` | ID проекта Firebase (опционально, Capacitor Android) | — |
| `FCM_CLIENT_EMAIL` | Email сервисного аккаунта Firebase (опционально) | — |
| `FCM_PRIVATE_KEY` | Приватный ключ сервисного аккаунта Firebase (опционально, поддерживает как экранирование `\n`, так и реальные переводы строк; см. ниже) | — |
| `FCM_RELAY_SECRET` | Секрет relay FCM push (опционально, установите на relay-хосте для активации эндпоинта) | — |
| `FCM_RELAY_URL` | URL relay FCM push (опционально, self-hosted серверы указывают на relay-хост) | — |
| `FCM_RELAY_KEY` | Ключ авторизации relay FCM push (опционально, должен совпадать с `FCM_RELAY_SECRET` relay-хоста) | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID (опционально) | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key (опционально) | — |
| `ONESIGNAL_RELAY_SECRET` | Секрет relay OneSignal push (опционально, установите на relay-хосте для активации эндпоинта) | — |
| `ONESIGNAL_RELAY_URL` | URL relay OneSignal push (опционально, self-hosted серверы указывают на relay-хост) | — |
| `ONESIGNAL_RELAY_KEY` | Ключ авторизации relay OneSignal push (опционально, должен совпадать с `ONESIGNAL_RELAY_SECRET` relay-хоста) | — |
| `NTFY_BASE_URL` | URL сервера ntfy (опционально, по умолчанию используется публичный ntfy.sh) | `https://ntfy.sh` |
| `NTFY_TOKEN` | Токен авторизации ntfy (опционально, для self-hosted серверов) | — |
| `APNS_TEAM_ID` | Team ID разработчика Apple (опционально, нативный iOS push) | — |
| `APNS_KEY_ID` | ID ключа авторизации APNS (опционально) | — |
| `APNS_PRIVATE_KEY` | Содержимое приватного ключа APNS .p8 (опционально, поддерживает экранирование `\n`) | — |
| `APNS_BUNDLE_ID` | Bundle Identifier iOS-приложения (опционально) | — |
| `APNS_SANDBOX` | Режим песочницы APNS (опционально, `true` для разработки/TestFlight) | `false` |
| `APNS_RELAY_SECRET` | Секрет push relay (опционально, установите на relay-хосте для активации эндпоинта) | — |
| `APNS_RELAY_URL` | URL push relay (опционально, self-hosted серверы указывают на relay-хост) | — |
| `APNS_RELAY_KEY` | Ключ авторизации push relay (опционально, должен совпадать с `APNS_RELAY_SECRET` relay-хоста) | — |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота (опционально) | — |
| `STICKER_PACKS` | Пользовательские стикер-паки (опционально, `name:label`) | 9 встроенных по умолчанию |
| `ADMIN_PATH` | URL-путь панели администратора | `/admin` |
| `ADMIN_PASSWORD` | Пароль панели администратора (**измените в продакшене**) | `admin123` |

### Обработка переводов строк в приватном ключе FCM

Поле `private_key` в JSON сервисного аккаунта Firebase содержит RSA-ключ в формате PEM, который требует **реальных символов перевода строки** (`\n`, ASCII 0x0A) между каждой 64-символьной строкой. Однако многие платформы развёртывания (Zeabur, Vercel, Railway, Docker) хранят переменные окружения как однострочные значения, преобразуя `\n` в буквальную двухсимвольную последовательность `\` + `n`.

**Это самая распространённая причина сбоя FCM push-уведомлений** — парсер PEM молча завершается с ошибкой, и push-уведомления не отправляются без каких-либо записей в логах.

**Сервер обрабатывает это автоматически**: `fcm.rs` нормализует буквальные последовательности `\n` обратно в реальные переводы строк перед парсингом. Оба формата работают:

- **Однострочный (рекомендуется для облачных платформ)**: Вставьте необработанное значение `private_key` из JSON-файла как есть, с экранированием `\n`:
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **Многострочный (для .env файлов)**: Оберните полное содержимое PEM в кавычки с реальными переводами строк:
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| Платформа | Рекомендуемый формат | Примечания |
|-----------|---------------------|------------|
| **Zeabur** | Однострочный (экранирование `\n`) | Вставьте значение JSON непосредственно в панели Variables |
| **Docker / docker-compose** | Любой | Используйте YAML `\|` для многострочного формата; однострочный в `.env` |
| **Vercel / Railway** | Однострочный (экранирование `\n`) | Поля ввода обычно не поддерживают реальные переводы строк |
| **Linux .env файл** | Многострочный (в кавычках) | Убедитесь, что кавычки правильно закрыты |

**Устранение неполадок**: Если переменные FCM установлены, но push-уведомления Android не работают, проверьте логи сервера:
- `[FCM] No access token available` → Ошибка формата приватного ключа (проблема с переводами строк)
- `[FCM] ✅ Push sent to user xxx` → Отправка FCM работает, проблема на стороне клиента
- Логи FCM отсутствуют → `FCM_PROJECT_ID` не установлен или нет токена в таблице `fcm_tokens`

### Push-уведомления ntfy (Android-устройства без Google Services)

Для Android-устройств без Google Mobile Services (Huawei, Xiaomi, OPPO, vivo и др.) PaperPhone поддерживает push-уведомления через [ntfy](https://ntfy.sh).

**Настройка по умолчанию (без конфигурации)**: Используется публичный сервис ntfy.sh. Дополнительная настройка не требуется.

**Опциональная конфигурация** (для self-hosted серверов ntfy):

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**Порядок настройки для пользователя**:
1. Установите приложение ntfy ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [Прямая загрузка](https://ntfy.sh))
2. Откройте настройки PaperPhone и найдите карточку «ntfy Push»
3. Скопируйте отображаемое имя темы и подпишитесь на неё в приложении ntfy
4. Нажмите «Зарегистрировать Push» для завершения регистрации

> **Примечание по безопасности**: Уведомления ntfy содержат заголовки и краткие описания в открытом виде (не фактическое содержание сообщений). Для повышения безопасности рассмотрите возможность self-hosted сервера ntfy.

### APNS Push (Нативное iOS-приложение)

APNS (Apple Push Notification Service) отправляет push-уведомления нативным iOS-приложениям, созданным с помощью Capacitor. Доступны два варианта конфигурации:

#### Вариант A: Прямая конфигурация (сервер разработчика приложения)

1. Войдите в [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Keys**
2. Нажмите **+** для создания нового ключа → отметьте **Apple Push Notifications service (APNs)** → Register
3. **Скачайте файл `.p8`** (⚠️ можно скачать только один раз!) и запишите **Key ID**
4. Запишите ваш **Team ID** со страницы Apple Developer Membership (10-символьный буквенно-цифровой код)
5. Добавьте в `server/.env`:

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(содержимое файла .p8)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphone
APNS_SANDBOX=false
```

> `APNS_SANDBOX`: Установите `true` для сборок разработки/TestFlight, `false` для продакшена App Store.

#### Вариант B: Через Push Relay (self-hosted серверы)

Если вы используете чужое iOS-приложение (например, скачанное из App Store), у вас нет учётных данных Apple разработчика и вы не можете отправлять APNS push напрямую. Используйте **Push Relay**.

**Как это работает:**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  Self-hosted сервер   │  HTTP  │  Сервер разработчика     │  APNS  │  Apple  │
│  (нет учётных данных  │──────→│  (есть .p8 Key + Relay)  │──────→│  ──→ 📱 │
│   Apple)              │       │                          │       └─────────┘
│                       │       │                          │
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**Шаг 1: Разработчик приложения включает эндпоинт Relay**

На сервере разработчика приложения (который уже имеет учётные данные APNS) установите секрет relay:

```env
# .env сервера разработчика приложения (уже содержит APNS_TEAM_ID и т.д.)
APNS_RELAY_SECRET=a_long_random_shared_secret
```

Это автоматически активирует эндпоинт push relay по адресу `POST /api/push-relay/apns`.

**Шаг 2: Пользователь self-hosted сервера настраивает Relay**

Self-hosted серверам нужны только две переменные — **учётные данные Apple не требуются**:

```env
# .env self-hosted сервера
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=the_shared_secret_from_step_1
```

**Как это работает:**
1. Self-hosted сервер получает офлайн-сообщение → запрашивает локальную таблицу `apns_tokens` для получения токенов iOS-устройств пользователя
2. Отправляет токены устройств + заголовок/тело push через HTTP POST на Relay
3. Relay проверяет ключ, затем отправляет в Apple с использованием собственных учётных данных APNS
4. Relay возвращает список устаревших токенов; self-hosted сервер автоматически очищает свою локальную базу данных

> **Приоритет**: Локальные учётные данные APNS → Push Relay → пропуск (без уведомления). Если оба варианта настроены, приоритет имеет прямое локальное подключение.

> **Примечание по безопасности**: Relay передаёт только заголовки и краткие описания push-уведомлений (например, «Вам пришло новое сообщение»), а не фактическое содержание сообщений. Токены устройств не могут использоваться для чтения данных пользователей.

### Push Relay (Все каналы)

Для операторов self-hosted серверов, использующих чужое опубликованное приложение (например, из App Store/Google Play), у вас нет учётных данных push разработчика (Apple .p8 Key / сервисный аккаунт Firebase / API-ключ OneSignal).

Система Push Relay обеспечивает возможность ретрансляции для каналов **APNS, FCM и OneSignal**:

**Разработчик приложения** включает эндпоинты relay на своём сервере:

```env
# .env сервера разработчика приложения
APNS_RELAY_SECRET=a_long_random_string
FCM_RELAY_SECRET=a_long_random_string
ONESIGNAL_RELAY_SECRET=a_long_random_string
```

**Пользователи self-hosted серверов** указывают только URL relay и ключ — **учётные данные push-сервисов не требуются**:

```env
# .env self-hosted сервера
# APNS (нативный iOS push)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=shared_secret

# FCM (нативный Android push)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=shared_secret

# OneSignal (приложения, обёрнутые через Median.co)
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=shared_secret
```

> **Приоритет**: Локальные учётные данные → Push Relay → пропуск (без уведомления). Если оба варианта настроены, приоритет имеет прямое локальное подключение.

---

## Официальный Push Relay

Операторы self-hosted серверов могут использовать официальный push relay для включения push-уведомлений iOS/Android без настройки каких-либо учётных данных push:

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

Добавьте эти строки в файл `.env` вашего self-hosted сервера.

---

## Лицензия

Этот проект лицензирован под [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
