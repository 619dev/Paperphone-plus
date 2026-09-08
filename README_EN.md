🌐 **Other Languages:** [中文](README.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

A WeChat-style end-to-end encrypted instant messaging app with stateless ECDH + XSalsa20-Poly1305 per-message encryption, real-time video calls, server-local file storage, multi-language support, and native Android, iOS, Windows, and macOS clients.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-LiveKit%20SFU-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Version](https://img.shields.io/badge/Version-2.5.2-orange)](client/package.json)

[![Google Play](https://img.shields.io/badge/Google%20Play-Download-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-Download-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-Client-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-Client-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

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
<img width=30% height=30% src="screenshot/ui17.jpg" alt="ui17">
<img width=30% height=30% src="screenshot/ui18.jpg" alt="ui18">

</details>

## Features
| Feature | Description |
|---------|-------------|
| 🔐 End-to-End Encryption | Stateless ECDH + XSalsa20-Poly1305 — ephemeral keys per message, forward secrecy, Signal-style safety number verification |
| 🗝️ Zero-knowledge encryption | For encrypted conversations, the server stores ciphertext while still processing essential account, contact/group, routing, and push metadata. Identity private keys and Sender Keys remain local: Web uses AES-GCM-wrapped IndexedDB, while Android, iOS, Windows, and macOS clients use operating-system secure storage |
| 🎭 Text appearance & extra encryption | In Profile > Message privacy, set an extra password for every chat on this device and render message bodies in one of eight text appearances; supports manual locking and automatic locking after leaving the foreground |
| 📹 Video & Voice Calls | LiveKit SFU for 1:1 calls and meetings (up to 100 participants), host mute-all and lecture mode |
| 🎙️ Voice Changer | Real-time voice effects for voice messages, 1:1 calls, and group calls — 3 modes (0.8x deep / 1.0x normal / 1.2x high-pitched), powered by Web Audio API |
| 📱 Session Persistence | 30-minute access tokens with silently renewed 90-day device refresh tokens; reconnects after network/IP/VPN/proxy changes and asks for credentials only when the durable session expires or is revoked |
| 📨 Reliable Message Sync | Bidirectional heartbeat, dead-connection detection, persistent outbox, idempotent client message IDs, and server-sequence catch-up recover messages even when push arrives but realtime delivery is lost |
| 📴 Offline Access | Account-isolated caching for contacts, groups, up to 2,000 messages per conversation, Moments, Timeline, and media; offline sends remain queued and retry automatically |
| 🔎 Unicode Friend Search | IME composition protection, NFC normalization, and UTF-8 query encoding provide reliable Chinese username and nickname search |
| 👥 Group Chat | Up to 2000 members, switchable "Encrypted" / "Unencrypted" modes (owner-only toggle, switching clears chat history). Encrypted mode uses Signal-style Sender Key protocol (XSalsa20-Poly1305 symmetric encryption + ECDH key distribution) — only group members can decrypt messages; bots are disabled in encrypted mode. Do Not Disturb mode, member management |
| 👫 Friend System | Friend requests require approval with up to 512-char message; custom nicknames; multi-tag grouping |
| ⏱️ Auto-Delete Messages | 5 tiers (never / 1 day / 3 days / 1 week / 1 month), settable by either party in DMs, owner-only in groups |
| 🔔 Native push notifications | FCM + ntfy + APNS for Android and iOS clients |
| 🌐 Multi-Language | Chinese, English, Japanese, Korean, French, German, Russian, Spanish — auto-detect + manual switch |
| 📱 Native iOS Client | Uses operating-system secure storage and APNS; connects to the self-hosted backend |
| 📱 Android Native App | Available on [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), with FCM push notification support |
| 📱 iOS Native App | Available on the [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178), with APNS push notification support |
| 🖥️ Windows Desktop Client | Native Windows desktop app, [download here](https://github.com/619dev/ppp-win/releases) |
| 🍎 Mac Desktop Client | Native Mac desktop app, [download here](https://github.com/619dev/ppp-mac/releases) |
| 💬 Rich Messaging | Text, images, video, documents, voice, emoji, Telegram stickers and receipts; batch-download up to 20 file messages |
| 📤 File Upload | Up to 500MB per file; permanent profile/social media and expiring chat attachments |
| 🌐 Moments | WeChat-style social feed: text + up to 9 photos or 1 video (≤ 10 min), likes, comments, tag-based visibility |
| 👤 User Profile | Contact profile page with bidirectional Moments privacy controls |
| 📰 Timeline | Xiaohongshu-style public feed — dual-column masonry layout, anonymous posting, likes & comments |
| 🏷️ Friend Tags | Assign multiple tags to friends (12-color palette), filter contacts by tag |
| 🗂️ Local File Storage | Persistent media volume with isolated permanent and temporary directories |
| 🔑 Two-Factor Auth (2FA) | Google Authenticator–compatible TOTP, 8 recovery codes, enforced at login |
| 📷 QR Code Scan & Share | Scan QR codes to add friends or join groups with configurable expiry |
| 🏗️ Self-hosting | Deploy the backend with Docker Compose or Zeabur; connect using an official native client |
| 🌐 Proxy Settings | SOCKS5 / HTTP / HTTPS proxy support — configurable on both login and settings pages with server address, port, username and password for restricted network environments |
| 🛡️ Content Moderation | User reporting (6 reason categories) + user blocking (instantly hides posts/messages) + Terms of Use (EULA) |
| 🔧 Admin Panel | Embedded web admin dashboard (`/admin`, path customizable), password-protected, review reports, delete offending content, ban users — supports 8 languages |

---

## Changelog

The complete release history has moved to [changelog.md](changelog.md).

---

## Session Recovery and Message Reliability

PaperPhonePlus treats local account state, realtime connection state, and message synchronization as separate concerns. An open WebSocket is not considered usable until the server returns `auth_ok`. Bidirectional `ping/pong` heartbeats detect half-open connections caused by VPN/IP changes, Wi-Fi/cellular handoff, or application suspension.

- Access tokens last 30 minutes. Device refresh tokens last 90 days and extend while actively used, allowing silent renewal without asking for a password.
- Devices already signed in on an older release are upgraded automatically while their existing token remains valid. If that legacy token has already expired, one final manual sign-in is required.
- Every outbound message has a stable `client_msg_id`. Messages without a server ACK remain in the persistent local outbox and retry with the same ID; a server uniqueness constraint prevents duplicate inserts.
- Every stored message has a monotonically increasing `server_seq`. The client performs cursor-based catch-up after authentication, reconnection, and foreground resume, so a push notification cannot permanently get ahead of local message history.
- Explicit logout and device revocation invalidate the durable server session. Ordinary transport failures and IP changes preserve it.

> [!IMPORTANT]
> Deploy the server before releasing the updated client. On startup, the server automatically applies and verifies the reliability schema migration. It refuses to start when critical columns are missing, preventing a partially upgraded deployment from silently losing sends. Back up MySQL before production upgrades.

---

## Tech Stack
```
Backend (server/)
  Rust (Axum 0.8) — High-performance async web framework
  sqlx + MySQL 8.0 — User/message persistence
  deadpool-redis + Redis 7 — Online presence + cross-node routing
  aws-sdk-s3 — read-only migration of legacy Cloudflare R2 data
  argon2 + jsonwebtoken authentication

Shared frontend source (client/, not deployed independently)
  React 19 + TypeScript + Vite 6
  Zustand state management
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — video / voice calls
  Web Audio API — real-time voice changer (ScriptProcessorNode audio chain)

Cryptographic Layer
  Stateless ECDH + XSalsa20-Poly1305 — ephemeral keypair per message
  Local key protection: AES-GCM-wrapped IndexedDB on Web; operating-system secure storage on Android/iOS/Windows/macOS
  Identity private keys and Sender Keys remain local and are never sent to the server
```

---

> 📖 **[Deployment Guide](DEPLOY_EN.md)** — backend-only Zeabur and Docker Compose + Nginx instructions, plus native-client server address configuration.
>
> **Important: the Web frontend is no longer deployed.** `/client` is shared frontend source for Android, iOS, Windows, and macOS. Do not deploy it to Docker, Zeabur, Vercel, or Nginx.

### Zeabur one-click deployment
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

The template creates only `server`, MySQL, Redis, and LiveKit. Record the public HTTPS domain of `server` and enter it in an official native client.

### Docker Compose (recommended)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# Edit DB_PASS / REDIS_PASS / JWT_SECRET / LIVEKIT_URL, then:
docker compose up -d
curl -fsS http://localhost:3000/health
```

### Local development (not a Web deployment)
```bash
cd server && cp .env.example .env && cargo run --release
cd client && npm install && npm run dev  # shared frontend source only
```

---

## Voice Changer

Voice messages, 1:1 calls, and group calls all support real-time voice changing with 3 selectable modes:

| Mode | Speed | Effect |
|------|-------|--------|
| 🐢 Slow | 0.8x | Deeper, lower-pitched voice — ideal for anonymity |
| 🔊 Normal | 1.0x | Original voice, no processing |
| 🐇 Fast | 1.2x | Higher-pitched voice — fun and playful |

**How it works**: Uses the Web Audio API to build an audio processing chain (AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination) that adjusts pitch/speed of the microphone input in real-time.

- **Voice messages**: Select voice mode during recording. The exported `.webm` file already contains the voice effect — recipients cannot restore the original voice, enabling true anonymous messaging
- **1:1 / Group calls**: Tap the voice changer button during a call to cycle through modes. The processed audio track replaces the published LiveKit microphone track.

> No server-side configuration is required. The voice changer runs entirely on the client side.

---

## Text Appearance and Extra Encryption

Under **Profile > Message privacy**, you can enable an extra password for every chat on this device. Before sending, the body is encrypted with that password and rendered in the selected appearance, then passed through the existing private-chat E2EE (X25519 / ML-KEM-768) or group Sender Key encryption. It is therefore a second content-protection layer on top of the original E2EE, not a replacement. Appearances include **Buddhist text, random Chinese, I Ching symbols, Hangul, Egyptian hieroglyphs, Cuneiform, Core Values text, and letters and numbers**.

- The password is never uploaded or synchronized. Both private-chat participants, or every member of a group, must agree on and configure the same extra password on their own devices.
- Text appearances do not need to match. Each message carries its appearance identifier, so the recipient automatically detects and decodes the sender's chosen appearance. For example, one person may use Buddhist text and the other Hangul; with the same extra password, both can still decrypt normally. Each person's setting controls only the ciphertext appearance of messages they send.
- If passwords differ, the original E2EE and message delivery still work, but the extra layer cannot be opened: the recipient sees only styled ciphertext and cannot read the original body.
- The password must contain at least eight characters and stays in memory only while unlocked. Only the salt and password verifier are persisted locally.
- Lock immediately or auto-lock **5 / 15 / 30 / 60 minutes** after leaving the foreground. While locked or when the password is wrong, only styled ciphertext is shown.
- Disabling extra encryption always requires the correct password again, even when currently unlocked.
- Text appearance is extra insurance on top of the original E2EE; it **does not replace, bypass, or downgrade E2EE**.

---

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `JWT_SECRET` | JWT signing key (**change in production**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | MySQL connection | — |
| `REDIS_HOST` / `REDIS_PASS` | Redis connection | — |
| `UPLOAD_DIR` | Persistent local file directory | `./uploads` |
| `CHAT_FILE_RETENTION_DAYS` | Private/group chat attachment retention; `0` disables cleanup | `14` |
| `R2_*` | Legacy read-only migration settings; remove after the post-migration startup notice | — |
| `LIVEKIT_URL` | Public LiveKit WebSocket URL used by all calls | — |
| `LIVEKIT_API_KEY` | API key shared by the server and LiveKit | — |
| `LIVEKIT_API_SECRET` | API secret shared by the server and LiveKit | — |
| `FCM_PROJECT_ID` | Firebase project ID (optional, Capacitor Android) | — |
| `FCM_CLIENT_EMAIL` | Firebase service account email (optional) | — |
| `FCM_PRIVATE_KEY` | Firebase service account private key (optional, supports both `\n` escape and real newlines; see below) | — |
| `FCM_RELAY_SECRET` | FCM push relay secret (optional, set on relay host to enable endpoint) | — |
| `FCM_RELAY_URL` | FCM push relay URL (optional, self-hosted servers point to relay host) | — |
| `FCM_RELAY_KEY` | FCM push relay auth key (optional, must match relay host's `FCM_RELAY_SECRET`) | — |
| `NTFY_BASE_URL` | ntfy server URL (optional, uses public ntfy.sh by default) | `https://ntfy.sh` |
| `NTFY_TOKEN` | ntfy auth token (optional, for self-hosted servers) | — |
| `APNS_TEAM_ID` | Apple Developer Team ID (optional, iOS native push) | — |
| `APNS_KEY_ID` | APNS auth key ID (optional) | — |
| `APNS_PRIVATE_KEY` | APNS .p8 private key content (optional, supports `\n` escaping) | — |
| `APNS_BUNDLE_ID` | iOS App Bundle Identifier (optional) | — |
| `APNS_SANDBOX` | APNS sandbox mode (optional, `true` for dev/TestFlight) | `false` |
| `APNS_RELAY_SECRET` | Push relay secret (optional, set on relay host to enable endpoint) | — |
| `APNS_RELAY_URL` | Push relay URL (optional, self-hosted servers point to relay host) | — |
| `APNS_RELAY_KEY` | Push relay auth key (optional, must match relay host's `APNS_RELAY_SECRET`) | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (optional) | — |
| `STICKER_PACKS` | Custom sticker packs (optional, `name:label`) | 13 built-in defaults |
| `ADMIN_PATH` | Admin panel URL path | `/admin` |
| `ADMIN_PASSWORD` | Admin panel password (**change in production**) | `admin123` |

### FCM Private Key Newline Handling

The `private_key` field in Firebase service account JSON contains an RSA private key in PEM format, which requires **real newline characters** (`\n`, ASCII 0x0A) between each 64-character line. However, many deployment platforms (Zeabur, Railway, Docker) store environment variables as single-line strings, converting `\n` into the literal two-character sequence `\` + `n`.

**This is the most common cause of FCM push notification failure** — the PEM parser silently fails and no push notifications are sent, with no error logs.

**The server handles this automatically**: `fcm.rs` normalizes literal `\n` sequences back to real newlines before parsing. Both formats work:

- **Single-line (recommended for cloud platforms)**: Paste the raw `private_key` value from the JSON file as-is, with `\n` escapes:
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **Multi-line (for .env files)**: Wrap the full PEM content in quotes with real newlines:
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| Platform | Recommended Format | Notes |
|----------|-------------------|-------|
| **Zeabur** | Single-line (`\n` escaped) | Paste JSON value directly in Variables panel |
| **Docker / docker-compose** | Either | Use YAML `\|` for multi-line; single-line in `.env` |
| **Railway / Docker** | Single-line (`\n` escaped) | Input fields typically don't support real newlines |
| **Linux .env file** | Multi-line (quoted) | Ensure quotes are properly closed |

**Troubleshooting**: If FCM variables are set but Android push isn't working, check server logs:
- `[FCM] No access token available` → Private key format error (newline issue)
- `[FCM] ✅ Push sent to user xxx` → FCM sending works, issue is client-side
- No FCM logs at all → `FCM_PROJECT_ID` not set or no token in `fcm_tokens` table

### ntfy Push (Chinese Android Devices without Google Services)

For Android devices without Google Mobile Services (Huawei, Xiaomi, OPPO, vivo, etc.), PaperPhonePlus supports push notifications via [ntfy](https://ntfy.sh).

**Default setup (zero configuration)**: Uses the public ntfy.sh service. No additional configuration needed.

**Optional configuration** (for self-hosted ntfy servers):

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**User setup flow**:
1. Install the ntfy app ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [Direct Download](https://ntfy.sh))
2. Open PaperPhonePlus Settings and find the "ntfy Push" card
3. Copy the displayed topic name and subscribe to it in the ntfy app
4. Tap "Register Push" to complete registration

> **Security note**: ntfy notifications contain notification titles and summaries in plaintext (not the actual message content). For higher security, consider self-hosting an ntfy server.

### APNS Push (Native iOS App)

APNS (Apple Push Notification Service) sends push notifications to native iOS apps built with Capacitor. There are two configuration options:

#### Option A: Direct Configuration (App Developer's Server)

1. Log in to [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Keys**
2. Click **+** to create a new Key → check **Apple Push Notifications service (APNs)** → Register
3. **Download the `.p8` file** (⚠️ can only be downloaded once!) and note the **Key ID**
4. Note your **Team ID** from the Apple Developer Membership page (10-char alphanumeric)
5. Add to `server/.env`:

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(.p8 file content)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphoneplus
APNS_SANDBOX=false
```

> `APNS_SANDBOX`: Set to `true` for development/TestFlight builds, `false` for App Store production.

#### Option B: Via Push Relay (Self-Hosted Servers)

If you're using someone else's iOS app (e.g. downloaded from the App Store), you don't have the developer's Apple credentials and cannot send APNS pushes directly. Use the **Push Relay** instead.

**How it works:**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  Self-hosted server   │  HTTP  │  App developer's server  │  APNS  │  Apple  │
│  (no Apple creds)     │──────→│  (has .p8 Key + Relay)   │──────→│  ──→ 📱 │
│                       │       │                          │       └─────────┘
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**Step 1: App developer enables the Relay endpoint**

On the app developer's server (which already has APNS credentials), set a relay secret:

```env
# App developer's server .env (already has APNS_TEAM_ID etc.)
APNS_RELAY_SECRET=a_long_random_shared_secret
```

This automatically enables the push relay endpoint at `POST /api/push-relay/apns`.

**Step 2: Self-hosted user configures the Relay**

Self-hosted servers only need two variables — **no Apple credentials required**:

```env
# Self-hosted server .env
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=the_shared_secret_from_step_1
```

**How it works:**
1. Self-hosted server receives an offline message → queries local `apns_tokens` table for user's iOS device tokens
2. Sends device tokens + push title/body via HTTP POST to the Relay
3. Relay validates the key, then sends to Apple using its own APNS credentials
4. Relay returns a list of stale tokens; the self-hosted server automatically cleans its local database

> **Priority**: Local APNS credentials → Push Relay → skip (silent). If both are configured, local direct connection takes priority.

> **Security note**: The relay only transmits push notification titles and summaries (e.g. "Someone sent you a message"), not actual message content. Device tokens cannot be used to read user data.

### Native Push Relay



**App developer** enables relay endpoints on their server:

```env
# App developer's server .env
APNS_RELAY_SECRET=a_long_random_string
FCM_RELAY_SECRET=a_long_random_string
```

**Self-hosted users** only need relay URL and key — **no push service credentials required**:

```env
# Self-hosted server .env
# APNS (iOS native push)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=shared_secret

# FCM (Android native push)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=shared_secret

```

> **Priority**: Local credentials → Push Relay → skip (silent). If both are configured, local direct connection takes priority.

---

## Official Push Relay

Self-hosted server operators can use the official push relay to enable iOS/Android push notifications without configuring any push credentials:

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

Add these lines to your self-hosted server's `.env` file.

---

## License
This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
