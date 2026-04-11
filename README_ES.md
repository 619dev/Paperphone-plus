🌐 **Otros idiomas:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md)

Una aplicación de mensajería instantánea cifrada de extremo a extremo, estilo WeChat, con cifrado ECDH + XSalsa20-Poly1305 por mensaje, videollamadas en tiempo real, almacenamiento Cloudflare R2, soporte multilingüe y despliegue PWA para iOS.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/P2J7Y3?referralCode=619dev)

---

<details>
<summary>📸 Capturas de pantalla (haga clic para expandir)</summary>

<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui1.jpg" alt="ui1">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui2.jpg" alt="ui2">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui3.jpg" alt="ui3">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui4.jpg" alt="ui4">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui5.jpg" alt="ui5">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui6.jpg" alt="ui6">

</details>

## Stack tecnológico
```
Backend (server/)
  Rust (Axum 0.8) — Framework web asíncrono de alto rendimiento
  sqlx + MySQL 8.0 — Persistencia de usuarios/mensajes
  deadpool-redis + Redis 7 — Presencia en línea
  aws-sdk-s3 — Almacenamiento Cloudflare R2

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Zustand gestión de estado
  libsodium-wrappers-sumo (WebAssembly)
  WebRTC API — Videollamadas/llamadas de voz
  Compatible con PWA
```

## Despliegue
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Desarrollo local
cd server && cargo run --release  # Backend
cd client && npm install && npm run dev  # Frontend
```

Para la configuración detallada, consulte el [README en inglés](README_EN.md).

---
MIT © PaperPhone Contributors
