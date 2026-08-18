🌐 **他の言語:** [中文](README.md) · [English](README_EN.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat スタイルのエンドツーエンド暗号化メッセンジャー。ステートレス ECDH + XSalsa20-Poly1305 によるメッセージごとの暗号化、リアルタイムビデオ通話、Cloudflare R2 ファイルストレージ、多言語サポート、iOS PWA デプロイに対応。

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-LiveKit%20SFU-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Version](https://img.shields.io/badge/バージョン-2.4.7-orange)](client/package.json)

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
| 🗝️ ゼロ知識暗号化 | 暗号化された会話ではサーバーは暗号文を保存しますが、アカウント、連絡先/グループ、ルーティング、プッシュに必要なメタデータは処理します。アイデンティティ秘密鍵と Sender Key はローカルにのみ保存され、Web は AES-GCM でラップした IndexedDB、Android、iOS、Windows、macOS は OS のセキュアストレージを使用 |
| 🎭 文字表現と追加暗号化 | 「プロフィール > メッセージのプライバシー」で本デバイスの全チャットに追加パスワードを設定し、8 種類の文字表現で本文を表示。手動ロックと自動ロックに対応 |
| 📹 ビデオ・音声通話 | 1:1通話と会議の両方に LiveKit SFU（最大100人）、全員ミュートと講義モード |
| 🎙️ ボイスチェンジャー | 音声メッセージ、1:1 通話、グループ通話でリアルタイム変声 — 3 モード（0.8x 低音 / 1.0x 通常 / 1.2x 高音）、Web Audio API ベース |
| 📱 セッション維持 | 30 分の Access Token と自動延長される 90 日のデバイス Refresh Session。ネットワーク/IP/VPN/プロキシ変更後もパスワードなしで自動復旧 |
| 📨 高信頼メッセージ同期 | 双方向ハートビート、半死接続検出、永続送信ボックス、冪等メッセージ ID、サーバーシーケンスカーソルによる差分補完 |
| 📴 オフラインアクセス | アカウント別に連絡先、グループ、会話ごと最大 2,000 件のメッセージ、モーメンツ、タイムライン、メディアをキャッシュ。オフライン送信は自動再試行 |
| 🔎 Unicode フレンド検索 | IME 変換中の誤送信防止、NFC 正規化、UTF-8 クエリ符号化により、中国語のユーザー名とニックネームを確実に検索 |
| 👥 グループチャット | 最大 2000 人、「暗号化」/「非暗号化」モード切替可能（オーナーのみ、切替時にチャット履歴クリア）。暗号化モードは Signal 風 Sender Key プロトコル（XSalsa20-Poly1305 対称暗号 + ECDH 鍵配布）を使用 — グループメンバーのみ復号可能、暗号化モードではボット使用不可。おやすみモード、メンバー管理 |
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

## 変更履歴

完全な更新履歴は [changelog.md](changelog.md) に移動しました。

---

## セッション復旧とメッセージ信頼性

PaperPhonePlus は、ローカルのアカウント状態、リアルタイム接続、メッセージ同期を分離して管理します。WebSocket が開いていても、サーバーから `auth_ok` を受信するまでは利用可能と判断しません。双方向の `ping/pong` により、VPN/IP 変更、Wi-Fi とモバイル回線の切替、アプリ中断による半死接続を検出します。

- Access Token の有効期間は 30 分です。デバイス Refresh Token は 90 日間有効で、利用中は延長されるため、通常はパスワードを再入力せず更新できます。
- 旧バージョンですでにログイン済みのデバイスは、既存 Token が有効な間に自動アップグレードされます。すでに期限切れの場合のみ、最後に一度だけ手動ログインが必要です。
- 送信メッセージには安定した `client_msg_id` が付きます。ACK 未受信のメッセージは永続ローカル送信ボックスに残り、同じ ID で再送されます。サーバーの一意制約が重複登録を防ぎます。
- 保存メッセージには単調増加する `server_seq` が付きます。認証、再接続、フォアグラウンド復帰後にカーソルで不足分を同期します。
- 明示的なログアウトやデバイス失効では長期セッションを無効化します。通常の通信障害や IP 変更ではログイン状態を保持します。

> [!IMPORTANT]
> アップグレードは server、client の順でデプロイしてください。server は信頼性用 DB マイグレーションを自動適用・検証し、必須カラムが不足している場合は起動を拒否します。本番更新前に MySQL をバックアップしてください。

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
  ローカル鍵保護: Web は AES-GCM でラップした IndexedDB、Android/iOS/Windows/macOS は OS のセキュアストレージ
  アイデンティティ秘密鍵と Sender Key はローカルに保存され、サーバーに送信されない
```

---

> 📖 **[詳細デプロイガイド (中文)](DEPLOY_CN.md)** | **[Deployment Guide (English)](DEPLOY_EN.md)** — Zeabur + Vercel ハイブリッドデプロイ、Docker Compose + Nginx ローカルデプロイ、およびクライアントサーバーアドレス設定の完全なステップバイステップガイド。

### オプション 0: Zeabur ワンクリッククラウドデプロイ
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> **Zeabur の通話ネットワーク制限：** テンプレートは WebSocket/API 7880 と ICE/TCP 7881 で LiveKit をデプロイします。現在 Zeabur は UDP サービスポートを公開できないため、1:1通話と会議は TCP フォールバックを使用します。本番通話には LiveKit Cloud または UDP 対応 VM を使用してください。

#### サーバー側 Nginx 設定

2ドメイン対応の本番設定 [deploy/nginx/paperphone-plus.conf](deploy/nginx/paperphone-plus.conf) を使用します。`api.example.com` と `meeting.example.com` を実際のドメインに変更し、TLS 証明書を取得して `/etc/nginx/sites-available/paperphone-plus` にコピーし、有効化後に `sudo nginx -t && sudo systemctl reload nginx` を実行します。バックエンドには `LIVEKIT_URL=wss://meeting.example.com` を設定します。Nginx は API と WebSocket のみをプロキシするため、TCP 7881 と UDP 7882 はホストおよびクラウドのファイアウォールで直接開放してください。

> [!TIP]
> **上級者向け: Zeabur + Vercel ハイブリッドデプロイ**
> Zeabur でデプロイ後、**client** サービスを手動で削除し、代わりにフロントエンドを Vercel にデプロイできます（下記オプション 2 参照）。
> これにより server/MySQL/Redis は Zeabur でホストされ、フロントエンドは Vercel のグローバル CDN で高速化されます。
> フロントエンドでは **Vercel 上で環境変数の設定は不要** — ユーザーはログインページでバックエンドサーバーアドレスを入力するだけです。

### オプション 1: Docker Compose（推奨）
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# 編集: DB_PASS / JWT_SECRET / LIVEKIT_URL など
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
- **1:1 / グループ通話**: 通話中にボイスチェンジャーボタンをタップしてモードを切り替え。処理済みオーディオトラックが `LiveKit LocalAudioTrack.replaceTrack()` を通じてオリジナルを置き換えます

> サーバー側の設定は不要です。ボイスチェンジャーは完全にクライアント側で動作します。

---

## 文字表現と追加暗号化

**プロフィール > メッセージのプライバシー** で、本デバイスの全チャットに追加パスワードを有効にできます。送信前に本文を追加暗号化して文字表現に変換し、その後、既存の個人チャット E2EE（X25519 / ML-KEM-768）またはグループ Sender Key 暗号化で再度保護します。これは E2EE の上に追加する第 2 の保護層です。文字表現は **仏教風テキスト、ランダム中国語、易経記号、ハングル、エジプト象形文字、楔形文字、核心価値観テキスト、英数字** から選択できます。

- パスワードは送信も自動同期もされません。個人チャットの双方、またはグループ全員が同じパスワードを各デバイスに設定する必要があります。
- 文字表現を同じにする必要はありません。各メッセージに文字表現の識別子が含まれるため、受信側は送信者が選んだ表現を自動判別して復元します。たとえば一方が仏教風テキスト、もう一方がハングルを使っても、追加パスワードが同じなら双方とも正常に復号できます。各自の設定は、自分が送信する暗号文の見た目だけを決定します。
- パスワードが異なる場合も E2EE と配信は正常に動作しますが、文字表現の暗号文のみが表示され、原文は読めません。
- パスワードは 8 文字以上で、ロック解除中のみメモリに保持されます。ローカルに保存されるのはソルトと検証情報のみです。
- 即時ロック、またはフォアグラウンドを離れてから **5 / 15 / 30 / 60 分**後の自動ロックに対応します。ロック中は文字表現の暗号文のみ表示されます。
- 無効化時は、解除済みでも正しいパスワードの再入力が必要です。
- 文字表現は既存 E2EE の上に追加する保険であり、**E2EE を代替、迂回、またはダウングレードしません**。

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
| `LIVEKIT_URL` | すべての通話で使用する公開 LiveKit WebSocket URL | — |
| `LIVEKIT_API_KEY` | サーバーと LiveKit で共有する API Key | — |
| `LIVEKIT_API_SECRET` | サーバーと LiveKit で共有する API Secret | — |
| `VAPID_PUBLIC_KEY` | Web Push VAPID 公開鍵（オプション） | — |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 秘密鍵（オプション） | — |
| `VAPID_SUBJECT` | VAPID 連絡先メール（オプション） | `mailto:admin@paperphoneplus.app` |
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
| `STICKER_PACKS` | カスタムステッカーパック（オプション、`名前:ラベル`） | 内蔵 12 パック |
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

Google Mobile Services 非搭載の Android デバイス（Huawei、Xiaomi、OPPO、vivo など）向けに、PaperPhonePlus は [ntfy](https://ntfy.sh) 経由のプッシュ通知をサポートしています。

**デフォルト設定（設定不要）**: 公開 ntfy.sh サービスを使用。追加設定は不要です。

**オプション設定**（セルフホスト ntfy サーバー用）：

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**ユーザー設定手順**:
1. ntfy アプリをインストール（[Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [直接ダウンロード](https://ntfy.sh)）
2. PaperPhonePlus の設定画面で「ntfy プッシュ」カードを見つける
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
APNS_BUNDLE_ID=com.yourcompany.paperphoneplus
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
