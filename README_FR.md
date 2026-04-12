🌐 **Autres langues :** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

Une application de messagerie instantanée chiffrée de bout en bout, style WeChat, avec chiffrement ECDH + XSalsa20-Poly1305 par message, appels vidéo en temps réel, stockage Cloudflare R2, support multilingue et déploiement PWA iOS.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

---

<details>
<summary>📸 Captures d'écran (cliquez pour agrandir)</summary>


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

## Stack technique
```
Backend (server/)
  Rust (Axum 0.8) — Framework web asynchrone haute performance
  sqlx + MySQL 8.0 — Persistance des utilisateurs/messages
  deadpool-redis + Redis 7 — Présence en ligne
  aws-sdk-s3 — Stockage fichiers Cloudflare R2

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Zustand gestion d'état
  libsodium-wrappers-sumo (WebAssembly)
  WebRTC API — Appels vidéo/audio
  PWA compatible
```

## Déploiement
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Développement local
cd server && cargo run --release  # Backend
cd client && npm install && npm run dev  # Frontend
```

Pour la configuration détaillée, voir le [README en anglais](README_EN.md).

---
MIT © PaperPhone Contributors
