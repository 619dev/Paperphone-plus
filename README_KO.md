🌐 **다른 언어:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat 스타일의 종단간 암호화 메신저. 무상태 ECDH + XSalsa20-Poly1305 메시지별 암호화, 실시간 영상 통화, Cloudflare R2 파일 저장, 다국어 지원 및 iOS PWA 배포 지원.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-다운로드-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)

---

<details>
<summary>📸 스크린샷 (클릭하여 확장)</summary>


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
  Web Audio API — 실시간 음성 변조
  PWA 지원
```

## 주요 기능
- 🔐 종단간 암호화 (ECDH + XSalsa20-Poly1305)
- 📹 영상/음성 통화 (WebRTC P2P + Mesh)
- 🎙️ 음성 변조 — 음성 메시지·1v1 통화·그룹 통화에서 3단계 변조 (0.8x 저음 / 1.0x 일반 / 1.2x 고음), Web Audio API 실시간 처리
- 👥 그룹 채팅 (최대 2000명)
- 💬 리치 메시지 (텍스트, 이미지, 영상, 문서, 음성, 이모지, 스티커)
- 🌐 8개 언어 지원 (자동 감지 + 수동 전환)
- 📱 iOS PWA 지원 (영구 설치)
- 📱 Android 네이티브 앱 — [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)에서 다운로드 가능, FCM 푸시 알림 지원
- 🔑 2단계 인증 (TOTP)
- 🌐 프록시 설정 — SOCKS5 / HTTP / HTTPS 프록시 지원, 로그인 및 설정 페이지에서 서버 주소, 포트, 사용자 이름, 비밀번호 설정 가능

## 배포
```bash
# Docker Compose
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
docker compose up -d

# Vercel에 프론트엔드 배포 (환경 변수 설정 불필요)
# Vercel에서 Root Directory = client/, Build = npm run build, Output = dist/ 설정
# 로그인 화면에서 백엔드 서버 주소를 입력하면 바로 연결됩니다

# 로컬 개발
cd server && cargo run --release  # 백엔드
cd client && npm install && npm run dev  # 프론트엔드
```

자세한 설정은 [English README](README_EN.md) 를 참조하세요.

---
MIT © PaperPhone Contributors
