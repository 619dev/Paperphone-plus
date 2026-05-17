🌐 **他の言語:** [中文](README.md) · [English](README_EN.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat スタイルのエンドツーエンド暗号化メッセンジャー。ステートレス ECDH + XSalsa20-Poly1305 によるメッセージごとの暗号化、リアルタイムビデオ通話、Cloudflare R2 ファイルストレージ、多言語サポート、iOS PWA デプロイに対応。

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-ダウンロード-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)

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

## 技術スタック
```
バックエンド (server/)
  Rust (Axum 0.8) — 高性能非同期 Web フレームワーク
  sqlx + MySQL 8.0 — ユーザー/メッセージ永続化
  deadpool-redis + Redis 7 — オンラインプレゼンス
  aws-sdk-s3 — Cloudflare R2 ファイルストレージ

フロントエンド (client/)
  React 19 + TypeScript + Vite 6
  Zustand 状態管理
  libsodium-wrappers-sumo (WebAssembly)
  WebRTC API — ビデオ/音声通話
  Web Audio API — リアルタイムボイスチェンジャー
  PWA 対応
```

## 主な機能
- 🔐 エンドツーエンド暗号化（ECDH + XSalsa20-Poly1305）
- 📹 ビデオ/音声通話（WebRTC P2P + Mesh）
- 🎙️ ボイスチェンジャー — 音声メッセージ・1v1通話・グループ通話で3段階の変声（0.8x 低音 / 1.0x 通常 / 1.2x 高音）、Web Audio API によるリアルタイム処理
- 👥 グループチャット（最大2000人）
- 💬 リッチメッセージ（テキスト、画像、動画、文書、音声、絵文字、ステッカー）
- 🎭 Telegram ステッカーパック — 動的ステッカーパック管理、デフォルト9個内蔵、カスタマイズ可能・数量無制限
- 🌐 8言語対応（自動検出 + 手動切替）
- 📱 iOS PWA 対応（永続インストール）
- 📱 Android ネイティブアプリ — [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus) で公開中、FCM プッシュ通知対応
- 🔑 二要素認証（TOTP）
- 🌐 プロキシ設定 — SOCKS5 / HTTP / HTTPS プロキシをログイン画面と設定画面で設定可能（サーバーアドレス、ポート、ユーザー名、パスワード対応）
- 🛡️ コンテンツモデレーション — ユーザー報告（6カテゴリ）+ ユーザーブロック（即時非表示）+ 利用規約（EULA）
- 🔧 管理パネル — 組み込みWeb管理画面（`/admin`、パス変更可能）、パスワード保護、報告審査、コンテンツ削除、ユーザーBAN — 8言語対応

## デプロイ
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Vercel にフロントエンドをデプロイ（環境変数の設定不要）
# Vercel で Root Directory = client/, Build = npm run build, Output = dist/ を指定
# ログイン画面でバックエンドサーバーのアドレスを入力するだけで接続できます

# ローカル開発
cd server && cargo run --release  # バックエンド
cd client && npm install && npm run dev  # フロントエンド
```

詳細な設定については [English README](README_EN.md) を参照してください。

---
MIT © PaperPhone Contributors
