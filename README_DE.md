🌐 **Andere Sprachen:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Русский](README_RU.md) · [Español](README_ES.md)

Eine WeChat-ähnliche Ende-zu-Ende-verschlüsselte Instant-Messaging-App mit zustandslosem ECDH + XSalsa20-Poly1305 Pro-Nachricht-Verschlüsselung, Echtzeit-Videoanrufen, Cloudflare R2 Dateispeicher, Mehrsprachigkeit und iOS PWA-Bereitstellung.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-Herunterladen-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)

---

<details>
<summary>📸 Screenshots (zum Erweitern klicken)</summary>


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
  Web Audio API — Echtzeit-Stimmverzerrer
  PWA-kompatibel
```

## Hauptfunktionen
- 🔐 Ende-zu-Ende-Verschlüsselung (ECDH + XSalsa20-Poly1305)
- 📹 Video-/Sprachanrufe (WebRTC P2P + Mesh)
- 🎙️ Stimmverzerrer — Sprachnachrichten, 1v1-Anrufe und Gruppenanrufe mit 3 Modi (0.8x tief / 1.0x normal / 1.2x hoch), Echtzeit-Verarbeitung über Web Audio API
- 👥 Gruppenchat (bis zu 2000 Mitglieder)
- 💬 Rich-Nachrichten (Text, Bilder, Videos, Dokumente, Sprache, Emoji, Sticker)
- 🎭 Telegram Sticker-Pakete — dynamische Sticker-Verwaltung, 9 integrierte Standardpakete, anpassbar und unbegrenzte Anzahl
- 🌐 8 Sprachen (automatische Erkennung + manuelle Umschaltung)
- 📱 iOS PWA (permanente Installation)
- 📱 Native Android-App — Verfügbar im [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), mit FCM-Push-Benachrichtigungen
- 🔑 Zwei-Faktor-Authentifizierung (TOTP)
- 🌐 Proxy-Einstellungen — SOCKS5 / HTTP / HTTPS Proxy-Unterstützung, konfigurierbar auf Login- und Einstellungsseiten (Adresse, Port, Benutzername, Passwort)
- 🛡️ Inhaltsmoderation — Benutzermeldungen (6 Kategorien) + Benutzer blockieren (sofortige Ausblendung) + Nutzungsbedingungen (EULA)
- 🔧 Admin-Panel — Eingebettetes Web-Dashboard (`/admin`, Pfad konfigurierbar), passwortgeschützt, Meldungen prüfen, Inhalte löschen, Benutzer sperren — 8 Sprachen

## Bereitstellung
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Frontend auf Vercel bereitstellen (keine Umgebungsvariablen erforderlich)
# In Vercel: Root Directory = client/, Build = npm run build, Output = dist/
# Geben Sie die Backend-Server-Adresse auf der Login-Seite ein, um sich zu verbinden

# Lokale Entwicklung
cd server && cargo run --release  # Backend
cd client && npm install && npm run dev  # Frontend
```

Detaillierte Konfiguration finden Sie im [englischen README](README_EN.md).

---
MIT © PaperPhone Contributors
