🌐 **他の言語:** [中文](README.md) · [English](README_EN.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat スタイルのエンドツーエンド暗号化メッセンジャー。ステートレス ECDH + XSalsa20-Poly1305 によるメッセージごとの暗号化、リアルタイムビデオ通話、Cloudflare R2 ファイルストレージ、多言語サポート、iOS PWA デプロイに対応。

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/P2J7Y3?referralCode=619dev)

---

<details>
<summary>📸 スクリーンショット（クリックで展開）</summary>

<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui1.jpg" alt="ui1">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui2.jpg" alt="ui2">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui3.jpg" alt="ui3">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui4.jpg" alt="ui4">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui5.jpg" alt="ui5">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui6.jpg" alt="ui6">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui7.jpg" alt="ui7">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui8.jpg" alt="ui8">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui9.jpg" alt="ui9">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui10.jpg" alt="ui10">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui11.jpg" alt="ui11">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui12.jpg" alt="ui12">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui13.jpg" alt="ui13">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui14.jpg" alt="ui14">

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
  PWA 対応
```

## デプロイ
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# ローカル開発
cd server && cargo run --release  # バックエンド
cd client && npm install && npm run dev  # フロントエンド
```

詳細な設定については [English README](README_EN.md) を参照してください。

---
MIT © PaperPhone Contributors
