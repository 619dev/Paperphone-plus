🌐 **다른 언어:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat 스타일의 종단간 암호화 메신저. 무상태 ECDH + XSalsa20-Poly1305 메시지별 암호화, 실시간 영상 통화, Cloudflare R2 파일 저장, 다국어 지원 및 iOS PWA 배포 지원.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/P2J7Y3?referralCode=619dev)

---

<details>
<summary>📸 스크린샷 (클릭하여 확장)</summary>

<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui1.jpg" alt="ui1">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui2.jpg" alt="ui2">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui3.jpg" alt="ui3">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui4.jpg" alt="ui4">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui5.jpg" alt="ui5">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui6.jpg" alt="ui6">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui7.jpg" alt="ui7">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui8.jpg" alt="ui8">
<img width=30% height=30% src="https://raw.githubusercontent.com/619dev/PaperPhone/main/screenshot/ui9.jpg" alt="ui9">

</details>

## 기술 스택
```
백엔드 (server/)
  Rust (Axum 0.8) — 고성능 비동기 웹 프레임워크
  sqlx + MySQL 8.0 — 사용자/메시지 영속화
  deadpool-redis + Redis 7 — 온라인 상태
  aws-sdk-s3 — Cloudflare R2 파일 저장소

프론트엔드 (client/)
  React 19 + TypeScript + Vite 6
  Zustand 상태 관리
  libsodium-wrappers-sumo (WebAssembly)
  WebRTC API — 영상/음성 통화
  PWA 지원
```

## 배포
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# 로컬 개발
cd server && cargo run --release  # 백엔드
cd client && npm install && npm run dev  # 프론트엔드
```

자세한 설정은 [English README](README_EN.md) 를 참조하세요.

---
MIT © PaperPhone Contributors
