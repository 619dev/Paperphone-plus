🌐 **他の言語:** [中文](README.md) · [English](README_EN.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat スタイルのエンドツーエンド暗号化メッセンジャー。ステートレス ECDH + XSalsa20-Poly1305 によるメッセージごとの暗号化、リアルタイムビデオ通話、Cloudflare R2 ファイルストレージ、多言語サポート、iOS PWA デプロイに対応。

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20Mesh-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-ダウンロード-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-ダウンロード-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-クライアント-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-クライアント-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

---

<details>
<summary>📸 スクリーンショット（クリックで展開）</summary>


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

## 機能一覧
| 機能 | 説明 |
|------|------|
| 🔐 エンドツーエンド暗号化 | ステートレス ECDH + XSalsa20-Poly1305 — メッセージごとの一時鍵、Forward Secrecy、Signal スタイルの安全番号検証 |
| 🗝️ ゼロ知識サーバー | サーバーは暗号文のみ保存、秘密鍵はデバイスから外に出ることなし |
| 📹 ビデオ・音声通話 | WebRTC P2P（1:1）+ Mesh（グループ）、Cloudflare TURN による NAT トラバーサル |
| 🎙️ ボイスチェンジャー | 音声メッセージ、1:1 通話、グループ通話でリアルタイム変声 — 3 モード（0.8x 低音 / 1.0x 通常 / 1.2x 高音）、Web Audio API ベース |
| 👥 グループチャット | 最大 2000 人、プレーンテキストメッセージ（暗号化なし）、おやすみモード、メンバー管理 |
| 👫 フレンドシステム | 友達リクエストは承認制（最大 512 文字のメッセージ付き）、ニックネーム設定、マルチタググループ化 |
| ⏱️ メッセージ自動削除 | 5 段階（なし / 1 日 / 3 日 / 1 週間 / 1 ヶ月）、DM では双方が設定可能、グループではオーナーのみ |
| 🔔 プッシュ通知 | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS 5 チャネル — オフラインでも通知到達（iOS ネイティブ + Google サービスなしの中国製 Android 対応） |
| 🌐 多言語対応 | 中国語、英語、日本語、韓国語、フランス語、ドイツ語、ロシア語、スペイン語 — 自動検出 + 手動切替 |
| 📱 iOS — 企業証明書不要 | Safari「ホーム画面に追加」による PWA、Apple 署名なしで永続的に動作 |
| 📱 Android ネイティブアプリ | [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus) で公開中、FCM プッシュ通知対応 |
| 📱 iOS ネイティブアプリ | [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178) で公開中、APNS プッシュ通知対応 |
| 🖥️ Windows デスクトップクライアント | ネイティブ Windows デスクトップアプリ、[ダウンロードはこちら](https://github.com/619dev/ppp-win/releases) |
| 🍎 Mac デスクトップクライアント | ネイティブ Mac デスクトップアプリ、[ダウンロードはこちら](https://github.com/619dev/ppp-mac/releases) |
| 💬 リッチメッセージ | テキスト、画像、動画、ドキュメントファイル、音声メッセージ、200+ 絵文字、Telegram ステッカーパック、既読確認、入力中インジケーター |
| 📤 ファイルアップロード | 1 ファイル最大 500MB、Cloudflare R2 またはローカルストレージ、進捗アニメーション付き |
| 🌐 モーメンツ | WeChat スタイルのソーシャルフィード：テキスト + 最大 9 枚の写真または 1 本の動画（≤ 10 分）、いいね、コメント、タグベースの公開範囲設定 |
| 👤 ユーザープロフィール | 連絡先プロフィールページ、モーメンツの双方向プライバシーコントロール付き |
| 📰 タイムライン | 小紅書スタイルの公開フィード — 2 列マソンリーレイアウト、匿名投稿、いいね＆コメント |
| 🏷️ フレンドタグ | 友達に複数タグを付与（12 色パレット）、タグでコンタクトをフィルタリング |
| 🗂️ R2 オブジェクトストレージ | Cloudflare R2 で画像/音声ファイルを保存 — オプションの公開 CDN URL |
| 🔑 二要素認証 (2FA) | Google Authenticator 互換 TOTP、8 個のリカバリーコード、ログイン時に強制 |
| 📷 QR コードスキャン＆共有 | QR コードをスキャンして友達追加やグループ参加、有効期限設定可能 |
| 🏗️ セルフホスト対応 | Docker Compose、Zeabur ワンクリック、またはフロントエンドを Vercel にデプロイ |
| 🌐 プロキシ設定 | SOCKS5 / HTTP / HTTPS プロキシ対応 — ログインページと設定ページでサーバーアドレス、ポート、ユーザー名、パスワードを設定可能（制限されたネットワーク環境向け） |
| 🛡️ コンテンツモデレーション | ユーザー報告（6 カテゴリ）+ ユーザーブロック（投稿/メッセージを即時非表示）+ 利用規約（EULA） |
| 🔧 管理パネル | 内蔵 Web 管理ダッシュボード（`/admin`、パス変更可能）、パスワード保護、報告審査、コンテンツ削除、ユーザー BAN — 8 言語対応 |

---

## 技術スタック
```
バックエンド (server/)
  Rust (Axum 0.8) — 高性能非同期 Web フレームワーク
  sqlx + MySQL 8.0 — ユーザー/メッセージ永続化
  deadpool-redis + Redis 7 — オンラインプレゼンス + ノード間ルーティング
  aws-sdk-s3 — Cloudflare R2 ファイルストレージ（S3 互換 API）
  argon2 + jsonwebtoken 認証

フロントエンド (client/)
  React 19 + TypeScript + Vite 6
  Zustand 状態管理
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — ビデオ/音声通話
  Web Audio API — リアルタイムボイスチェンジャー（ScriptProcessorNode オーディオチェーン）
  PWA: manifest.json + Service Worker

暗号化レイヤー
  ステートレス ECDH + XSalsa20-Poly1305 — メッセージごとの一時キーペア
  4 層キー永続化: メモリ → localStorage → sessionStorage → IndexedDB
  すべての秘密鍵はデバイスにのみ保存 — サーバーへの送信は一切なし
```

---

### オプション 0: Zeabur ワンクリッククラウドデプロイ
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> [!TIP]
> **上級者向け: Zeabur + Vercel ハイブリッドデプロイ**
> Zeabur でデプロイ後、**client** サービスを手動で削除し、代わりにフロントエンドを Vercel にデプロイできます（下記オプション 2 参照）。
> これにより server/MySQL/Redis は Zeabur でホストされ、フロントエンドは Vercel のグローバル CDN で高速化されます。
> フロントエンドでは **Vercel 上で環境変数の設定は不要** — ユーザーはログインページでバックエンドサーバーアドレスを入力するだけです。

### オプション 1: Docker Compose（推奨）
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# 編集: DB_PASS / JWT_SECRET / CF_CALLS_APP_ID など
docker compose up -d
open http://localhost
```

### オプション 2: フロントエンドを Vercel にデプロイ
```bash
# 1. このリポジトリをフォーク
# 2. Vercel にインポート: Root Directory = client/, Build = npm run build, Output = dist/
#    環境変数の設定不要
# 3. バックエンドを Docker または Zeabur でデプロイ
# 4. Vercel でデプロイしたフロントエンドを開き、ログインページでバックエンドサーバーアドレスを入力
#    例: https://your-server.zeabur.app
```

### オプション 3: ローカル開発
```bash
# バックエンド (Rust)
cd server && cp .env.example .env && cargo run --release

# フロントエンド (React)
cd client && npm install && npm run dev
```

---

## ボイスチェンジャー

音声メッセージ、1:1 通話、グループ通話すべてでリアルタイム変声に対応。3 つのモードを選択可能：

| モード | 速度 | 効果 |
|--------|------|------|
| 🐢 スロー | 0.8x | より低く深い声 — 匿名性に最適 |
| 🔊 ノーマル | 1.0x | 元の声、処理なし |
| 🐇 ファスト | 1.2x | より高い声 — 楽しく遊び心のある会話に |

**仕組み**: Web Audio API を使用してオーディオ処理チェーン（AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination）を構築し、マイク入力のピッチ/速度をリアルタイムで調整します。

- **音声メッセージ**: 録音中にボイスモードを選択。エクスポートされた `.webm` ファイルには既に変声効果が含まれており、受信者は元の声を復元できません。これにより真の匿名メッセージングが可能に
- **1:1 / グループ通話**: 通話中にボイスチェンジャーボタンをタップしてモードを切り替え。処理済みオーディオトラックが `RTCRtpSender.replaceTrack()` を通じてオリジナルを置き換えます

> サーバー側の設定は不要です。ボイスチェンジャーは完全にクライアント側で動作します。

---

## 環境変数
| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `PORT` | サーバーポート | `3000` |
| `JWT_SECRET` | JWT 署名キー（**本番環境では必ず変更**） | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | MySQL 接続設定 | — |
| `REDIS_HOST` / `REDIS_PASS` | Redis 接続設定 | — |
| `R2_ACCOUNT_ID` | Cloudflare アカウント ID | — |
| `R2_ACCESS_KEY_ID` | R2 API トークンの Access Key | — |
| `R2_SECRET_ACCESS_KEY` | R2 API トークンの Secret Key | — |
| `R2_BUCKET` | R2 バケット名 | — |
| `R2_PUBLIC_URL` | R2 公開ベース URL（オプション） | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID（オプション） | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret（オプション） | — |
| `METERED_TURN_API_KEY` | Metered.ca TURN API Key（オプション、無料代替案） | — |
| `VAPID_PUBLIC_KEY` | Web Push VAPID 公開鍵（オプション） | — |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 秘密鍵（オプション） | — |
| `VAPID_SUBJECT` | VAPID 連絡先メール（オプション） | `mailto:admin@paperphone.app` |
| `FCM_PROJECT_ID` | Firebase プロジェクト ID（オプション、Capacitor Android） | — |
| `FCM_CLIENT_EMAIL` | Firebase サービスアカウントメール（オプション） | — |
| `FCM_PRIVATE_KEY` | Firebase サービスアカウント秘密鍵（オプション、`\n` エスケープと実際の改行の両方に対応。下記参照） | — |
| `FCM_RELAY_SECRET` | FCM プッシュリレーシークレット（オプション、リレーホストでエンドポイントを有効化） | — |
| `FCM_RELAY_URL` | FCM プッシュリレー URL（オプション、セルフホストサーバーがリレーホストを指定） | — |
| `FCM_RELAY_KEY` | FCM プッシュリレー認証キー（オプション、リレーホストの `FCM_RELAY_SECRET` と一致が必要） | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID（オプション） | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key（オプション） | — |
| `ONESIGNAL_RELAY_SECRET` | OneSignal プッシュリレーシークレット（オプション、リレーホストでエンドポイントを有効化） | — |
| `ONESIGNAL_RELAY_URL` | OneSignal プッシュリレー URL（オプション、セルフホストサーバーがリレーホストを指定） | — |
| `ONESIGNAL_RELAY_KEY` | OneSignal プッシュリレー認証キー（オプション、リレーホストの `ONESIGNAL_RELAY_SECRET` と一致が必要） | — |
| `NTFY_BASE_URL` | ntfy サーバー URL（オプション、デフォルトは公開 ntfy.sh サービス） | `https://ntfy.sh` |
| `NTFY_TOKEN` | ntfy 認証トークン（オプション、セルフホストサーバー用） | — |
| `APNS_TEAM_ID` | Apple Developer Team ID（オプション、iOS ネイティブプッシュ） | — |
| `APNS_KEY_ID` | APNS 認証キー ID（オプション） | — |
| `APNS_PRIVATE_KEY` | APNS .p8 秘密鍵の内容（オプション、`\n` エスケープ対応） | — |
| `APNS_BUNDLE_ID` | iOS App Bundle Identifier（オプション） | — |
| `APNS_SANDBOX` | APNS サンドボックスモード（オプション、開発/TestFlight は `true`） | `false` |
| `APNS_RELAY_SECRET` | プッシュリレーシークレット（オプション、リレーホストでエンドポイントを有効化） | — |
| `APNS_RELAY_URL` | プッシュリレー URL（オプション、セルフホストサーバーがリレーホストを指定） | — |
| `APNS_RELAY_KEY` | プッシュリレー認証キー（オプション、リレーホストの `APNS_RELAY_SECRET` と一致が必要） | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token（オプション） | — |
| `STICKER_PACKS` | カスタムステッカーパック（オプション、`名前:ラベル`） | 内蔵 9 パック |
| `ADMIN_PATH` | 管理パネル URL パス | `/admin` |
| `ADMIN_PASSWORD` | 管理パネルパスワード（**本番環境では必ず変更**） | `admin123` |

### FCM 秘密鍵の改行処理

Firebase サービスアカウント JSON の `private_key` フィールドには PEM 形式の RSA 秘密鍵が含まれており、64 文字ごとに**実際の改行文字**（`\n`、ASCII 0x0A）が必要です。しかし多くのデプロイプラットフォーム（Zeabur、Vercel、Railway、Docker）は環境変数を単一行の文字列として保存し、`\n` を文字通りの 2 文字 `\` + `n` に変換します。

**これが FCM プッシュ通知の失敗で最もよくある原因です** — PEM パーサーがサイレントに失敗し、プッシュ通知が送信されず、エラーログも出力されません。

**サーバーが自動的に処理します**: `fcm.rs` がパース前に文字列リテラルの `\n` を実際の改行文字に正規化します。両方の形式が使用可能：

- **単一行（クラウドプラットフォーム推奨）**: JSON ファイルの `private_key` の値をそのまま `\n` エスケープ付きで貼り付け：
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **複数行（.env ファイル用）**: PEM 内容全体を引用符で囲み、実際の改行を使用：
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| プラットフォーム | 推奨形式 | 備考 |
|-----------------|---------|------|
| **Zeabur** | 単一行（`\n` エスケープ） | Variables パネルに JSON 値を直接貼り付け |
| **Docker / docker-compose** | どちらでも | YAML は `\|` で複数行対応、`.env` は単一行推奨 |
| **Vercel / Railway** | 単一行（`\n` エスケープ） | 入力フィールドは通常、実際の改行に非対応 |
| **Linux .env ファイル** | 複数行（引用符囲み） | 引用符が正しく閉じられていることを確認 |

**トラブルシューティング**: FCM 変数を設定済みだが Android プッシュが動かない場合、サーバーログを確認：
- `[FCM] No access token available` → 秘密鍵のフォーマットエラー（改行の問題）
- `[FCM] ✅ Push sent to user xxx` → FCM 送信は成功、問題はクライアント側
- FCM ログなし → `FCM_PROJECT_ID` が未設定または `fcm_tokens` テーブルにトークンなし

### ntfy プッシュ（Google サービスなしの中国製 Android デバイス）

Google Mobile Services 非搭載の Android デバイス（Huawei、Xiaomi、OPPO、vivo など）向けに、PaperPhone は [ntfy](https://ntfy.sh) 経由のプッシュ通知をサポートしています。

**デフォルト設定（設定不要）**: 公開 ntfy.sh サービスを使用。追加設定は不要です。

**オプション設定**（セルフホスト ntfy サーバー用）：

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**ユーザー設定手順**:
1. ntfy アプリをインストール（[Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [直接ダウンロード](https://ntfy.sh)）
2. PaperPhone の設定画面で「ntfy プッシュ」カードを見つける
3. 表示されたトピック名をコピーし、ntfy アプリで購読する
4. 「プッシュ登録」をタップして登録完了

> **セキュリティ注意**: ntfy 通知はタイトルと概要をプレーンテキストで送信します（実際のメッセージ内容は含みません）。より高いセキュリティが必要な場合は、ntfy サーバーのセルフホストを検討してください。

### APNS プッシュ（ネイティブ iOS アプリ）

APNS（Apple Push Notification Service）は Capacitor で構築されたネイティブ iOS アプリにプッシュ通知を送信します。2 つの設定方法があります：

#### オプション A: 直接設定（アプリ開発者のサーバー）

1. [Apple Developer](https://developer.apple.com/account) にログイン → **Certificates, Identifiers & Profiles** → **Keys**
2. **+** をクリックして新しい Key を作成 → **Apple Push Notifications service (APNs)** にチェック → Register
3. **`.p8` ファイルをダウンロード**（⚠️ ダウンロードは 1 回のみ！）、**Key ID** をメモ
4. Apple Developer メンバーシップページから **Team ID** をメモ（10 文字の英数字）
5. `server/.env` に追加：

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(.p8 ファイルの内容)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphone
APNS_SANDBOX=false
```

> `APNS_SANDBOX`: 開発/TestFlight ビルドは `true`、App Store プロダクションは `false` に設定。

#### オプション B: Push Relay 経由（セルフホストサーバー）

他の人の iOS アプリを使用している場合（App Store からダウンロードなど）、開発者の Apple 認証情報がないため APNS プッシュを直接送信できません。代わりに **Push Relay** を使用してください。

**仕組み:**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  セルフホスト          │  HTTP  │  アプリ開発者の           │  APNS  │  Apple  │
│  サーバー              │──────→│  サーバー                │──────→│  ──→ 📱 │
│  (Apple 認証情報なし)   │       │  (.p8 Key + Relay あり)  │       └─────────┘
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**ステップ 1: アプリ開発者が Relay エンドポイントを有効化**

アプリ開発者のサーバー（APNS 認証情報設定済み）で、Relay シークレットを設定：

```env
# アプリ開発者のサーバー .env（APNS_TEAM_ID 等は設定済み）
APNS_RELAY_SECRET=長いランダムな共有シークレット
```

これにより `POST /api/push-relay/apns` にプッシュリレーエンドポイントが自動的に有効化されます。

**ステップ 2: セルフホストユーザーが Relay を設定**

セルフホストサーバーに必要な変数は 2 つだけ — **Apple 認証情報は不要**：

```env
# セルフホストサーバー .env
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=ステップ1の共有シークレット
```

**動作フロー:**
1. セルフホストサーバーがオフラインメッセージを受信 → ローカルの `apns_tokens` テーブルからユーザーの iOS デバイストークンを取得
2. デバイストークン + プッシュタイトル/内容を HTTP POST で Relay に送信
3. Relay がキーを検証後、自身の APNS 認証情報を使用して Apple に送信
4. Relay が期限切れトークンのリストを返却、セルフホストサーバーがローカルデータベースを自動クリーンアップ

> **優先順位**: ローカル APNS 認証情報 → Push Relay → スキップ（サイレント）。両方設定されている場合、ローカル直接接続が優先されます。

> **セキュリティ注意**: Relay はプッシュ通知のタイトルと概要のみを転送します（例：「誰かからメッセージが届きました」）。実際のメッセージ内容は含まれません。デバイストークンではユーザーデータの読み取りはできません。

### Push Relay（全チャネル）

セルフホストサーバー運営者が他の人が公開したアプリ（App Store/Google Play からダウンロード等）を使用している場合、開発者のプッシュ認証情報（Apple .p8 Key / Firebase サービスアカウント / OneSignal API Key）がありません。

Push Relay システムは **APNS、FCM、OneSignal** チャネルのリレー機能を提供します：

**アプリ開発者**がサーバーでリレーエンドポイントを有効化：

```env
# アプリ開発者のサーバー .env
APNS_RELAY_SECRET=長いランダムな文字列
FCM_RELAY_SECRET=長いランダムな文字列
ONESIGNAL_RELAY_SECRET=長いランダムな文字列
```

**セルフホストユーザー**はリレー URL とキーのみ必要 — **プッシュサービス認証情報は不要**：

```env
# セルフホストサーバー .env
# APNS（iOS ネイティブプッシュ）
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=共有シークレット

# FCM（Android ネイティブプッシュ）
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=共有シークレット

# OneSignal（Median.co でパッケージされたアプリ）
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=共有シークレット
```

> **優先順位**: ローカル認証情報 → Push Relay → スキップ（サイレント）。両方設定されている場合、ローカル直接接続が優先されます。

---

## 公式 Push Relay

セルフホストサーバー運営者は、公式 Push Relay を使用することで、プッシュ認証情報の設定なしで iOS/Android プッシュ通知を有効にできます：

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

上記の行をセルフホストサーバーの `.env` ファイルに追加してください。

---

## ライセンス

本プロジェクトは [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) の下でライセンスされています。
