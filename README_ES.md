🌐 **Otros idiomas:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md)

Una aplicación de mensajería instantánea cifrada de extremo a extremo, estilo WeChat, con cifrado ECDH + XSalsa20-Poly1305 por mensaje, videollamadas en tiempo real, almacenamiento Cloudflare R2, soporte multilingüe y despliegue PWA para iOS.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-Descargar-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)

---

<details>
<summary>📸 Capturas de pantalla (haga clic para expandir)</summary>


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
  Web Audio API — Modificador de voz en tiempo real
  Compatible con PWA
```

## Funcionalidades principales
- 🔐 Cifrado de extremo a extremo (ECDH + XSalsa20-Poly1305)
- 📹 Videollamadas/llamadas de voz (WebRTC P2P + Mesh)
- 🎙️ Modificador de voz — Mensajes de voz, llamadas 1v1 y llamadas grupales con 3 modos (0.8x grave / 1.0x normal / 1.2x agudo), procesamiento en tiempo real con Web Audio API
- 👥 Chat grupal (hasta 2000 miembros)
- 💬 Mensajes enriquecidos (texto, imágenes, videos, documentos, audio, emoji, stickers)
- 🎭 Packs de stickers de Telegram — gestión dinámica de packs, 9 packs integrados por defecto, personalizable y cantidad ilimitada
- 🌐 8 idiomas (detección automática + cambio manual)
- 📱 PWA iOS (instalación permanente)
- 📱 Aplicación Android nativa — Disponible en [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), con soporte de notificaciones push FCM
- 🔑 Autenticación de dos factores (TOTP)
- 🛡️ Moderación de contenido — Reportes de usuarios (6 categorías) + bloqueo de usuarios (ocultación instantánea) + Términos de uso (EULA)
- 🔧 Panel de administración — Dashboard web integrado (`/admin`, ruta configurable), protegido por contraseña, revisar reportes, eliminar contenido, banear usuarios — 8 idiomas
- 🌐 Configuración de proxy — Soporte SOCKS5 / HTTP / HTTPS, configurable en las páginas de inicio de sesión y ajustes (dirección, puerto, usuario, contraseña)

## Despliegue
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Desplegar frontend en Vercel (no se requieren variables de entorno)
# En Vercel: Root Directory = client/, Build = npm run build, Output = dist/
# Ingrese la dirección del servidor backend en la página de inicio de sesión para conectarse

# Desarrollo local
cd server && cargo run --release  # Backend
cd client && npm install && npm run dev  # Frontend
```

Para la configuración detallada, consulte el [README en inglés](README_EN.md).

---
MIT © PaperPhone Contributors
