🌐 **Andere Sprachen:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Русский](README_RU.md) · [Español](README_ES.md)

Eine WeChat-ähnliche Ende-zu-Ende-verschlüsselte Instant-Messaging-App mit zustandslosem ECDH + XSalsa20-Poly1305 Pro-Nachricht-Verschlüsselung, Echtzeit-Videoanrufen, Cloudflare R2 Dateispeicher, Mehrsprachigkeit und iOS PWA-Bereitstellung.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/P2J7Y3?referralCode=619dev)

---

<details>
<summary>📸 Screenshots (zum Erweitern klicken)</summary>

<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui1.jpg" alt="ui1">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui2.jpg" alt="ui2">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui3.jpg" alt="ui3">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui4.jpg" alt="ui4">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui5.jpg" alt="ui5">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui6.jpg" alt="ui6">

</details>

## Technologie-Stack
```
Backend (server/)
  Rust (Axum 0.8) — Hochleistungs-Async-Web-Framework
  sqlx + MySQL 8.0 — Benutzer-/Nachrichtenpersistenz
  deadpool-redis + Redis 7 — Online-Präsenz
  aws-sdk-s3 — Cloudflare R2 Dateispeicher

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Zustand Zustandsverwaltung
  libsodium-wrappers-sumo (WebAssembly)
  WebRTC API — Video-/Sprachanrufe
  PWA-kompatibel
```

## Bereitstellung
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Lokale Entwicklung
cd server && cargo run --release  # Backend
cd client && npm install && npm run dev  # Frontend
```

Detaillierte Konfiguration finden Sie im [englischen README](README_EN.md).

---
MIT © PaperPhone Contributors
