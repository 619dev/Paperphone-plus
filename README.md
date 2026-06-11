🌐 **其他语言 / Other Languages:** [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md) · [Español](README_ES.md)

一款微信风格的端对端加密即时通讯应用，采用无状态 ECDH + XSalsa20-Poly1305 逐消息加密，支持 iOS PWA 永久免签与 Cloudflare R2 文件存储。

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20Mesh-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-下载-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-下载-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-客户端下载-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-客户端下载-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

---

<details>
<summary>📸 截图预览（点击展开）</summary>


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

## 特性
| 功能 | 说明 |
|------|------|
| 🔐 端对端加密 | 无状态 ECDH + XSalsa20-Poly1305，逐消息临时密钥，前向保密，Signal 风格安全号码验证 |
| 🗝️ 零知识服务器 | 服务器只存储密文，私钥仅在设备本地（四层持久化） |
| 📹 视频/语音通话 | WebRTC P2P（1:1）+ Mesh（多人），Cloudflare TURN 穿透 |
| 🎙️ 变声功能 | 语音消息 / 1v1 通话 / 群组通话均支持实时变声，3 档可选（0.8x 低沉 / 1.0x 正常 / 1.2x 尖锐），基于 Web Audio API 音频处理链 |
| 👥 群聊 | 最多 2000 人群组，纯文本消息（无加密），免打扰模式，成员管理 |
| 👫 好友系统 | 添加好友需对方审核，支持 512 字验证消息；备注名称；好友标签分组 |
| ⏱️ 消息自动删除 | 5 档可选（永不/1天/3天/1周/1月），私聊双方均可设置，群聊群主专属 |
| 🔔 消息推送 | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS 五通道，离线也能收到通知（iOS 原生 + 国产安卓免 Google 服务） |
| 🌐 多语言 | 中文、英文、日语、韩语、法语、德语、俄语、西班牙语（自动检测 + 手动切换） |
| 📱 iOS 永久免签 | PWA H5 → Safari「添加到主屏幕」，无需企业证书 |
| 📱 Android 原生 App | 已上架 [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)，支持 FCM 推送通知 |
| 📱 iOS 原生 App | 已上架 [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178)，支持 APNS 推送通知 |
| 🖥️ Windows 桌面客户端 | 原生 Windows 桌面应用，[点击下载](https://github.com/619dev/ppp-win/releases) |
| 🍎 Mac 桌面客户端 | 原生 Mac 桌面应用，[点击下载](https://github.com/619dev/ppp-mac/releases) |
| 💬 消息功能 | 文字、图片、视频、文档文件（PDF/DOCX/XLSX 等带类型图标）、语音消息、Emoji 面板（200+，8 分类）、Telegram 贴纸包、已读状态 |
| 📤 文件上传 | 单文件最大 500MB，支持 Cloudflare R2 或本地存储，带进度条动画 |
| 🌐 朋友圈 | 发动态（文字+最多9张图或1个视频≤10分钟）、点赞（显示好友头像）、评论、标签可见性控制 |
| 👤 个人资料 | 联系人资料页（头像/昵称/朋友圈动态），支持「不看此人朋友圈」与「不让他看我的朋友圈」双向隐私控制 |
| 📰 时间线 | 小红书风格公开发帖区——双列瀑布流布局，图片/视频+文字（最多50个媒体、2000字），支持匿名发帖、点赞、评论 |
| 🏷️ 好友标签 | 为好友设置多个标签（12色预设调色板），按标签分类筛选通讯录 |
| 🗂️ R2 对象存储 | Cloudflare R2 存储图片/语音，可选公开 CDN 直链 |
| 🔑 两步验证 (2FA) | Google Authenticator 兼容 TOTP 验证，8 个一次性恢复码，登录时强制验证 |
| 📷 扫码加好友/入群 | 扫一扫二维码添加好友、加入群聊，群二维码可设置有效期（1 周/1 月/3 月） |
| 🏗️ 可自托管 | Docker Compose 一键部署，Zeabur 一键云部署，前端可部署至 Vercel |
| 🌐 代理设置 | 支持 SOCKS5 / HTTP / HTTPS 代理协议，可在登录页和设置页配置代理服务器地址、端口、用户名和密码，方便受限网络环境下使用 |
| 🛡️ 内容审核 | 用户举报（6 类原因）+ 拉黑用户（即时屏蔽动态/消息）+ 使用条款 EULA |
| 🔧 管理后台 | 内嵌 Web 管理面板（`/admin`，路径可自定义），密码保护，审核举报、删除违规内容、封禁用户，支持 8 种语言 |

---

## 技术栈
```
后端 (server/)
  Rust (Axum 0.8) — 高性能异步 Web 框架
  sqlx + MySQL 8.0 — 用户/消息持久化
  deadpool-redis + Redis 7 — 在线状态 + 跨节点路由
  aws-sdk-s3 — Cloudflare R2 文件存储（S3 兼容 API）
  argon2 + jsonwebtoken 认证

前端 (client/)
  React 19 + TypeScript + Vite 6
  Zustand 状态管理
  libsodium-wrappers-sumo (WebAssembly, Curve25519 / XSalsa20-Poly1305)
  WebRTC API — 视频/语音通话
  Web Audio API — 实时变声处理（ScriptProcessorNode 音频链）
  PWA: manifest.json + Service Worker

加密层
  无状态 ECDH + XSalsa20-Poly1305 — 逐消息临时 ECDH 密钥对，前向保密
  私钥四层持久化: 内存 → localStorage → sessionStorage → IndexedDB
  私钥全程存储在设备本地，从不上传服务器
```

---

### 方式零：Zeabur 一键云部署
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> [!TIP]
> **进阶方案：Zeabur + Vercel 混合部署**
> 可以在 Zeabur 部署完成后，手动删除 Zeabur 上的 **client** 服务，改用 Vercel 部署前端（参见下方“方式二”）。
> 这样 server/MySQL/Redis 由 Zeabur 托管，前端由 Vercel CDN 加速，全球访问更快。
> Vercel 上无需设置任何环境变量，用户在前端登录界面填写后端服务器地址即可连接。

**已知注意事项：**
- 首次启动 server 会自动创建数据库表（`CREATE TABLE IF NOT EXISTS`），无需手动导入 schema
- Redis 在集群内无需密码，已默认关闭认证
- 若需配置 MySQL root 密码，可在 server 服务的 `DB_PASS` 里手动填写 MySQL 服务的 `MYSQL_ROOT_PASSWORD`

---

### 方式一：Docker Compose（推荐）
```bash
# 克隆仓库
git clone <repo-url> && cd paperphone-plus

# 复制并编辑环境变量
cp server/.env.example server/.env
# 按需编辑：DB_PASS / JWT_SECRET / CF_CALLS_APP_ID 等

# 一键启动（含前端、后端、MySQL、Redis）
docker compose up -d

# 查看服务状态
docker compose ps

# 访问
open http://localhost
```

> **注意**：server 首次启动会自动初始化数据库 schema，无需手动导入 SQL 文件。

### 方式二：前端部署至 Vercel
```bash
# 1. Fork 本仓库

# 2. 在 Vercel 中导入前端项目
#    - Root Directory: client/
#    - Build Command: npm run build
#    - Output Directory: dist/
#    - 无需设置任何环境变量

# 3. 后端使用 Docker 部署或 Zeabur 部署

# 4. 打开 Vercel 部署的前端页面，在登录界面填写后端服务器地址即可
#    例如：https://your-server.zeabur.app
```

### 方式三：本地手动启动
#### 1. 启动后端（Rust）
```bash
cd server
cp .env.example .env  # 编辑环境变量
cargo run --release    # → http://localhost:3000
```

#### 2. 启动前端
```bash
cd client
npm install
npm run dev            # → http://localhost:5173
```

---

视频通话使用 WebRTC P2P，局域网内开箱即用。跨网络通话需要配置 TURN 服务器（用于 NAT 穿透）。

### 使用 Cloudflare TURN（推荐）
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Calls** → 创建 App
2. 获取 **App ID** 和 **App Secret**（Token Key）
3. 填入 `server/.env`：

```env
CF_CALLS_APP_ID=your_app_id_here
CF_CALLS_APP_SECRET=your_app_secret_here
```

4. 重启后端，TURN 凭据会在每次通话时自动刷新（TTL 86400s）

### 使用 Metered.ca TURN（免费备选方案）
1. 在 [Metered.ca](https://www.metered.ca) 注册账号
2. 创建 TURN App 并获取 **API Key**
3. 填入 `server/.env`：

```env
METERED_TURN_API_KEY=your_metered_api_key_here
```

> **优先级**：Cloudflare TURN → Metered.ca TURN → STUN only（公共 STUN），自动降级。

> **均未配置时**：自动降级为 STUN only（Google + Cloudflare 公共 STUN），局域网内可正常通话。

### 通话功能说明
| 类型 | 技术方案 | 适用场景 |
|------|----------|----------|
| 私聊 1:1 视频 | WebRTC P2P + TURN | 所有场景 |
| 私聊 1:1 语音 | WebRTC P2P + TURN | 所有场景 |
| 群组多人语音/视频 | WebRTC Mesh（全连接） | ≤ 6 人 |

### 变声功能说明

语音消息、1v1 通话、群组通话均支持实时变声，3 档模式可选：

| 模式 | 倍速 | 效果说明 |
|------|------|----------|
| 🐢 慢速 | 0.8x | 声音变低沉，适合匿名 |
| 🔊 正常 | 1.0x | 原声，无处理 |
| 🐇 快速 | 1.2x | 声音变尖锐，适合趣味聊天 |

**技术实现**：使用 Web Audio API 构建音频处理链（AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination），对麦克风采集的音频流进行实时音高/速度调整，处理后的音频流替换原始流发送给对方。

- **语音消息**：录音时选择变声模式，发出的 `.webm` 音频文件已包含变声效果，接收方无法还原原声，实现真正的匿名发送
- **1v1 / 群组通话**：通话中点击变声按钮循环切换模式，通过 `RTCRtpSender.replaceTrack()` 实时替换音频轨道

---

离线消息通知通过**五通道**推送，最大化消息送达率：

| 通道 | 适用场景 | 配置 |
|------|----------|------|
| Web Push (VAPID) | 浏览器 (Chrome/Edge/Firefox) + iOS PWA (Safari 16.4+) | VAPID 密钥 |
| FCM (Firebase) | Capacitor 打包的原生 Android App | Firebase 服务账号 JSON |
| OneSignal | Median.co 打包的原生 Android/iOS App | OneSignal App ID + REST Key |
| ntfy | 国产安卓设备（华为/小米/OPPO/vivo 等无 Google 服务） | 无需配置（默认使用 ntfy.sh 公共服务） |
| APNS | Capacitor 打包的原生 iOS App | Apple .p8 Key 或 Push Relay |

### 配置 Web Push
1. 生成 VAPID 密钥（仅需一次）：

```bash
npx web-push generate-vapid-keys
```

2. 填入 `server/.env`：

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@your-domain.com
```

3. 重启服务器，用户可在设置页开启通知

> **iOS 用户**需先将应用「添加到主屏幕」，且仅 iOS 16.4+ 支持。

### 配置 OneSignal（Median.co 原生 App）
1. 在 [OneSignal Dashboard](https://onesignal.com) 创建 App 并配置 Firebase
2. 在 Median.co 中启用 OneSignal 并填入 App ID
3. 将 OneSignal 的 **App ID** 和 **REST API Key** 填入 `server/.env`：

```env
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_KEY=your_onesignal_rest_api_key
```

### 配置 FCM（Capacitor 原生 Android App）
1. 在 [Firebase Console](https://console.firebase.google.com) 创建项目并添加 Android 应用
2. 进入 Project Settings → Service accounts → Generate new private key，下载 JSON 文件
3. 从 JSON 文件中提取以下三个字段，填入 `server/.env`：

```env
FCM_PROJECT_ID=your_firebase_project_id
FCM_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...base64...\n-----END PRIVATE KEY-----\n"
```

> **未配置时**：推送功能静默禁用，不影响其他功能。

> **自建服务器用户**：如果你没有 Firebase 凭据（使用别人发布的 Android App），可以通过 [Push Relay](#push-relay-推送中继) 来实现 FCM 推送。

#### ⚠️ FCM 私钥换行符问题

Firebase 服务账号 JSON 文件中的 `private_key` 字段包含 RSA 私钥，其 PEM 格式要求每 64 个字符有一个**真实换行符**（`\n`）。但在不同部署环境中，换行符的处理方式各不相同，这是 FCM 推送配置中**最常见的失败原因**。

**问题本质**：`from_rsa_pem()` 解析 PEM 格式时，要求私钥中的 `\n` 是**真实的换行符**（ASCII 0x0A），而不是字面上的两个字符 `\` 和 `n`。如果环境变量中的 `\n` 被当作普通字符串存储，PEM 解析会静默失败，导致 FCM 推送完全不工作，且**不会有任何报错日志**。

**服务端已做兼容处理**：`fcm.rs` 会自动将字面量 `\n` 转换为真实换行符，因此以下两种格式都支持：

<details>
<summary><b>格式一：单行（推荐用于 Zeabur / Docker / CI 环境变量）</b></summary>

直接从 JSON 文件中复制 `private_key` 的值（保留 `\n` 转义符），粘贴为一行：

```env
FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n
```

服务端代码会自动将 `\n` 转换为真实换行符。

</details>

<details>
<summary><b>格式二：多行（适用于 .env 文件或支持多行的平台）</b></summary>

用引号包裹完整的 PEM 内容（每行一个真实换行）：

```env
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQE...
...base64 encoded content...
-----END PRIVATE KEY-----
"
```

</details>

**各平台配置指南**：

| 部署平台 | 推荐格式 | 注意事项 |
|----------|----------|----------|
| **Zeabur** | 单行（`\n` 转义） | 在 Variables 面板直接粘贴 JSON 中的原始值即可 |
| **Docker / docker-compose** | 单行或多行均可 | YAML 多行用 `\|` 语法；`.env` 文件建议用单行 |
| **Vercel / Railway** | 单行（`\n` 转义） | 环境变量输入框通常不支持真实多行 |
| **Linux .env 文件** | 多行（引号包裹） | 确保引号闭合，注意 shell 转义 |

**排查方法**：如果配置了 FCM 环境变量但 Android 仍收不到推送，可检查服务端日志：
- 日志出现 `[FCM] No access token available` → 私钥格式错误（换行符问题）
- 日志出现 `[FCM] ✅ Push sent to user xxx` → FCM 发送成功，问题在客户端
- 无任何 FCM 相关日志 → `FCM_PROJECT_ID` 未配置或 `fcm_tokens` 表中没有该用户的 token

### 配置 ntfy（国产安卓设备无 Google 服务）

对于华为、小米、OPPO、vivo 等无法使用 Google Mobile Services 的国产安卓设备，PaperPhone 支持通过 [ntfy](https://ntfy.sh) 发送推送通知。

**默认配置（零配置即可使用）**：使用 ntfy.sh 公共服务，无需任何额外配置。

**可选配置**（自建 ntfy 服务器时使用）：

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**用户使用流程**：
1. 安装 ntfy App（[Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [直接下载](https://ntfy.sh)）
2. 在 PaperPhone 设置页找到「ntfy 推送」卡片
3. 复制显示的 topic 名称，在 ntfy App 中订阅
4. 点击「注册推送」按钮完成注册

> **安全说明**：ntfy 通知内容为明文（通知标题和摘要），不包含消息原文内容。如需更高安全性，可自建 ntfy 服务器。

### 配置 APNS（Capacitor 原生 iOS App）

APNS (Apple Push Notification Service) 用于向原生 iOS App 发送推送通知。有两种配置方式：

#### 方式 A：直接配置（适用于 App 开发者自己的服务器）

1. 登录 [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Keys**
2. 点击 **+** 创建新 Key → 勾选 **Apple Push Notifications service (APNs)** → Register
3. **下载 `.p8` 文件**（⚠️ 只能下载一次！），记录页面上的 **Key ID**
4. 在 Apple Developer 账号页面记录你的 **Team ID**（10 位字母数字）
5. 填入 `server/.env`：

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...（.p8 文件内容）...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphone
APNS_SANDBOX=false
```

> `APNS_SANDBOX`：开发/TestFlight 构建设为 `true`，App Store 生产包设为 `false`。

#### 方式 B：通过 Push Relay（适用于自建服务器用户）

如果你使用别人发布的 iOS App（如从 App Store 下载），你没有 App 开发者的 Apple 凭据，无法直接发送 APNS 推送。此时需要通过 **Push Relay（推送中继）** 来实现。

**工作原理：**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  自建服务器            │  HTTP  │  App 开发者的服务器       │  APNS  │  Apple  │
│  (无 Apple 凭据)      │──────→│  (有 .p8 Key + Relay)   │──────→│  ──→ 📱 │
│                      │       │                         │       └─────────┘
│  APNS_RELAY_URL=...  │       │  APNS_TEAM_ID=...       │
│  APNS_RELAY_KEY=...  │       │  APNS_RELAY_SECRET=...  │
└──────────────────────┘       └─────────────────────────┘
```

**步骤 1：App 开发者启用 Relay 端点**

App 开发者在**自己的服务器**上，除了配置 APNS 凭据外，还需设置一个 Relay 密钥：

```env
# App 开发者的服务器 .env（已有 APNS_TEAM_ID 等凭据）
APNS_RELAY_SECRET=生成一个长随机字符串作为共享密钥
```

设置后，服务器会自动在 `POST /api/push-relay/apns` 开启推送中继端点。

**步骤 2：自建用户配置 Relay**

自建服务器用户只需设置两个变量，**无需任何 Apple 凭据**：

```env
# 自建服务器 .env
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=与开发者约定的共享密钥
```

**工作流程：**
1. 自建服务器收到离线消息 → 查询本地 `apns_tokens` 表获取用户的 iOS 设备 token
2. 将设备 token + 推送标题/内容通过 HTTP POST 发送到 Relay
3. Relay 验证密钥后，使用自己的 APNS 凭据发送到 Apple
4. Relay 返回过期 token 列表，自建服务器自动清理本地数据库

> **优先级**：本地 APNS 凭据 → Push Relay → 跳过（静默）。如果同时配置了本地 APNS 和 Relay，优先使用本地直连。

> **安全说明**：Relay 仅传输推送通知标题和摘要（如「某某发来一条消息」），不包含消息原文。设备 token 本身无法用于读取用户数据。

### Push Relay 推送中继

对于自建服务器用户，如果你使用别人发布的 App（如从 App Store/Google Play 下载），你没有 App 开发者的推送凭据（Apple .p8 Key / Firebase 服务账号 / OneSignal API Key），无法直接发送推送通知。

Push Relay 系统为 **APNS、FCM、OneSignal** 三个通道统一提供了推送中继能力：

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌──────────────┐
│  自建服务器            │  HTTP  │  App 开发者的服务器       │       │  推送服务      │
│  (无推送凭据)          │──────→│  (有凭据 + Relay)        │──────→│  Apple/Google │
│                      │       │                         │       │  OneSignal    │
│  *_RELAY_URL=...     │       │  *_RELAY_SECRET=...     │       └──────────────┘
│  *_RELAY_KEY=...     │       │                         │
└──────────────────────┘       └─────────────────────────┘
```

**App 开发者**在自己的服务器上设置 Relay Secret 以启用中继端点：

```env
# App 开发者的服务器 .env
APNS_RELAY_SECRET=一个长随机字符串
FCM_RELAY_SECRET=一个长随机字符串
ONESIGNAL_RELAY_SECRET=一个长随机字符串
```

**自建用户**只需配置指向 Relay 的 URL 和密钥，**无需任何推送服务凭据**：

```env
# 自建服务器 .env
# APNS (iOS 原生推送)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=与开发者约定的共享密钥

# FCM (Android 原生推送)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=与开发者约定的共享密钥

# OneSignal (Median.co 打包的 App)
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=与开发者约定的共享密钥
```

> **优先级**：本地凭据 → Push Relay → 跳过（静默）。如果同时配置了本地凭据和 Relay，优先使用本地直连。

> **安全说明**：Relay 仅传输推送通知标题和摘要（如「某某发来一条消息」），不包含消息原文。

---

## iOS 永久免签部署
1. 部署到有 HTTPS 域名的服务器（WebRTC 和加密 API 需要 HTTPS）
2. 用 **Safari** 打开 `https://your.domain.com`
3. 点击底部分享按钮 ⬆️
4. 选择「添加到主屏幕」→「添加」

即可获得与原生 App 相同的体验，无需 Apple 企业证书，永久有效！

---

## 生产部署（Nginx）
```nginx
server {
    listen 443 ssl http2;
    server_name your.domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 前端静态文件（或使用 Vercel 单独部署）
    location / {
        root /path/to/paperphone-plus/client/dist;
        try_files $uri /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }

    # WebSocket 信令
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

---

```
paperphone-plus/
├── docker-compose.yml
├── zeabur.yaml
├── server/                          # Rust (Axum) 后端
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── main.rs                  # Axum 应用入口
│       ├── config.rs                # 环境变量管理
│       ├── db/
│       │   ├── mysql.rs             # MySQL 连接池 (sqlx)
│       │   ├── redis.rs             # Redis 连接池 (deadpool-redis)
│       │   └── schema.sql           # 数据库 schema（幂等）
│       ├── auth/
│       │   ├── jwt.rs               # JWT 签名/验证（含 2FA pending token）
│       │   └── middleware.rs        # Axum 鉴权中间件
│       ├── routes/
│       │   ├── auth.rs              # 注册/登录（含 X3DH 公钥上传）
│       │   ├── users.rs             # 用户搜索 / Prekey 下载
│       │   ├── friends.rs           # 好友申请 / 接受
│       │   ├── groups.rs            # 群组管理
│       │   ├── messages.rs          # 消息历史分页
│       │   ├── upload.rs            # Cloudflare R2 文件上传
│       │   ├── files.rs             # 文件代理（R2_PUBLIC_URL 未设时）
│       │   ├── moments.rs           # 朋友圈（动态/点赞/评论/隐私控制）
│       │   ├── timeline.rs          # 时间线（公开发帖/点赞/评论/匿名）
│       │   ├── calls.rs             # TURN 凭据派发
│       │   ├── push.rs              # 推送订阅管理
│       │   ├── push_relay.rs        # APNS / FCM / OneSignal 推送中继端点
│       │   ├── stickers.rs          # Telegram 贴纸包代理（缓存）
│       │   ├── totp.rs              # TOTP 两步验证
│       │   ├── sessions.rs          # 会话管理（多设备登录）
│       │   ├── tags.rs              # 好友标签 CRUD
│       │   ├── report.rs            # 内容举报
│       │   └── admin/               # 管理后台（内嵌 HTML SPA + API）
│       ├── services/
│       │   ├── push.rs              # Web Push VAPID 服务
│       │   ├── fcm.rs               # Firebase Cloud Messaging 服务（直连 + Relay）
│       │   ├── onesignal.rs         # OneSignal REST API 服务（直连 + Relay）
│       │   ├── ntfy.rs              # ntfy 推送服务（国产安卓）
│       │   └── apns.rs              # APNS 推送服务（iOS 原生 + Relay）
│       └── ws/
│           └── server.rs            # WebSocket 路由（消息/通话信令/已读/推送）
│
└── client/                          # React + TypeScript + Vite 前端
    ├── package.json
    ├── Dockerfile
    ├── vercel.json                  # Vercel 部署配置（SPA 路由 + 安全头，无需环境变量）
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx                 # React 入口
        ├── App.tsx                  # 路由 + 鉴权守卫
        ├── index.css                # Premium 设计系统（暗色/亮色，玻璃拟态）
        ├── vite-env.d.ts
        ├── store/
        │   └── index.ts             # Zustand 全局状态
        ├── api/
        │   ├── http.ts              # HTTP 客户端（JWT 拦截）
        │   └── socket.ts            # WebSocket 客户端（自动重连 + 心跳）
        ├── i18n/
        │   ├── index.ts             # 多语言引擎
        │   └── locales/             # zh/en/ja/ko/fr/de/ru/es
        ├── crypto/
        │   ├── ratchet.ts           # ECDH + XSalsa20-Poly1305 加密
        │   └── keystore.ts          # 四层私钥持久化
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useI18n.ts
        │   └── useSocket.ts
        ├── components/
        │   └── TabBar.tsx           # 底部导航栏
        └── pages/
            ├── Login.tsx            # 登录/注册（含密钥生成、2FA、语言切换）
            ├── Chats.tsx            # 会话列表
            ├── Chat.tsx             # 聊天窗口（消息气泡、输入框）
            ├── Contacts.tsx         # 通讯录（好友/群组/好友请求）
            ├── Discover.tsx         # 发现页
            ├── Profile.tsx          # 设置（深色模式、语言、退出）
            ├── UserProfile.tsx      # 联系人资料页
            ├── GroupInfo.tsx         # 群信息
            ├── Moments.tsx          # 朋友圈（图片网格、点赞、评论）
            └── Timeline.tsx         # 时间线（瀑布流布局）
```

---

## 数据库结构
共 19+ 张表，首次启动自动创建（`CREATE TABLE IF NOT EXISTS`）：

| 表名 | 说明 |
|------|------|
| `users` | 用户信息 + ECDH/OPK 公钥 |
| `prekeys` | X3DH 一次性预密钥池 |
| `friends` | 好友关系（pending/accepted/blocked） |
| `groups` / `group_members` | 群组 + 成员（含免打扰状态） |
| `messages` | 加密消息（离线缓冲，送达后可删） |
| `moments` | 朋友圈动态（文字 ≤1024 字） |
| `moment_images` | 动态图片（每条最多 9 张） |
| `moment_videos` | 动态视频（封面图+时长，每条最多 1 个，≤10 分钟） |
| `moment_likes` | 点赞（每用户每条唯一） |
| `moment_comments` | 评论（最多 512 字/条） |
| `moment_visibility` | 动态可见性规则 |
| `moment_privacy` | 朋友圈用户级隐私设置（不看/不让看） |
| `push_subscriptions` | Web Push 推送订阅（VAPID） |
| `fcm_tokens` | FCM 设备令牌（Capacitor Android） |
| `onesignal_players` | OneSignal 设备注册（Median.co） |
| `ntfy_subscriptions` | ntfy 推送订阅（国产安卓设备） |
| `apns_tokens` | APNS 设备令牌（Capacitor iOS） |
| `user_totp` | TOTP 两步验证密钥与恢复码 |
| `sessions` | 多设备会话管理 |
| `friend_tags` / `friend_tag_assignments` | 好友标签系统 |
| `timeline_posts` | 时间线帖子（文字 ≤2000 字，支持匿名） |
| `timeline_media` | 时间线媒体（图片/视频，每帖最多 50 个） |
| `timeline_likes` | 时间线点赞 |
| `timeline_comments` | 时间线评论（支持匿名） |
| `group_invites` | 群邀请链接（含有效期，用于二维码加群） |
| `reports` | 用户举报记录（举报人、目标、原因、状态） |
| `user_blocks` | 用户拉黑关系 |

---

## 安全模型
```
注册时:
  设备本地生成 IK（身份密钥）+ SPK（签名预密钥）+ 20x OPK（一次性预密钥）
  公钥上传服务器，私钥四层持久化，永不离开设备

发送消息时:
  发送方下载接收方 IK 公钥
  生成临时 ECDH 密钥对（每条消息独立）
  X25519 ECDH → 共享秘密 → XSalsa20-Poly1305 加密
  临时公钥附在消息 header 中，接收方解密后销毁

服务器所见:
  ✅ 密文 blob + 路由元数据（发件人/收件人 UUID）
  ❌ 明文 / 私钥 / 临时密钥 / 通话内容
```

---

## 环境变量参考
| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `JWT_SECRET` | JWT 签名密钥（**生产必改**） | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | MySQL 连接配置 | — |
| `REDIS_HOST` / `REDIS_PASS` | Redis 连接配置 | — |
| `R2_ACCOUNT_ID` | Cloudflare 账号 ID | — |
| `R2_ACCESS_KEY_ID` | R2 API Token 的 Access Key | — |
| `R2_SECRET_ACCESS_KEY` | R2 API Token 的 Secret Key | — |
| `R2_BUCKET` | R2 Bucket 名称 | — |
| `R2_PUBLIC_URL` | R2 公开 URL（可选），设置后文件走 CDN 直链 | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID（可选） | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret（可选） | — |
| `METERED_TURN_API_KEY` | Metered.ca TURN API Key（可选，免费备选方案） | — |
| `VAPID_PUBLIC_KEY` | Web Push VAPID 公钥（可选） | — |
| `VAPID_PRIVATE_KEY` | Web Push VAPID 私钥（可选） | — |
| `VAPID_SUBJECT` | VAPID 联系邮箱（可选） | `mailto:admin@paperphone.app` |
| `FCM_PROJECT_ID` | Firebase 项目 ID（可选，Capacitor Android） | — |
| `FCM_CLIENT_EMAIL` | Firebase 服务账号邮箱（可选） | — |
| `FCM_PRIVATE_KEY` | Firebase 服务账号私钥（可选，支持 `\n` 转义和真实换行两种格式，详见[FCM 配置说明](#配置-fcmcapacitor-原生-android-app)） | — |
| `FCM_RELAY_SECRET` | FCM 推送中继密钥（可选，在 Relay 主机上设置以启用中继端点） | — |
| `FCM_RELAY_URL` | FCM 推送中继 URL（可选，自建服务器指向 Relay 主机） | — |
| `FCM_RELAY_KEY` | FCM 推送中继认证密钥（可选，与 Relay 主机的 `FCM_RELAY_SECRET` 一致） | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID（可选，Median.co） | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key（可选） | — |
| `ONESIGNAL_RELAY_SECRET` | OneSignal 推送中继密钥（可选，在 Relay 主机上设置以启用中继端点） | — |
| `ONESIGNAL_RELAY_URL` | OneSignal 推送中继 URL（可选，自建服务器指向 Relay 主机） | — |
| `ONESIGNAL_RELAY_KEY` | OneSignal 推送中继认证密钥（可选，与 Relay 主机的 `ONESIGNAL_RELAY_SECRET` 一致） | — |
| `NTFY_BASE_URL` | ntfy 服务器地址（可选，默认使用 ntfy.sh 公共服务） | `https://ntfy.sh` |
| `NTFY_TOKEN` | ntfy 认证 Token（可选，自建服务器时使用） | — |
| `APNS_TEAM_ID` | Apple Developer Team ID（可选，iOS 原生推送） | — |
| `APNS_KEY_ID` | APNS 认证密钥 ID（可选） | — |
| `APNS_PRIVATE_KEY` | APNS .p8 私钥内容（可选，支持 `\n` 转义） | — |
| `APNS_BUNDLE_ID` | iOS App Bundle Identifier（可选） | — |
| `APNS_SANDBOX` | APNS 沙盒模式（可选，开发/TestFlight 用 `true`） | `false` |
| `APNS_RELAY_SECRET` | 推送中继密钥（可选，在 Relay 主机上设置以启用中继端点） | — |
| `APNS_RELAY_URL` | 推送中继 URL（可选，自建服务器指向 Relay 主机） | — |
| `APNS_RELAY_KEY` | 推送中继认证密钥（可选，与 Relay 主机的 `APNS_RELAY_SECRET` 一致） | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token（可选，贴纸包代理） | — |
| `STICKER_PACKS` | 自定义贴纸包列表（可选，逗号分隔 `包名:显示名`） | 内置 9 个默认包 |
| `ADMIN_PATH` | 管理后台 URL 路径 | `/admin` |
| `ADMIN_PASSWORD` | 管理后台访问密码（**生产必改**） | `admin123` |

---

## 官方推送中继服务

自建服务器用户可使用以下官方推送中继，无需自行配置推送凭据即可让 iOS/Android 用户收到推送通知：

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

将以上内容添加到自建服务器的 `.env` 文件中即可。

---
如果这个项目对你有用的话，请我喝罐可乐吧。
<br>
<img width=30% height=30% src="请我喝可乐.jpg" alt="qrcode">
<br>
Telegram群组：https://t.me/+vHJtvWJY_gEyMTUx

---

## 开源协议
本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) 开源。

简而言之：
- ✅ 个人和企业均可自由部署和使用
- ✅ 允许修改代码
- ⚠️ 修改后通过网络提供服务时，必须公开修改后的源代码
- ⚠️ 衍生作品必须使用相同协议
