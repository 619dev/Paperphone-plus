🌐 **Другие языки:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Español](README_ES.md)

Мессенджер со сквозным шифрованием в стиле WeChat. Бессостоянный ECDH + XSalsa20-Poly1305 шифрование для каждого сообщения, видеозвонки в реальном времени, хранение файлов Cloudflare R2, поддержка 8 языков и развёртывание iOS PWA.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

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

</details>

## Технологический стек
```
Бэкенд (server/)
  Rust (Axum 0.8) — Высокопроизводительный асинхронный веб-фреймворк
  sqlx + MySQL 8.0 — Хранение пользователей/сообщений
  deadpool-redis + Redis 7 — Онлайн-статус
  aws-sdk-s3 — Файловое хранилище Cloudflare R2

Фронтенд (client/)
  React 19 + TypeScript + Vite 6
  Zustand управление состоянием
  libsodium-wrappers-sumo (WebAssembly)
  WebRTC API — видео/голосовые звонки
  Поддержка PWA
```

## Развёртывание
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Локальная разработка
cd server && cargo run --release  # Бэкенд
cd client && npm install && npm run dev  # Фронтенд
```

Подробная настройка описана в [README на английском](README_EN.md).

---
MIT © PaperPhone Contributors
