🌐 **Andere Sprachen:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Русский](README_RU.md) · [Español](README_ES.md)

Eine WeChat-ähnliche Ende-zu-Ende-verschlüsselte Instant-Messaging-App mit zustandslosem ECDH + XSalsa20-Poly1305 Pro-Nachricht-Verschlüsselung, Echtzeit-Videoanrufen, Cloudflare R2 Dateispeicher, Mehrsprachigkeit und iOS PWA-Bereitstellung.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20SFU-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-Herunterladen-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-Herunterladen-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-Client-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-Client-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

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

## Funktionen
| Funktion | Beschreibung |
|----------|--------------|
| 🔐 Ende-zu-Ende-Verschlüsselung | Zustandsloses ECDH + XSalsa20-Poly1305 — Einmalschlüssel pro Nachricht, Forward Secrecy, Signal-ähnliche Sicherheitsnummernverifizierung |
| 🗝️ Zero-Knowledge-Server | Server speichert nur Chiffretext; private Schlüssel verlassen niemals das Gerät |
| 📹 Video- & Audiokonferenzen | WebRTC P2P (1:1) + LiveKit-SFU (bis zu 100 Teilnehmer), Alle stummschalten und Vortragsmodus |
| 🎙️ Stimmverzerrer | Echtzeit-Stimmeffekte für Sprachnachrichten, 1:1-Anrufe und Gruppenanrufe — 3 Modi (0.8x tief / 1.0x normal / 1.2x hoch), basierend auf Web Audio API |
| 📱 Sitzungspersistenz | Behält die lokale Anmeldung bei Netzwerkausfällen, gewöhnlichen Autorisierungsfehlern und Änderungen der Server-URL bei; Abmeldung nur nach ausdrücklichem Server-Widerruf |
| 📴 Offline-Zugriff | Kontogetrennter Cache für Kontakte, Gruppen, bis zu 2.000 Nachrichten je Unterhaltung, Momente, Timeline und Medien; manuell im Profil löschbar |
| 🔎 Unicode-Freundessuche | IME-Kompositionsschutz, NFC-Normalisierung und UTF-8-Abfragekodierung ermöglichen die zuverlässige Suche chinesischer Benutzernamen und Spitznamen |
| 👥 Gruppenchat | Bis zu 2000 Mitglieder, umschaltbare Modi „Verschlüsselt" / „Unverschlüsselt" (nur Besitzer, Umschalten löscht den Chatverlauf). Verschlüsselter Modus verwendet das Signal-Sender-Key-Protokoll (XSalsa20-Poly1305 symmetrische Verschlüsselung + ECDH-Schlüsselverteilung) — nur Gruppenmitglieder können Nachrichten entschlüsseln; Bots sind im verschlüsselten Modus deaktiviert. Nicht-stören-Modus, Mitgliederverwaltung |
| 👫 Freundesystem | Freundschaftsanfragen erfordern Genehmigung mit bis zu 512 Zeichen Nachricht; Spitznamen; Multi-Tag-Gruppierung |
| ⏱️ Automatisches Löschen | 5 Stufen (nie / 1 Tag / 3 Tage / 1 Woche / 1 Monat), von beiden Seiten in DMs einstellbar, nur Besitzer in Gruppen |
| 🔔 Push-Benachrichtigungen | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS Fünf-Kanal — Benachrichtigungen auch offline (iOS nativ + chinesische Android-Geräte ohne Google-Dienste) |
| 🌐 Mehrsprachig | Chinesisch, Englisch, Japanisch, Koreanisch, Französisch, Deutsch, Russisch, Spanisch — Autoerkennung + manueller Wechsel |
| 📱 iOS — Ohne Unternehmenszertifikat | PWA über Safari „Zum Home-Bildschirm hinzufügen", funktioniert dauerhaft ohne Apple-Signierung |
| 📱 Android Native App | Verfügbar bei [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), mit FCM-Push-Unterstützung |
| 📱 iOS Native App | Verfügbar im [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178), mit APNS-Push-Unterstützung |
| 🖥️ Windows Desktop-Client | Native Windows-Desktopanwendung, [hier herunterladen](https://github.com/619dev/ppp-win/releases) |
| 🍎 Mac Desktop-Client | Native Mac-Desktopanwendung, [hier herunterladen](https://github.com/619dev/ppp-mac/releases) |
| 💬 Rich-Messaging | Text, Bilder, Video, Dokumentdateien, Sprachnachrichten, 200+ Emojis, Telegram-Stickerpakete, Lesebestätigungen, Tippanzeigen |
| 📤 Datei-Upload | Bis zu 500 MB pro Datei, Cloudflare R2 oder lokaler Speicher, mit Fortschrittsanimation |
| 🌐 Momente | WeChat-ähnlicher sozialer Feed: Text + bis zu 9 Fotos oder 1 Video (≤ 10 Min.), Likes, Kommentare, Tag-basierte Sichtbarkeit |
| 👤 Benutzerprofil | Kontaktprofilseite mit bidirektionalen Momente-Datenschutzkontrollen |
| 📰 Timeline | Xiaohongshu-ähnlicher öffentlicher Feed — zweispaltiges Masonry-Layout, anonyme Beiträge, Likes & Kommentare |
| 🏷️ Freund-Tags | Mehrere Tags pro Freund vergeben (12-Farben-Palette), Kontakte nach Tag filtern |
| 🗂️ R2 Objektspeicher | Cloudflare R2 für Bild-/Sprachdateien — optionale öffentliche CDN-URL |
| 🔑 Zwei-Faktor-Authentifizierung (2FA) | Google Authenticator–kompatibles TOTP, 8 Wiederherstellungscodes, erzwungen bei Anmeldung |
| 📷 QR-Code scannen & teilen | QR-Codes scannen zum Hinzufügen von Freunden oder Beitreten von Gruppen mit konfigurierbarem Ablaufdatum |
| 🏗️ Selbst-Hosting | Docker Compose, Zeabur One-Click oder Frontend auf Vercel |
| 🌐 Proxy-Einstellungen | SOCKS5 / HTTP / HTTPS Proxy-Unterstützung — konfigurierbar auf Login- und Einstellungsseiten mit Serveradresse, Port, Benutzername und Passwort für eingeschränkte Netzwerkumgebungen |
| 🛡️ Inhaltsmoderation | Benutzermeldungen (6 Kategorien) + Benutzer blockieren (sofortige Ausblendung von Beiträgen/Nachrichten) + Nutzungsbedingungen (EULA) |
| 🔧 Admin-Panel | Eingebettetes Web-Admin-Dashboard (`/admin`, Pfad konfigurierbar), passwortgeschützt, Meldungen prüfen, Inhalte löschen, Benutzer sperren — 8 Sprachen |

---

## Technologie-Stack
```
Backend (server/)
  Rust (Axum 0.8) — Hochleistungs-Async-Web-Framework
  sqlx + MySQL 8.0 — Benutzer-/Nachrichtenpersistenz
  deadpool-redis + Redis 7 — Online-Präsenz + knotenübergreifendes Routing
  aws-sdk-s3 — Cloudflare R2 Dateispeicher (S3-kompatible API)
  argon2 + jsonwebtoken Authentifizierung

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Zustand Zustandsverwaltung
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — Video-/Sprachanrufe
  Web Audio API — Echtzeit-Stimmverzerrer (ScriptProcessorNode Audio-Kette)
  PWA: manifest.json + Service Worker

Kryptographische Schicht
  Zustandsloses ECDH + XSalsa20-Poly1305 — Einmal-Schlüsselpaar pro Nachricht
  Vierstufige Schlüsselpersistenz: Speicher → localStorage → sessionStorage → IndexedDB
  Alle privaten Schlüssel nur auf dem Gerät gespeichert — niemals an den Server gesendet
```

---

> 📖 **[Detaillierte Bereitstellungsanleitung (中文)](DEPLOY_CN.md)** | **[Deployment Guide (English)](DEPLOY_EN.md)** — Vollständige Schritt-für-Schritt-Anleitung für Zeabur + Vercel Hybrid-Bereitstellung, Docker Compose + Nginx lokale Bereitstellung und Client-Server-Adresskonfiguration.

### Option 0: Zeabur One-Click Cloud-Bereitstellung
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> **Zeabur-Netzwerkeinschränkung:** Die Vorlage stellt LiveKit über WebSocket/API 7880 und ICE/TCP 7881 bereit. Zeabur unterstützt derzeit keine öffentlichen UDP-Dienstports; Konferenzen verwenden daher TCP-Fallback und können in schwachen Netzen höhere Latenz haben. UDP 7882 ist bereits vorbereitet. Für produktive Konferenzen mit 100 Teilnehmern empfiehlt sich LiveKit Cloud oder eine VM mit UDP-Unterstützung.

#### Serverseitige Nginx-Konfiguration

Verwenden Sie die Zwei-Domain-Produktionskonfiguration [deploy/nginx/paperphone-plus.conf](deploy/nginx/paperphone-plus.conf). Ersetzen Sie `api.example.com` und `meeting.example.com`, beziehen Sie TLS-Zertifikate, kopieren Sie die Datei nach `/etc/nginx/sites-available/paperphone-plus`, aktivieren Sie sie und führen Sie `sudo nginx -t && sudo systemctl reload nginx` aus. Setzen Sie im Backend `LIVEKIT_URL=wss://meeting.example.com`. Nginx proxyt nur API und WebSocket; TCP 7881 und UDP 7882 müssen direkt in Host- und Cloud-Firewall geöffnet werden.

> [!TIP]
> **Erweitert: Zeabur + Vercel Hybrid-Bereitstellung**
> Nach der Bereitstellung auf Zeabur können Sie den **client**-Dienst manuell löschen und das Frontend stattdessen auf Vercel bereitstellen (siehe Option 2 unten).
> So werden Server/MySQL/Redis auf Zeabur gehostet, während das Frontend durch Vercels globales CDN beschleunigt wird.
> Das Frontend benötigt **keine Umgebungsvariablen auf Vercel** — Benutzer geben einfach die Backend-Serveradresse auf der Anmeldeseite ein.

### Option 1: Docker Compose (Empfohlen)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# Bearbeiten: DB_PASS / JWT_SECRET / CF_CALLS_APP_ID usw.
docker compose up -d
open http://localhost
```

### Option 2: Frontend auf Vercel
```bash
# 1. Dieses Repository forken
# 2. In Vercel importieren: Root Directory = client/, Build = npm run build, Output = dist/
#    Keine Umgebungsvariablen erforderlich
# 3. Backend über Docker oder Zeabur bereitstellen
# 4. Vercel-Frontend öffnen, Backend-Serveradresse auf der Anmeldeseite eingeben
#    z.B. https://your-server.zeabur.app
```

### Option 3: Lokale Entwicklung
```bash
# Backend (Rust)
cd server && cp .env.example .env && cargo run --release

# Frontend (React)
cd client && npm install && npm run dev
```

---

## Stimmverzerrer

Sprachnachrichten, 1:1-Anrufe und Gruppenanrufe unterstützen Echtzeit-Stimmverzerrung mit 3 wählbaren Modi:

| Modus | Geschwindigkeit | Effekt |
|-------|----------------|--------|
| 🐢 Langsam | 0.8x | Tiefere, dunklere Stimme — ideal für Anonymität |
| 🔊 Normal | 1.0x | Originalstimme, keine Verarbeitung |
| 🐇 Schnell | 1.2x | Höhere Stimme — lustig und verspielt |

**Funktionsweise**: Verwendet die Web Audio API zum Aufbau einer Audio-Verarbeitungskette (AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination), die Tonhöhe/Geschwindigkeit des Mikrofoneingangs in Echtzeit anpasst.

- **Sprachnachrichten**: Stimmmodus während der Aufnahme wählen. Die exportierte `.webm`-Datei enthält bereits den Stimmeffekt — Empfänger können die Originalstimme nicht wiederherstellen, was echtes anonymes Messaging ermöglicht
- **1:1 / Gruppenanrufe**: Tippen Sie während eines Anrufs auf die Stimmverzerrer-Taste, um durch die Modi zu wechseln. Die verarbeitete Audiospur ersetzt das Original über `RTCRtpSender.replaceTrack()`

> Keine serverseitige Konfiguration erforderlich. Der Stimmverzerrer läuft vollständig clientseitig.

---

## Umgebungsvariablen
| Variable | Beschreibung | Standard |
|----------|-------------|----------|
| `PORT` | Server-Port | `3000` |
| `JWT_SECRET` | JWT-Signierungsschlüssel (**in Produktion ändern**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | MySQL-Verbindung | — |
| `REDIS_HOST` / `REDIS_PASS` | Redis-Verbindung | — |
| `R2_ACCOUNT_ID` | Cloudflare Account-ID | — |
| `R2_ACCESS_KEY_ID` | R2 API Token Access Key | — |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret Key | — |
| `R2_BUCKET` | R2 Bucket-Name | — |
| `R2_PUBLIC_URL` | Öffentliche R2-Basis-URL (optional) | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID (optional) | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret (optional) | — |
| `METERED_TURN_API_KEY` | Metered.ca TURN API Key (optional, kostenlose Alternative) | — |
| `VAPID_PUBLIC_KEY` | Web Push VAPID Public Key (optional) | — |
| `VAPID_PRIVATE_KEY` | Web Push VAPID Private Key (optional) | — |
| `VAPID_SUBJECT` | VAPID Kontakt-E-Mail (optional) | `mailto:admin@paperphoneplus.app` |
| `FCM_PROJECT_ID` | Firebase Projekt-ID (optional, Capacitor Android) | — |
| `FCM_CLIENT_EMAIL` | Firebase-Dienstkonto-E-Mail (optional) | — |
| `FCM_PRIVATE_KEY` | Firebase-Dienstkonto Private Key (optional, unterstützt sowohl `\n`-Escape als auch echte Zeilenumbrüche; siehe unten) | — |
| `FCM_RELAY_SECRET` | FCM Push-Relay-Geheimnis (optional, auf Relay-Host setzen) | — |
| `FCM_RELAY_URL` | FCM Push-Relay-URL (optional, selbstgehostete Server zeigen auf Relay-Host) | — |
| `FCM_RELAY_KEY` | FCM Push-Relay-Auth-Schlüssel (optional, muss mit `FCM_RELAY_SECRET` des Relay-Hosts übereinstimmen) | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID (optional) | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key (optional) | — |
| `ONESIGNAL_RELAY_SECRET` | OneSignal Push-Relay-Geheimnis (optional, auf Relay-Host setzen) | — |
| `ONESIGNAL_RELAY_URL` | OneSignal Push-Relay-URL (optional, selbstgehostete Server zeigen auf Relay-Host) | — |
| `ONESIGNAL_RELAY_KEY` | OneSignal Push-Relay-Auth-Schlüssel (optional, muss mit `ONESIGNAL_RELAY_SECRET` des Relay-Hosts übereinstimmen) | — |
| `NTFY_BASE_URL` | ntfy Server-URL (optional, nutzt standardmäßig öffentlichen ntfy.sh-Dienst) | `https://ntfy.sh` |
| `NTFY_TOKEN` | ntfy Auth-Token (optional, für selbstgehostete Server) | — |
| `APNS_TEAM_ID` | Apple Developer Team ID (optional, iOS native Push) | — |
| `APNS_KEY_ID` | APNS Auth Key ID (optional) | — |
| `APNS_PRIVATE_KEY` | APNS .p8 Private Key Inhalt (optional, unterstützt `\n`-Escape) | — |
| `APNS_BUNDLE_ID` | iOS App Bundle Identifier (optional) | — |
| `APNS_SANDBOX` | APNS Sandbox-Modus (optional, `true` für Entwicklung/TestFlight) | `false` |
| `APNS_RELAY_SECRET` | Push-Relay-Geheimnis (optional, auf Relay-Host setzen) | — |
| `APNS_RELAY_URL` | Push-Relay-URL (optional, selbstgehostete Server zeigen auf Relay-Host) | — |
| `APNS_RELAY_KEY` | Push-Relay-Auth-Schlüssel (optional, muss mit `APNS_RELAY_SECRET` des Relay-Hosts übereinstimmen) | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (optional) | — |
| `STICKER_PACKS` | Benutzerdefinierte Stickerpakete (optional, `Name:Label`) | 12 integrierte Standards |
| `ADMIN_PATH` | Admin-Panel URL-Pfad | `/admin` |
| `ADMIN_PASSWORD` | Admin-Panel Passwort (**in Produktion ändern**) | `admin123` |

### FCM Private Key Zeilenumbruch-Behandlung

Das `private_key`-Feld in der Firebase-Dienstkonto-JSON-Datei enthält einen RSA-Privatschlüssel im PEM-Format, der **echte Zeilenumbrüche** (`\n`, ASCII 0x0A) zwischen jeder 64-Zeichen-Zeile erfordert. Viele Bereitstellungsplattformen (Zeabur, Vercel, Railway, Docker) speichern Umgebungsvariablen jedoch als einzeilige Strings und konvertieren `\n` in die wörtliche Zwei-Zeichen-Sequenz `\` + `n`.

**Dies ist die häufigste Ursache für FCM-Push-Benachrichtigungsfehler** — der PEM-Parser schlägt stillschweigend fehl und es werden keine Push-Benachrichtigungen gesendet, ohne Fehlerprotokolle.

**Der Server behandelt dies automatisch**: `fcm.rs` normalisiert wörtliche `\n`-Sequenzen zurück zu echten Zeilenumbrüchen vor dem Parsing. Beide Formate funktionieren:

- **Einzeilig (empfohlen für Cloud-Plattformen)**: Den rohen `private_key`-Wert aus der JSON-Datei mit `\n`-Escapes einfügen:
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **Mehrzeilig (für .env-Dateien)**: Den vollständigen PEM-Inhalt in Anführungszeichen mit echten Zeilenumbrüchen einschließen:
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| Plattform | Empfohlenes Format | Hinweise |
|-----------|-------------------|----------|
| **Zeabur** | Einzeilig (`\n` escaped) | JSON-Wert direkt im Variables-Panel einfügen |
| **Docker / docker-compose** | Beides | YAML `\|` für mehrzeilig; einzeilig in `.env` |
| **Vercel / Railway** | Einzeilig (`\n` escaped) | Eingabefelder unterstützen typischerweise keine echten Zeilenumbrüche |
| **Linux .env-Datei** | Mehrzeilig (in Anführungszeichen) | Sicherstellen, dass Anführungszeichen korrekt geschlossen sind |

**Fehlerbehebung**: Wenn FCM-Variablen gesetzt sind, aber Android-Push nicht funktioniert, Serverprotokolle prüfen:
- `[FCM] No access token available` → Private Key Format-Fehler (Zeilenumbruch-Problem)
- `[FCM] ✅ Push sent to user xxx` → FCM-Versand funktioniert, Problem ist clientseitig
- Keine FCM-Protokolle → `FCM_PROJECT_ID` nicht gesetzt oder kein Token in der `fcm_tokens`-Tabelle

### ntfy Push (Chinesische Android-Geräte ohne Google-Dienste)

Für Android-Geräte ohne Google Mobile Services (Huawei, Xiaomi, OPPO, vivo usw.) unterstützt PaperPhonePlus Push-Benachrichtigungen über [ntfy](https://ntfy.sh).

**Standard-Setup (Null-Konfiguration)**: Nutzt den öffentlichen ntfy.sh-Dienst. Keine zusätzliche Konfiguration erforderlich.

**Optionale Konfiguration** (für selbstgehostete ntfy-Server):

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**Benutzer-Setup**:
1. ntfy App installieren ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [Direktdownload](https://ntfy.sh))
2. PaperPhonePlus-Einstellungen öffnen und die „ntfy Push"-Karte finden
3. Den angezeigten Topic-Namen kopieren und in der ntfy App abonnieren
4. Auf „Push registrieren" tippen, um die Registrierung abzuschließen

> **Sicherheitshinweis**: ntfy-Benachrichtigungen enthalten Benachrichtigungstitel und Zusammenfassungen im Klartext (nicht den eigentlichen Nachrichteninhalt). Für höhere Sicherheit einen selbstgehosteten ntfy-Server verwenden.

### APNS Push (Native iOS App)

APNS (Apple Push Notification Service) sendet Push-Benachrichtigungen an native iOS-Apps, die mit Capacitor erstellt wurden. Es gibt zwei Konfigurationsmöglichkeiten:

#### Option A: Direkte Konfiguration (Server des App-Entwicklers)

1. Bei [Apple Developer](https://developer.apple.com/account) anmelden → **Certificates, Identifiers & Profiles** → **Keys**
2. **+** klicken, um einen neuen Key zu erstellen → **Apple Push Notifications service (APNs)** aktivieren → Register
3. **`.p8`-Datei herunterladen** (⚠️ kann nur einmal heruntergeladen werden!) und die **Key ID** notieren
4. **Team ID** von der Apple Developer Mitgliedschaftsseite notieren (10-stellig alphanumerisch)
5. In `server/.env` einfügen:

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(.p8-Dateiinhalt)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphoneplus
APNS_SANDBOX=false
```

> `APNS_SANDBOX`: Auf `true` für Entwicklung/TestFlight-Builds, `false` für App Store-Produktion setzen.

#### Option B: Über Push Relay (Selbstgehostete Server)

Wenn Sie die iOS-App eines anderen verwenden (z.B. aus dem App Store heruntergeladen), haben Sie keine Apple-Zugangsdaten des Entwicklers und können keine APNS-Pushes direkt senden. Verwenden Sie stattdessen den **Push Relay**.

**Funktionsweise:**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  Selbstgehosteter     │  HTTP  │  Server des Entwicklers  │  APNS  │  Apple  │
│  Server               │──────→│  (hat .p8 Key + Relay)   │──────→│  ──→ 📱 │
│  (keine Apple-Creds)  │       │                          │       └─────────┘
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**Schritt 1: App-Entwickler aktiviert den Relay-Endpunkt**

Auf dem Server des App-Entwicklers (der bereits APNS-Zugangsdaten hat) ein Relay-Geheimnis setzen:

```env
# Server des App-Entwicklers .env (hat bereits APNS_TEAM_ID usw.)
APNS_RELAY_SECRET=ein_langer_zufälliger_gemeinsamer_Schlüssel
```

Dies aktiviert automatisch den Push-Relay-Endpunkt unter `POST /api/push-relay/apns`.

**Schritt 2: Selbstgehosteter Benutzer konfiguriert den Relay**

Selbstgehostete Server benötigen nur zwei Variablen — **keine Apple-Zugangsdaten erforderlich**:

```env
# Selbstgehosteter Server .env
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=gemeinsamer_Schlüssel_aus_Schritt_1
```

**Ablauf:**
1. Selbstgehosteter Server empfängt eine Offline-Nachricht → fragt lokale `apns_tokens`-Tabelle nach iOS-Geräte-Tokens des Benutzers ab
2. Sendet Geräte-Tokens + Push-Titel/Inhalt per HTTP POST an den Relay
3. Relay validiert den Schlüssel und sendet dann mit eigenen APNS-Zugangsdaten an Apple
4. Relay gibt eine Liste abgelaufener Tokens zurück; der selbstgehostete Server bereinigt automatisch seine lokale Datenbank

> **Priorität**: Lokale APNS-Zugangsdaten → Push Relay → Überspringen (still). Wenn beide konfiguriert sind, hat die lokale Direktverbindung Vorrang.

> **Sicherheitshinweis**: Der Relay überträgt nur Push-Benachrichtigungstitel und Zusammenfassungen (z.B. „Jemand hat Ihnen eine Nachricht gesendet"), nicht den eigentlichen Nachrichteninhalt. Geräte-Tokens können nicht zum Lesen von Benutzerdaten verwendet werden.

### Push Relay (Alle Kanäle)

Für selbstgehostete Server-Betreiber, die die veröffentlichte App eines anderen verwenden (z.B. aus dem App Store/Google Play), haben Sie keine Push-Zugangsdaten des Entwicklers (Apple .p8 Key / Firebase-Dienstkonto / OneSignal API Key).

Das Push-Relay-System bietet Relay-Fähigkeit für **APNS, FCM und OneSignal** Kanäle:

**App-Entwickler** aktiviert Relay-Endpunkte auf seinem Server:

```env
# Server des App-Entwicklers .env
APNS_RELAY_SECRET=ein_langer_zufälliger_String
FCM_RELAY_SECRET=ein_langer_zufälliger_String
ONESIGNAL_RELAY_SECRET=ein_langer_zufälliger_String
```

**Selbstgehostete Benutzer** benötigen nur Relay-URL und Schlüssel — **keine Push-Service-Zugangsdaten erforderlich**:

```env
# Selbstgehosteter Server .env
# APNS (iOS native Push)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=gemeinsamer_Schlüssel

# FCM (Android native Push)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=gemeinsamer_Schlüssel

# OneSignal (Median.co-verpackte Apps)
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=gemeinsamer_Schlüssel
```

> **Priorität**: Lokale Zugangsdaten → Push Relay → Überspringen (still). Wenn beide konfiguriert sind, hat die lokale Direktverbindung Vorrang.

---

## Offizieller Push Relay

Selbstgehostete Server-Betreiber können den offiziellen Push Relay verwenden, um iOS/Android Push-Benachrichtigungen ohne Konfiguration von Push-Zugangsdaten zu aktivieren:

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

Diese Zeilen zur `.env`-Datei Ihres selbstgehosteten Servers hinzufügen.

---

## Lizenz
Dieses Projekt ist unter der [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) lizenziert.
