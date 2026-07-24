🌐 **다른 언어:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

WeChat 스타일의 종단간 암호화 메신저. 무상태 ECDH + XSalsa20-Poly1305 메시지별 암호화, 실시간 영상 통화, Cloudflare R2 파일 저장, 다국어 지원 및 iOS PWA 배포 지원.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20SFU-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-다운로드-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-다운로드-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-다운로드-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-다운로드-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

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

## 기능
| 기능 | 설명 |
|------|------|
| 🔐 종단간 암호화 | 무상태 ECDH + XSalsa20-Poly1305 — 메시지별 임시 키 생성, 순방향 비밀성, Signal 방식 안전 번호 검증 |
| 🗝️ 제로 지식 서버 | 서버에는 암호문만 저장됩니다. 개인 키는 절대 기기 밖으로 유출되지 않습니다 |
| 📹 영상 및 음성 회의 | WebRTC P2P (1:1) + LiveKit SFU (최대 100명), 전체 음소거 및 강의 모드 |
| 🎙️ 음성 변조 | 음성 메시지, 1:1 통화, 그룹 통화에서 실시간 음성 효과 — 3가지 모드 (0.8x 저음 / 1.0x 일반 / 1.2x 고음), Web Audio API 기반 |
| 📱 세션 유지 | 네트워크 끊김, 일반 인증 오류, 서버 URL 변경 시에도 로컬 로그인 상태를 유지하며 서버가 명시적으로 세션을 취소할 때만 로그아웃 |
| 📴 오프라인 접근 | 계정별로 연락처, 그룹, 대화당 최대 2,000개 메시지, 모먼트, 타임라인 및 미디어를 캐시하며 프로필에서 직접 삭제 가능 |
| 🔎 Unicode 친구 검색 | IME 조합 보호, NFC 정규화 및 UTF-8 쿼리 인코딩으로 중국어 사용자 이름과 별명을 안정적으로 검색 |
| 👥 그룹 채팅 | 최대 2000명, "암호화" / "비암호화" 모드 전환 가능 (그룹 소유자만 전환 가능, 전환 시 채팅 기록 삭제). 암호화 모드는 Signal 스타일 Sender Key 프로토콜 (XSalsa20-Poly1305 대칭 암호화 + ECDH 키 배포) 사용 — 그룹 멤버만 메시지 복호화 가능, 암호화 모드에서는 봇 사용 불가. 방해 금지 모드, 멤버 관리 |
| 👫 친구 시스템 | 친구 요청 시 최대 512자 메시지와 함께 승인 필요; 사용자 지정 별명; 다중 태그 분류 |
| ⏱️ 메시지 자동 삭제 | 5단계 (없음 / 1일 / 3일 / 1주일 / 1개월), DM에서는 양쪽 모두 설정 가능, 그룹에서는 소유자만 설정 가능 |
| 🔔 푸시 알림 | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS 5채널 — 오프라인 사용자에게도 전달 (iOS 네이티브 + Google 서비스 없는 중국산 Android 지원) |
| 🌐 다국어 지원 | 중국어, 영어, 일본어, 한국어, 프랑스어, 독일어, 러시아어, 스페인어 — 자동 감지 + 수동 전환 |
| 📱 iOS — 기업 인증서 불필요 | Safari에서 "홈 화면에 추가" PWA 방식으로 Apple 서명 없이 영구적으로 사용 가능 |
| 📱 Android 네이티브 앱 | [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)에서 다운로드 가능, FCM 푸시 알림 지원 |
| 📱 iOS 네이티브 앱 | [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178)에서 다운로드 가능, APNS 푸시 알림 지원 |
| 🖥️ Windows 데스크톱 클라이언트 | Windows 네이티브 데스크톱 앱, [여기에서 다운로드](https://github.com/619dev/ppp-win/releases) |
| 🍎 Mac 데스크톱 클라이언트 | Mac 네이티브 데스크톱 앱, [여기에서 다운로드](https://github.com/619dev/ppp-mac/releases) |
| 💬 리치 메시지 | 텍스트, 이미지, 영상, 문서 파일, 음성 메시지, 200+ 이모지, Telegram 스티커 팩, 수신 확인, 입력 중 표시 |
| 📤 파일 업로드 | 파일당 최대 500MB, Cloudflare R2 또는 로컬 저장소, 진행률 애니메이션 |
| 🌐 모먼트 | WeChat 스타일 소셜 피드: 텍스트 + 최대 9장 사진 또는 1개 영상 (≤ 10분), 좋아요, 댓글, 태그 기반 공개 범위 설정 |
| 👤 사용자 프로필 | 연락처 프로필 페이지, 양방향 모먼트 개인정보 제어 |
| 📰 타임라인 | 샤오홍슈 스타일 공개 피드 — 2열 매거진 레이아웃, 익명 게시, 좋아요 및 댓글 |
| 🏷️ 친구 태그 | 친구에게 여러 태그 할당 (12색 팔레트), 태그별 연락처 필터링 |
| 🗂️ R2 오브젝트 스토리지 | 이미지/음성 파일용 Cloudflare R2 — 선택적 공개 CDN URL |
| 🔑 2단계 인증 (2FA) | Google Authenticator 호환 TOTP, 8개 복구 코드, 로그인 시 적용 |
| 📷 QR 코드 스캔 및 공유 | QR 코드로 친구 추가 또는 그룹 참여, 만료 기간 설정 가능 |
| 🏗️ 셀프 호스팅 | Docker Compose, Zeabur 원클릭, 또는 Vercel에 프론트엔드 배포 |
| 🌐 프록시 설정 | SOCKS5 / HTTP / HTTPS 프록시 지원 — 로그인 및 설정 페이지에서 서버 주소, 포트, 사용자 이름, 비밀번호 설정 가능 |
| 🛡️ 콘텐츠 관리 | 사용자 신고 (6가지 카테고리) + 사용자 차단 (게시물/메시지 즉시 숨김) + 이용약관 (EULA) |
| 🔧 관리자 패널 | 내장 웹 관리 대시보드 (`/admin`, 경로 변경 가능), 비밀번호 보호, 신고 검토, 콘텐츠 삭제, 사용자 차단 — 8개 언어 지원 |

---

## 기술 스택
```
백엔드 (server/)
  Rust (Axum 0.8) — 고성능 비동기 웹 프레임워크
  sqlx + MySQL 8.0 — 사용자/메시지 영속화
  deadpool-redis + Redis 7 — 온라인 상태 + 크로스 노드 라우팅
  aws-sdk-s3 — Cloudflare R2 파일 저장소 (S3 호환 API)
  argon2 + jsonwebtoken 인증

프론트엔드 (client/)
  React 19 + TypeScript + Vite 6
  Zustand 상태 관리
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — 영상/음성 통화
  Web Audio API — 실시간 음성 변조 (ScriptProcessorNode 오디오 체인)
  PWA: manifest.json + Service Worker

암호화 레이어
  무상태 ECDH + XSalsa20-Poly1305 — 메시지별 임시 키페어 생성
  4단계 키 저장: memory → localStorage → sessionStorage → IndexedDB
  모든 개인 키는 기기에만 저장됩니다 — 서버로 전송되지 않습니다
```

---

> 📖 **[상세 배포 가이드 (中文)](DEPLOY_CN.md)** | **[Deployment Guide (English)](DEPLOY_EN.md)** — Zeabur + Vercel 하이브리드 배포, Docker Compose + Nginx 로컬 배포 및 클라이언트 서버 주소 구성에 대한 단계별 전체 가이드.

### 옵션 0: Zeabur 원클릭 클라우드 배포
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> **Zeabur 회의 네트워크 제한:** 템플릿은 WebSocket/API 7880과 ICE/TCP 7881로 LiveKit을 배포합니다. 현재 Zeabur는 UDP 서비스 포트를 노출하지 않으므로 회의는 TCP 폴백을 사용하며 약한 네트워크에서 지연이나 품질 저하가 발생할 수 있습니다. UDP 7882 설정은 미리 준비되어 있습니다. 현재 프로덕션 100인 회의에는 LiveKit Cloud 또는 UDP를 지원하는 VM을 사용하십시오.

#### 서버 Nginx 구성

두 도메인용 프로덕션 설정 [deploy/nginx/paperphone-plus.conf](deploy/nginx/paperphone-plus.conf)을 사용하십시오. `api.example.com`과 `meeting.example.com`을 실제 도메인으로 바꾸고 TLS 인증서를 발급한 뒤 파일을 `/etc/nginx/sites-available/paperphone-plus`에 복사하여 활성화하고 `sudo nginx -t && sudo systemctl reload nginx`를 실행합니다. 백엔드에는 `LIVEKIT_URL=wss://meeting.example.com`을 설정합니다. Nginx는 API와 WebSocket만 프록시하므로 TCP 7881과 UDP 7882는 호스트 및 클라우드 방화벽에서 직접 개방해야 합니다.

> [!TIP]
> **고급: Zeabur + Vercel 하이브리드 배포**
> Zeabur에 배포한 후 **client** 서비스를 수동으로 삭제하고 프론트엔드를 Vercel에 배포할 수 있습니다 (아래 옵션 2 참조).
> 이렇게 하면 server/MySQL/Redis는 Zeabur에서 호스팅되고 프론트엔드는 Vercel의 글로벌 CDN으로 가속됩니다.
> 프론트엔드에는 **Vercel에서 환경 변수가 필요 없습니다** — 사용자가 로그인 페이지에서 백엔드 서버 주소를 입력하기만 하면 됩니다.

### 옵션 1: Docker Compose (권장)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# 편집: DB_PASS / JWT_SECRET / CF_CALLS_APP_ID 등
docker compose up -d
open http://localhost
```

### 옵션 2: Vercel에 프론트엔드 배포
```bash
# 1. 이 저장소를 포크합니다
# 2. Vercel에서 가져오기: Root Directory = client/, Build = npm run build, Output = dist/
#    환경 변수 설정이 필요 없습니다
# 3. Docker 또는 Zeabur를 통해 백엔드를 배포합니다
# 4. Vercel에 배포된 프론트엔드를 열고 로그인 페이지에서 백엔드 서버 주소를 입력합니다
#    예: https://your-server.zeabur.app
```

### 옵션 3: 로컬 개발
```bash
# 백엔드 (Rust)
cd server && cp .env.example .env && cargo run --release

# 프론트엔드 (React)
cd client && npm install && npm run dev
```

---

## 음성 변조

음성 메시지, 1:1 통화, 그룹 통화 모두 실시간 음성 변조를 지원하며 3가지 모드를 선택할 수 있습니다:

| 모드 | 속도 | 효과 |
|------|------|------|
| 🐢 느리게 | 0.8x | 더 깊고 낮은 음성 — 익명성에 적합 |
| 🔊 일반 | 1.0x | 원래 음성, 처리 없음 |
| 🐇 빠르게 | 1.2x | 더 높은 음성 — 재미있고 장난스러운 효과 |

**작동 원리**: Web Audio API를 사용하여 오디오 처리 체인 (AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination)을 구축하고 마이크 입력의 피치/속도를 실시간으로 조정합니다.

- **음성 메시지**: 녹음 중 음성 모드를 선택합니다. 내보내진 `.webm` 파일에는 이미 음성 효과가 포함되어 있어 수신자가 원래 음성을 복원할 수 없으며, 진정한 익명 메시지가 가능합니다
- **1:1 / 그룹 통화**: 통화 중 음성 변조 버튼을 탭하여 모드를 순환합니다. 처리된 오디오 트랙이 `RTCRtpSender.replaceTrack()`을 통해 원래 트랙을 대체합니다

> 서버 측 설정이 필요 없습니다. 음성 변조는 전적으로 클라이언트 측에서 실행됩니다.

---

## 환경 변수
| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `3000` |
| `JWT_SECRET` | JWT 서명 키 (**프로덕션에서 반드시 변경하세요**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | MySQL 연결 정보 | — |
| `REDIS_HOST` / `REDIS_PASS` | Redis 연결 정보 | — |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID | — |
| `R2_ACCESS_KEY_ID` | R2 API 토큰 액세스 키 | — |
| `R2_SECRET_ACCESS_KEY` | R2 API 토큰 시크릿 키 | — |
| `R2_BUCKET` | R2 버킷 이름 | — |
| `R2_PUBLIC_URL` | R2 공개 기본 URL (선택 사항) | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID (선택 사항) | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret (선택 사항) | — |
| `METERED_TURN_API_KEY` | Metered.ca TURN API Key (선택 사항, 무료 대안) | — |
| `VAPID_PUBLIC_KEY` | Web Push VAPID 공개 키 (선택 사항) | — |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 개인 키 (선택 사항) | — |
| `VAPID_SUBJECT` | VAPID 연락처 이메일 (선택 사항) | `mailto:admin@paperphoneplus.app` |
| `FCM_PROJECT_ID` | Firebase 프로젝트 ID (선택 사항, Capacitor Android) | — |
| `FCM_CLIENT_EMAIL` | Firebase 서비스 계정 이메일 (선택 사항) | — |
| `FCM_PRIVATE_KEY` | Firebase 서비스 계정 개인 키 (선택 사항, `\n` 이스케이프 및 실제 줄바꿈 모두 지원; 아래 참조) | — |
| `FCM_RELAY_SECRET` | FCM 푸시 릴레이 시크릿 (선택 사항, 릴레이 호스트에 설정하여 엔드포인트 활성화) | — |
| `FCM_RELAY_URL` | FCM 푸시 릴레이 URL (선택 사항, 셀프 호스팅 서버에서 릴레이 호스트로 연결) | — |
| `FCM_RELAY_KEY` | FCM 푸시 릴레이 인증 키 (선택 사항, 릴레이 호스트의 `FCM_RELAY_SECRET`과 일치해야 합니다) | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID (선택 사항) | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key (선택 사항) | — |
| `ONESIGNAL_RELAY_SECRET` | OneSignal 푸시 릴레이 시크릿 (선택 사항, 릴레이 호스트에 설정하여 엔드포인트 활성화) | — |
| `ONESIGNAL_RELAY_URL` | OneSignal 푸시 릴레이 URL (선택 사항, 셀프 호스팅 서버에서 릴레이 호스트로 연결) | — |
| `ONESIGNAL_RELAY_KEY` | OneSignal 푸시 릴레이 인증 키 (선택 사항, 릴레이 호스트의 `ONESIGNAL_RELAY_SECRET`과 일치해야 합니다) | — |
| `NTFY_BASE_URL` | ntfy 서버 URL (선택 사항, 기본적으로 공개 ntfy.sh 사용) | `https://ntfy.sh` |
| `NTFY_TOKEN` | ntfy 인증 토큰 (선택 사항, 셀프 호스팅 서버용) | — |
| `APNS_TEAM_ID` | Apple Developer Team ID (선택 사항, iOS 네이티브 푸시) | — |
| `APNS_KEY_ID` | APNS 인증 키 ID (선택 사항) | — |
| `APNS_PRIVATE_KEY` | APNS .p8 개인 키 내용 (선택 사항, `\n` 이스케이프 지원) | — |
| `APNS_BUNDLE_ID` | iOS 앱 Bundle Identifier (선택 사항) | — |
| `APNS_SANDBOX` | APNS 샌드박스 모드 (선택 사항, 개발/TestFlight용 `true`) | `false` |
| `APNS_RELAY_SECRET` | 푸시 릴레이 시크릿 (선택 사항, 릴레이 호스트에 설정하여 엔드포인트 활성화) | — |
| `APNS_RELAY_URL` | 푸시 릴레이 URL (선택 사항, 셀프 호스팅 서버에서 릴레이 호스트로 연결) | — |
| `APNS_RELAY_KEY` | 푸시 릴레이 인증 키 (선택 사항, 릴레이 호스트의 `APNS_RELAY_SECRET`과 일치해야 합니다) | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (선택 사항) | — |
| `STICKER_PACKS` | 커스텀 스티커 팩 (선택 사항, `name:label`) | 기본 12개 내장 |
| `ADMIN_PATH` | 관리자 패널 URL 경로 | `/admin` |
| `ADMIN_PASSWORD` | 관리자 패널 비밀번호 (**프로덕션에서 반드시 변경하세요**) | `admin123` |

### FCM 개인 키 줄바꿈 처리

Firebase 서비스 계정 JSON의 `private_key` 필드에는 PEM 형식의 RSA 개인 키가 포함되어 있으며, 각 64자 줄 사이에 **실제 줄바꿈 문자** (`\n`, ASCII 0x0A)가 필요합니다. 그러나 많은 배포 플랫폼 (Zeabur, Vercel, Railway, Docker)은 환경 변수를 단일 행 문자열로 저장하여 `\n`을 리터럴 두 문자 시퀀스 `\` + `n`으로 변환합니다.

**이것이 FCM 푸시 알림 실패의 가장 흔한 원인입니다** — PEM 파서가 조용히 실패하고 푸시 알림이 전송되지 않으며, 오류 로그도 남지 않습니다.

**서버가 이를 자동으로 처리합니다**: `fcm.rs`가 리터럴 `\n` 시퀀스를 파싱 전에 실제 줄바꿈으로 정규화합니다. 두 가지 형식 모두 작동합니다:

- **단일 행 (클라우드 플랫폼 권장)**: JSON 파일의 `private_key` 값을 `\n` 이스케이프와 함께 그대로 붙여넣으세요:
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **여러 행 (.env 파일용)**: 전체 PEM 내용을 따옴표로 감싸고 실제 줄바꿈을 사용하세요:
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| 플랫폼 | 권장 형식 | 비고 |
|--------|----------|------|
| **Zeabur** | 단일 행 (`\n` 이스케이프) | Variables 패널에 JSON 값을 직접 붙여넣기 |
| **Docker / docker-compose** | 둘 다 가능 | 여러 행은 YAML `\|` 사용; 단일 행은 `.env`에서 |
| **Vercel / Railway** | 단일 행 (`\n` 이스케이프) | 입력 필드는 일반적으로 실제 줄바꿈을 지원하지 않습니다 |
| **Linux .env 파일** | 여러 행 (따옴표 사용) | 따옴표가 올바르게 닫혀 있는지 확인하세요 |

**문제 해결**: FCM 변수가 설정되어 있지만 Android 푸시가 작동하지 않는 경우 서버 로그를 확인하세요:
- `[FCM] No access token available` → 개인 키 형식 오류 (줄바꿈 문제)
- `[FCM] ✅ Push sent to user xxx` → FCM 전송 정상, 클라이언트 측 문제
- FCM 로그가 전혀 없음 → `FCM_PROJECT_ID`가 설정되지 않았거나 `fcm_tokens` 테이블에 토큰이 없음

### ntfy 푸시 (Google 서비스 없는 중국산 Android 기기)

Google Mobile Services가 없는 Android 기기 (Huawei, Xiaomi, OPPO, vivo 등)의 경우, PaperPhonePlus은 [ntfy](https://ntfy.sh)를 통한 푸시 알림을 지원합니다.

**기본 설정 (설정 불필요)**: 공개 ntfy.sh 서비스를 사용합니다. 추가 설정이 필요 없습니다.

**선택적 설정** (셀프 호스팅 ntfy 서버용):

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**사용자 설정 흐름**:
1. ntfy 앱을 설치합니다 ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [직접 다운로드](https://ntfy.sh))
2. PaperPhonePlus 설정을 열고 "ntfy 푸시" 카드를 찾습니다
3. 표시된 토픽 이름을 복사하고 ntfy 앱에서 구독합니다
4. "푸시 등록"을 탭하여 등록을 완료합니다

> **보안 참고**: ntfy 알림에는 알림 제목과 요약이 평문으로 포함됩니다 (실제 메시지 내용이 아님). 더 높은 보안을 위해 ntfy 서버를 셀프 호스팅하는 것을 고려하세요.

### APNS 푸시 (iOS 네이티브 앱)

APNS (Apple Push Notification Service)는 Capacitor로 빌드된 iOS 네이티브 앱에 푸시 알림을 전송합니다. 두 가지 설정 옵션이 있습니다:

#### 옵션 A: 직접 설정 (앱 개발자 서버)

1. [Apple Developer](https://developer.apple.com/account)에 로그인 → **Certificates, Identifiers & Profiles** → **Keys**
2. **+** 클릭하여 새 Key 생성 → **Apple Push Notifications service (APNs)** 체크 → 등록
3. **`.p8` 파일 다운로드** (⚠️ 한 번만 다운로드 가능!) 및 **Key ID** 기록
4. Apple Developer Membership 페이지에서 **Team ID** 기록 (10자 영숫자)
5. `server/.env`에 추가:

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(.p8 파일 내용)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphoneplus
APNS_SANDBOX=false
```

> `APNS_SANDBOX`: 개발/TestFlight 빌드의 경우 `true`, App Store 프로덕션의 경우 `false`로 설정합니다.

#### 옵션 B: 푸시 릴레이 경유 (셀프 호스팅 서버)

다른 사람의 iOS 앱 (예: App Store에서 다운로드)을 사용하는 경우 개발자의 Apple 자격 증명이 없으므로 APNS 푸시를 직접 전송할 수 없습니다. 대신 **푸시 릴레이**를 사용하세요.

**작동 방식:**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  셀프 호스팅 서버     │  HTTP  │  앱 개발자 서버           │  APNS  │  Apple  │
│  (Apple 자격 증명 없음)│──────→│  (.p8 Key + 릴레이 보유)  │──────→│  ──→ 📱 │
│                       │       │                          │       └─────────┘
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**1단계: 앱 개발자가 릴레이 엔드포인트를 활성화합니다**

앱 개발자의 서버 (이미 APNS 자격 증명이 있는)에서 릴레이 시크릿을 설정합니다:

```env
# 앱 개발자 서버 .env (이미 APNS_TEAM_ID 등이 설정되어 있음)
APNS_RELAY_SECRET=a_long_random_shared_secret
```

이렇게 하면 `POST /api/push-relay/apns` 푸시 릴레이 엔드포인트가 자동으로 활성화됩니다.

**2단계: 셀프 호스팅 사용자가 릴레이를 설정합니다**

셀프 호스팅 서버는 두 개의 변수만 필요합니다 — **Apple 자격 증명이 필요 없습니다**:

```env
# 셀프 호스팅 서버 .env
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=the_shared_secret_from_step_1
```

**작동 방식:**
1. 셀프 호스팅 서버가 오프라인 메시지를 수신 → 로컬 `apns_tokens` 테이블에서 사용자의 iOS 기기 토큰을 조회합니다
2. 기기 토큰 + 푸시 제목/본문을 HTTP POST로 릴레이에 전송합니다
3. 릴레이가 키를 검증한 후 자체 APNS 자격 증명을 사용하여 Apple에 전송합니다
4. 릴레이가 만료된 토큰 목록을 반환합니다; 셀프 호스팅 서버가 자동으로 로컬 데이터베이스를 정리합니다

> **우선순위**: 로컬 APNS 자격 증명 → 푸시 릴레이 → 건너뛰기 (무음). 둘 다 설정된 경우 로컬 직접 연결이 우선합니다.

> **보안 참고**: 릴레이는 푸시 알림 제목과 요약만 전송합니다 (예: "누군가 메시지를 보냈습니다"), 실제 메시지 내용은 전송하지 않습니다. 기기 토큰으로는 사용자 데이터를 읽을 수 없습니다.

### 푸시 릴레이 (전체 채널)

다른 사람이 게시한 앱 (예: App Store/Google Play에서)을 사용하는 셀프 호스팅 서버 운영자의 경우, 개발자의 푸시 자격 증명 (Apple .p8 Key / Firebase 서비스 계정 / OneSignal API Key)이 없습니다.

푸시 릴레이 시스템은 **APNS, FCM, OneSignal** 채널에 대한 릴레이 기능을 제공합니다:

**앱 개발자**가 서버에서 릴레이 엔드포인트를 활성화합니다:

```env
# 앱 개발자 서버 .env
APNS_RELAY_SECRET=a_long_random_string
FCM_RELAY_SECRET=a_long_random_string
ONESIGNAL_RELAY_SECRET=a_long_random_string
```

**셀프 호스팅 사용자**는 릴레이 URL과 키만 필요합니다 — **푸시 서비스 자격 증명이 필요 없습니다**:

```env
# 셀프 호스팅 서버 .env
# APNS (iOS 네이티브 푸시)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=shared_secret

# FCM (Android 네이티브 푸시)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=shared_secret

# OneSignal (Median.co 래핑 앱)
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=shared_secret
```

> **우선순위**: 로컬 자격 증명 → 푸시 릴레이 → 건너뛰기 (무음). 둘 다 설정된 경우 로컬 직접 연결이 우선합니다.

---

## 공식 푸시 릴레이

셀프 호스팅 서버 운영자는 공식 푸시 릴레이를 사용하여 푸시 자격 증명을 설정하지 않고도 iOS/Android 푸시 알림을 활성화할 수 있습니다:

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

위 줄을 셀프 호스팅 서버의 `.env` 파일에 추가하세요.

---

## 라이선스
이 프로젝트는 [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) 하에 라이선스가 부여됩니다.
