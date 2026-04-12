🌐 **Other Languages:** [中文](README.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

A WeChat-style end-to-end encrypted instant messaging app with stateless ECDH + XSalsa20-Poly1305 per-message encryption, real-time video calls, Cloudflare R2 file storage, multi-language support and iOS PWA deployment.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20Mesh-orange)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

---

<details>
<summary>📸 Screenshots (click to expand)</summary>


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

## Features
| Feature | Description |
|---------|-------------|
| 🔐 End-to-End Encryption | Stateless ECDH + XSalsa20-Poly1305 — ephemeral keys per message, forward secrecy |
| 🗝️ Zero-Knowledge Server | Server stores only ciphertext; private keys never leave the device |
| 📹 Video & Voice Calls | WebRTC P2P (1:1) + Mesh (group), Cloudflare TURN for NAT traversal |
| 👥 Group Chat | Up to 2000 members, plain-text messages (no encryption), Do Not Disturb mode, member management |
| 👫 Friend System | Friend requests require approval with up to 512-char message; custom nicknames; multi-tag grouping |
| ⏱️ Auto-Delete Messages | 5 tiers (never / 1 day / 3 days / 1 week / 1 month), settable by either party in DMs, owner-only in groups |
| 🔔 Push Notifications | Web Push (VAPID) + OneSignal dual-channel — reach users even when offline |
| 🌐 Multi-Language | Chinese, English, Japanese, Korean, French, German, Russian, Spanish — auto-detect + manual switch |
| 📱 iOS — No Enterprise Cert | PWA via Safari "Add to Home Screen", works permanently without Apple signing |
| 💬 Rich Messaging | Text, images, video, document files, voice messages, 200+ emoji, Telegram sticker packs, delivery receipts, typing indicators |
| 📤 File Upload | Up to 500MB per file, Cloudflare R2 or local storage, with progress animation |
| 🌐 Moments | WeChat-style social feed: text + up to 9 photos or 1 video (≤ 10 min), likes, comments, tag-based visibility |
| 👤 User Profile | Contact profile page with bidirectional Moments privacy controls |
| 📰 Timeline | Xiaohongshu-style public feed — dual-column masonry layout, anonymous posting, likes & comments |
| 🏷️ Friend Tags | Assign multiple tags to friends (12-color palette), filter contacts by tag |
| 🗂️ R2 Object Storage | Cloudflare R2 for image/voice files — optional public CDN URL |
| 🔑 Two-Factor Auth (2FA) | Google Authenticator–compatible TOTP, 8 recovery codes, enforced at login |
| 📷 QR Code Scan & Share | Scan QR codes to add friends or join groups with configurable expiry |
| 🏗️ Self-Hostable | Docker Compose, Zeabur one-click, or frontend on Vercel |

---

## Tech Stack
```
Backend (server/)
  Rust (Axum 0.8) — High-performance async web framework
  sqlx + MySQL 8.0 — User/message persistence
  deadpool-redis + Redis 7 — Online presence + cross-node routing
  aws-sdk-s3 — Cloudflare R2 file storage (S3-compatible API)
  argon2 + jsonwebtoken authentication

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Zustand state management
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — video / voice calls
  PWA: manifest.json + Service Worker

Cryptographic Layer
  Stateless ECDH + XSalsa20-Poly1305 — ephemeral keypair per message
  Four-tier key persistence: memory → localStorage → sessionStorage → IndexedDB
  All private keys stored on-device only — never sent to the server
```

---

### Option 0: Zeabur One-Click Cloud Deploy
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> [!NOTE]
> One manual step is required after deploy:
> 1. Go to Zeabur Console → **server service** → Environment Variables → copy `ZEABUR_WEB_URL`
> 2. Go to **client service** → Environment Variables → add `VITE_API_URL` = the value copied above
> 3. Restart the client service

> [!TIP]
> **Advanced: Zeabur + Vercel Hybrid Deployment**
> After deploying on Zeabur, you can manually delete the **client** service and deploy the frontend on Vercel instead (see Option 2 below).
> This way server/MySQL/Redis are hosted on Zeabur while the frontend is accelerated by Vercel's global CDN.
> Set `VITE_API_URL` in Vercel to the public domain of your Zeabur server service.

### Option 1: Docker Compose (Recommended)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# Edit: DB_PASS / JWT_SECRET / CF_CALLS_APP_ID etc.
docker compose up -d
open http://localhost
```

### Option 2: Frontend on Vercel
```bash
# 1. Fork this repo
# 2. Import in Vercel: Root Directory = client/, Build = npm run build, Output = dist/
# 3. Set env var: VITE_API_URL = https://your-server-domain.com
# 4. Deploy backend via Docker or Zeabur
```

### Option 3: Local Development
```bash
# Backend (Rust)
cd server && cp .env.example .env && cargo run --release

# Frontend (React)
cd client && npm install && npm run dev
```

---

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing key (**change in production**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | MySQL connection | — |
| `REDIS_HOST` / `REDIS_PASS` | Redis connection | — |
| `R2_ACCOUNT_ID` | Cloudflare account ID | — |
| `R2_ACCESS_KEY_ID` | R2 API token access key | — |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret key | — |
| `R2_BUCKET` | R2 bucket name | — |
| `R2_PUBLIC_URL` | R2 public base URL (optional) | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID (optional) | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret (optional) | — |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key (optional) | — |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key (optional) | — |
| `VAPID_SUBJECT` | VAPID contact email (optional) | `mailto:admin@paperphone.app` |
| `ONESIGNAL_APP_ID` | OneSignal App ID (optional) | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key (optional) | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (optional) | — |
| `STICKER_PACKS` | Custom sticker packs (optional, `name:label`) | 8 built-in defaults |

---

## License
MIT © PaperPhone Contributors
