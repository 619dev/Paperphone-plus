🌐 **Autres langues :** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

Une application de messagerie instantanée chiffrée de bout en bout, style WeChat, avec chiffrement ECDH + XSalsa20-Poly1305 sans état par message, appels vidéo en temps réel, stockage de fichiers Cloudflare R2, support multilingue et déploiement PWA iOS.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20Mesh-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-Télécharger-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-Télécharger-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-Client-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-Client-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

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
<img width=30% height=30% src="screenshot/ui17.jpg" alt="ui17">
<img width=30% height=30% src="screenshot/ui18.jpg" alt="ui18">

</details>

## Fonctionnalités
| Fonctionnalité | Description |
|----------------|-------------|
| 🔐 Chiffrement de bout en bout | ECDH sans état + XSalsa20-Poly1305 — clés éphémères par message, forward secrecy, vérification du numéro de sécurité style Signal |
| 🗝️ Serveur à connaissance nulle | Le serveur ne stocke que le texte chiffré ; les clés privées ne quittent jamais l'appareil |
| 📹 Appels vidéo et audio | WebRTC P2P (1:1) + Mesh (groupe), Cloudflare TURN pour la traversée NAT |
| 🎙️ Modificateur de voix | Effets vocaux en temps réel pour les messages vocaux, appels 1:1 et appels de groupe — 3 modes (0.8x grave / 1.0x normal / 1.2x aigu), basé sur Web Audio API |
| 👥 Chat de groupe | Jusqu'à 2000 membres, messages en texte brut (non chiffré), mode Ne pas déranger, gestion des membres |
| 👫 Système d'amis | Les demandes d'amitié nécessitent une approbation avec jusqu'à 512 caractères de message ; surnoms personnalisés ; regroupement par étiquettes |
| ⏱️ Suppression automatique des messages | 5 niveaux (jamais / 1 jour / 3 jours / 1 semaine / 1 mois), configurable par les deux parties en DM, uniquement par le propriétaire dans les groupes |
| 🔔 Notifications push | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS cinq canaux — atteint les utilisateurs même hors ligne (iOS natif + Android chinois sans Google Services) |
| 🌐 Multilingue | Chinois, anglais, japonais, coréen, français, allemand, russe, espagnol — détection automatique + changement manuel |
| 📱 iOS — Sans certificat d'entreprise | PWA via Safari « Ajouter à l'écran d'accueil », fonctionne en permanence sans signature Apple |
| 📱 App native Android | Disponible sur [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), avec support des notifications push FCM |
| 📱 App native iOS | Disponible sur l'[App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178), avec support des notifications push APNS |
| 🖥️ Client bureau Windows | Application de bureau Windows native, [télécharger ici](https://github.com/619dev/ppp-win/releases) |
| 🍎 Client bureau Mac | Application de bureau Mac native, [télécharger ici](https://github.com/619dev/ppp-mac/releases) |
| 💬 Messagerie enrichie | Texte, images, vidéo, fichiers documents, messages vocaux, 200+ emojis, packs de stickers Telegram, accusés de réception, indicateurs de saisie |
| 📤 Téléversement de fichiers | Jusqu'à 500 Mo par fichier, Cloudflare R2 ou stockage local, avec animation de progression |
| 🌐 Moments | Fil social style WeChat : texte + jusqu'à 9 photos ou 1 vidéo (≤ 10 min), likes, commentaires, visibilité par étiquettes |
| 👤 Profil utilisateur | Page de profil de contact avec contrôles de confidentialité bidirectionnels des Moments |
| 📰 Fil d'actualité | Fil public style Xiaohongshu — mise en page masonry à deux colonnes, publications anonymes, likes et commentaires |
| 🏷️ Étiquettes d'amis | Attribuer plusieurs étiquettes par ami (palette de 12 couleurs), filtrer les contacts par étiquette |
| 🗂️ Stockage d'objets R2 | Cloudflare R2 pour les fichiers image/audio — URL CDN publique optionnelle |
| 🔑 Authentification à deux facteurs (2FA) | TOTP compatible Google Authenticator, 8 codes de récupération, obligatoire à la connexion |
| 📷 Scanner et partager des QR codes | Scanner des QR codes pour ajouter des amis ou rejoindre des groupes avec expiration configurable |
| 🏗️ Auto-hébergeable | Docker Compose, Zeabur en un clic, ou frontend sur Vercel |
| 🌐 Paramètres de proxy | Support proxy SOCKS5 / HTTP / HTTPS — configurable sur les pages de connexion et de paramètres avec adresse serveur, port, identifiant et mot de passe pour les environnements réseau restreints |
| 🛡️ Modération de contenu | Signalements utilisateurs (6 catégories) + blocage d'utilisateurs (masquage instantané des publications/messages) + Conditions d'utilisation (EULA) |
| 🔧 Panneau d'administration | Dashboard web d'administration intégré (`/admin`, chemin configurable), protégé par mot de passe, examiner les signalements, supprimer le contenu problématique, bannir des utilisateurs — 8 langues |

---

## Stack technique
```
Backend (server/)
  Rust (Axum 0.8) — Framework web asynchrone haute performance
  sqlx + MySQL 8.0 — Persistance des utilisateurs/messages
  deadpool-redis + Redis 7 — Présence en ligne + routage inter-nœuds
  aws-sdk-s3 — Stockage fichiers Cloudflare R2 (API compatible S3)
  Authentification argon2 + jsonwebtoken

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Gestion d'état Zustand
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — appels vidéo / audio
  Web Audio API — modificateur de voix en temps réel (chaîne audio ScriptProcessorNode)
  PWA : manifest.json + Service Worker

Couche cryptographique
  ECDH sans état + XSalsa20-Poly1305 — paire de clés éphémère par message
  Persistance des clés à quatre niveaux : mémoire → localStorage → sessionStorage → IndexedDB
  Toutes les clés privées stockées uniquement sur l'appareil — jamais envoyées au serveur
```

---

### Option 0 : Déploiement cloud Zeabur en un clic
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> [!TIP]
> **Avancé : Déploiement hybride Zeabur + Vercel**
> Après le déploiement sur Zeabur, vous pouvez supprimer manuellement le service **client** et déployer le frontend sur Vercel à la place (voir Option 2 ci-dessous).
> Ainsi, server/MySQL/Redis sont hébergés sur Zeabur tandis que le frontend est accéléré par le CDN mondial de Vercel.
> Le frontend ne nécessite **aucune variable d'environnement sur Vercel** — les utilisateurs saisissent simplement l'adresse du serveur backend sur la page de connexion.

### Option 1 : Docker Compose (Recommandé)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# Modifier : DB_PASS / JWT_SECRET / CF_CALLS_APP_ID etc.
docker compose up -d
open http://localhost
```

### Option 2 : Frontend sur Vercel
```bash
# 1. Forker ce dépôt
# 2. Importer dans Vercel : Root Directory = client/, Build = npm run build, Output = dist/
#    Aucune variable d'environnement requise
# 3. Déployer le backend via Docker ou Zeabur
# 4. Ouvrir le frontend déployé sur Vercel, saisir l'adresse du serveur backend sur la page de connexion
#    ex. https://your-server.zeabur.app
```

### Option 3 : Développement local
```bash
# Backend (Rust)
cd server && cp .env.example .env && cargo run --release

# Frontend (React)
cd client && npm install && npm run dev
```

---

## Modificateur de voix

Les messages vocaux, les appels 1:1 et les appels de groupe supportent la modification de voix en temps réel avec 3 modes sélectionnables :

| Mode | Vitesse | Effet |
|------|---------|-------|
| 🐢 Lent | 0.8x | Voix plus profonde et grave — idéal pour l'anonymat |
| 🔊 Normal | 1.0x | Voix originale, aucun traitement |
| 🐇 Rapide | 1.2x | Voix plus aiguë — amusant et ludique |

**Fonctionnement** : Utilise la Web Audio API pour construire une chaîne de traitement audio (AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination) qui ajuste la hauteur/vitesse de l'entrée microphone en temps réel.

- **Messages vocaux** : Sélectionner le mode vocal pendant l'enregistrement. Le fichier `.webm` exporté contient déjà l'effet vocal — les destinataires ne peuvent pas restaurer la voix originale, permettant une messagerie véritablement anonyme
- **Appels 1:1 / Groupe** : Appuyer sur le bouton modificateur de voix pendant un appel pour alterner entre les modes. La piste audio traitée remplace l'originale via `RTCRtpSender.replaceTrack()`

> Aucune configuration côté serveur requise. Le modificateur de voix fonctionne entièrement côté client.

---

## Variables d'environnement
| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `3000` |
| `JWT_SECRET` | Clé de signature JWT (**changer en production**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | Connexion MySQL | — |
| `REDIS_HOST` / `REDIS_PASS` | Connexion Redis | — |
| `R2_ACCOUNT_ID` | ID de compte Cloudflare | — |
| `R2_ACCESS_KEY_ID` | Access Key du jeton API R2 | — |
| `R2_SECRET_ACCESS_KEY` | Secret Key du jeton API R2 | — |
| `R2_BUCKET` | Nom du bucket R2 | — |
| `R2_PUBLIC_URL` | URL de base publique R2 (optionnel) | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID (optionnel) | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret (optionnel) | — |
| `METERED_TURN_API_KEY` | Metered.ca TURN API Key (optionnel, alternative gratuite) | — |
| `VAPID_PUBLIC_KEY` | Clé publique VAPID Web Push (optionnel) | — |
| `VAPID_PRIVATE_KEY` | Clé privée VAPID Web Push (optionnel) | — |
| `VAPID_SUBJECT` | Email de contact VAPID (optionnel) | `mailto:admin@paperphone.app` |
| `FCM_PROJECT_ID` | ID du projet Firebase (optionnel, Capacitor Android) | — |
| `FCM_CLIENT_EMAIL` | Email du compte de service Firebase (optionnel) | — |
| `FCM_PRIVATE_KEY` | Clé privée du compte de service Firebase (optionnel, supporte l'échappement `\n` et les sauts de ligne réels ; voir ci-dessous) | — |
| `FCM_RELAY_SECRET` | Secret du relay push FCM (optionnel, configurer sur l'hôte relay pour activer le endpoint) | — |
| `FCM_RELAY_URL` | URL du relay push FCM (optionnel, les serveurs auto-hébergés pointent vers l'hôte relay) | — |
| `FCM_RELAY_KEY` | Clé d'authentification du relay push FCM (optionnel, doit correspondre au `FCM_RELAY_SECRET` de l'hôte relay) | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID (optionnel) | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key (optionnel) | — |
| `ONESIGNAL_RELAY_SECRET` | Secret du relay push OneSignal (optionnel, configurer sur l'hôte relay pour activer le endpoint) | — |
| `ONESIGNAL_RELAY_URL` | URL du relay push OneSignal (optionnel, les serveurs auto-hébergés pointent vers l'hôte relay) | — |
| `ONESIGNAL_RELAY_KEY` | Clé d'authentification du relay push OneSignal (optionnel, doit correspondre au `ONESIGNAL_RELAY_SECRET` de l'hôte relay) | — |
| `NTFY_BASE_URL` | URL du serveur ntfy (optionnel, utilise le service public ntfy.sh par défaut) | `https://ntfy.sh` |
| `NTFY_TOKEN` | Jeton d'authentification ntfy (optionnel, pour les serveurs auto-hébergés) | — |
| `APNS_TEAM_ID` | Apple Developer Team ID (optionnel, push natif iOS) | — |
| `APNS_KEY_ID` | ID de clé d'authentification APNS (optionnel) | — |
| `APNS_PRIVATE_KEY` | Contenu de la clé privée .p8 APNS (optionnel, supporte l'échappement `\n`) | — |
| `APNS_BUNDLE_ID` | iOS App Bundle Identifier (optionnel) | — |
| `APNS_SANDBOX` | Mode sandbox APNS (optionnel, `true` pour développement/TestFlight) | `false` |
| `APNS_RELAY_SECRET` | Secret du relay push (optionnel, configurer sur l'hôte relay pour activer le endpoint) | — |
| `APNS_RELAY_URL` | URL du relay push (optionnel, les serveurs auto-hébergés pointent vers l'hôte relay) | — |
| `APNS_RELAY_KEY` | Clé d'authentification du relay push (optionnel, doit correspondre au `APNS_RELAY_SECRET` de l'hôte relay) | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (optionnel) | — |
| `STICKER_PACKS` | Packs de stickers personnalisés (optionnel, `nom:label`) | 9 packs intégrés par défaut |
| `ADMIN_PATH` | Chemin URL du panneau d'administration | `/admin` |
| `ADMIN_PASSWORD` | Mot de passe du panneau d'administration (**changer en production**) | `admin123` |

### Gestion des sauts de ligne de la clé privée FCM

Le champ `private_key` dans le JSON du compte de service Firebase contient une clé privée RSA au format PEM, qui nécessite des **sauts de ligne réels** (`\n`, ASCII 0x0A) entre chaque ligne de 64 caractères. Cependant, de nombreuses plateformes de déploiement (Zeabur, Vercel, Railway, Docker) stockent les variables d'environnement sous forme de chaînes sur une seule ligne, convertissant `\n` en la séquence littérale de deux caractères `\` + `n`.

**C'est la cause la plus fréquente d'échec des notifications push FCM** — le parseur PEM échoue silencieusement et aucune notification push n'est envoyée, sans journaux d'erreur.

**Le serveur gère cela automatiquement** : `fcm.rs` normalise les séquences littérales `\n` en sauts de ligne réels avant l'analyse. Les deux formats fonctionnent :

- **Ligne unique (recommandé pour les plateformes cloud)** : Coller la valeur brute de `private_key` du fichier JSON avec les échappements `\n` :
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **Multi-lignes (pour les fichiers .env)** : Envelopper le contenu PEM complet entre guillemets avec des sauts de ligne réels :
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| Plateforme | Format recommandé | Notes |
|------------|-------------------|-------|
| **Zeabur** | Ligne unique (`\n` échappé) | Coller la valeur JSON directement dans le panneau Variables |
| **Docker / docker-compose** | Les deux | Utiliser la syntaxe YAML `\|` pour multi-lignes ; ligne unique dans `.env` |
| **Vercel / Railway** | Ligne unique (`\n` échappé) | Les champs de saisie ne supportent généralement pas les sauts de ligne réels |
| **Fichier .env Linux** | Multi-lignes (entre guillemets) | S'assurer que les guillemets sont correctement fermés |

**Dépannage** : Si les variables FCM sont configurées mais que le push Android ne fonctionne pas, vérifier les journaux du serveur :
- `[FCM] No access token available` → Erreur de format de clé privée (problème de saut de ligne)
- `[FCM] ✅ Push sent to user xxx` → L'envoi FCM fonctionne, le problème est côté client
- Aucun journal FCM → `FCM_PROJECT_ID` non configuré ou aucun token dans la table `fcm_tokens`

### Push ntfy (Appareils Android chinois sans Google Services)

Pour les appareils Android sans Google Mobile Services (Huawei, Xiaomi, OPPO, vivo, etc.), PaperPhone supporte les notifications push via [ntfy](https://ntfy.sh).

**Configuration par défaut (zéro configuration)** : Utilise le service public ntfy.sh. Aucune configuration supplémentaire nécessaire.

**Configuration optionnelle** (pour les serveurs ntfy auto-hébergés) :

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**Procédure de configuration utilisateur** :
1. Installer l'application ntfy ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [Téléchargement direct](https://ntfy.sh))
2. Ouvrir les Paramètres de PaperPhone et trouver la carte « ntfy Push »
3. Copier le nom du topic affiché et s'y abonner dans l'application ntfy
4. Appuyer sur « Enregistrer Push » pour terminer l'inscription

> **Note de sécurité** : Les notifications ntfy contiennent les titres et résumés en texte brut (pas le contenu réel du message). Pour une sécurité renforcée, envisagez d'auto-héberger un serveur ntfy.

### Push APNS (App native iOS)

APNS (Apple Push Notification Service) envoie des notifications push aux apps iOS natives construites avec Capacitor. Deux options de configuration sont disponibles :

#### Option A : Configuration directe (Serveur du développeur de l'app)

1. Se connecter à [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Keys**
2. Cliquer sur **+** pour créer une nouvelle Key → cocher **Apple Push Notifications service (APNs)** → Register
3. **Télécharger le fichier `.p8`** (⚠️ ne peut être téléchargé qu'une seule fois !) et noter le **Key ID**
4. Noter votre **Team ID** depuis la page de membre Apple Developer (10 caractères alphanumériques)
5. Ajouter à `server/.env` :

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(contenu du fichier .p8)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphone
APNS_SANDBOX=false
```

> `APNS_SANDBOX` : Définir à `true` pour les builds de développement/TestFlight, `false` pour la production App Store.

#### Option B : Via Push Relay (Serveurs auto-hébergés)

Si vous utilisez l'app iOS de quelqu'un d'autre (ex. téléchargée depuis l'App Store), vous n'avez pas les identifiants Apple du développeur et ne pouvez pas envoyer de pushes APNS directement. Utilisez le **Push Relay** à la place.

**Fonctionnement :**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  Serveur              │  HTTP  │  Serveur du              │  APNS  │  Apple  │
│  auto-hébergé         │──────→│  développeur             │──────→│  ──→ 📱 │
│  (sans creds Apple)   │       │  (a .p8 Key + Relay)     │       └─────────┘
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**Étape 1 : Le développeur de l'app active le endpoint Relay**

Sur le serveur du développeur de l'app (qui possède déjà les identifiants APNS), configurer un secret relay :

```env
# .env du serveur du développeur (a déjà APNS_TEAM_ID etc.)
APNS_RELAY_SECRET=un_long_secret_partagé_aléatoire
```

Cela active automatiquement le endpoint de relay push à `POST /api/push-relay/apns`.

**Étape 2 : L'utilisateur auto-hébergé configure le Relay**

Les serveurs auto-hébergés n'ont besoin que de deux variables — **aucun identifiant Apple requis** :

```env
# .env du serveur auto-hébergé
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=le_secret_partagé_de_l_étape_1
```

**Fonctionnement :**
1. Le serveur auto-hébergé reçoit un message hors ligne → interroge la table locale `apns_tokens` pour les tokens d'appareils iOS de l'utilisateur
2. Envoie les tokens d'appareils + titre/contenu push via HTTP POST au Relay
3. Le Relay valide la clé, puis envoie à Apple en utilisant ses propres identifiants APNS
4. Le Relay retourne une liste de tokens obsolètes ; le serveur auto-hébergé nettoie automatiquement sa base de données locale

> **Priorité** : Identifiants APNS locaux → Push Relay → Ignorer (silencieux). Si les deux sont configurés, la connexion directe locale a la priorité.

> **Note de sécurité** : Le relay ne transmet que les titres et résumés des notifications push (ex. « Quelqu'un vous a envoyé un message »), pas le contenu réel du message. Les tokens d'appareils ne peuvent pas être utilisés pour lire les données des utilisateurs.

### Push Relay (Tous les canaux)

Pour les opérateurs de serveurs auto-hébergés utilisant l'app publiée par quelqu'un d'autre (ex. depuis l'App Store/Google Play), vous n'avez pas les identifiants push du développeur (Apple .p8 Key / compte de service Firebase / OneSignal API Key).

Le système Push Relay fournit une capacité de relais pour les canaux **APNS, FCM et OneSignal** :

**Le développeur de l'app** active les endpoints relay sur son serveur :

```env
# .env du serveur du développeur
APNS_RELAY_SECRET=une_longue_chaîne_aléatoire
FCM_RELAY_SECRET=une_longue_chaîne_aléatoire
ONESIGNAL_RELAY_SECRET=une_longue_chaîne_aléatoire
```

**Les utilisateurs auto-hébergés** n'ont besoin que de l'URL et la clé du relay — **aucun identifiant de service push requis** :

```env
# .env du serveur auto-hébergé
# APNS (push natif iOS)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=secret_partagé

# FCM (push natif Android)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=secret_partagé

# OneSignal (apps empaquetées avec Median.co)
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=secret_partagé
```

> **Priorité** : Identifiants locaux → Push Relay → Ignorer (silencieux). Si les deux sont configurés, la connexion directe locale a la priorité.

---

## Push Relay officiel

Les opérateurs de serveurs auto-hébergés peuvent utiliser le relay push officiel pour activer les notifications push iOS/Android sans configurer d'identifiants push :

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

Ajoutez ces lignes au fichier `.env` de votre serveur auto-hébergé.

---

## Licence

Ce projet est distribué sous la [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
