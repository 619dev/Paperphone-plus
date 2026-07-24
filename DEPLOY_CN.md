# 📦 部署指南

本文档详细介绍 PaperPhonePlus 的两种推荐部署方式，以及各平台客户端的服务器地址配置方法。

> **核心思路**：后端（server）、数据库（MySQL）、缓存（Redis）和会议 SFU（LiveKit）部署在服务器端；前端（client）可独立部署到 Vercel。客户端通过 **server 地址** 连接业务后端，并通过 `LIVEKIT_URL` 连接会议服务。

---

## 目录

- [方式一：Zeabur 模版 + Vercel 前端（推荐）](#方式一zeabur-模版--vercel-前端推荐)
- [方式二：Docker Compose + Nginx 本地部署](#方式二docker-compose--nginx-本地部署)
- [客户端服务器地址配置](#客户端服务器地址配置)

---

## 方式一：Zeabur 模版 + Vercel 前端（推荐）

此方案将 server、MySQL、Redis、LiveKit 部署在 Zeabur，前端部署到 Vercel。Zeabur 当前不支持 UDP 服务端口，LiveKit 会使用 ICE/TCP 7881 回退；功能可用，但弱网质量不等同于开放 UDP 的生产部署。

### 第一步：使用 Zeabur 模版部署

1. 点击一键部署按钮：

   [![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

2. 登录 Zeabur 账号（支持 GitHub 登录）
3. 选择部署区域（建议选择离目标用户最近的区域）
4. 按提示填写环境变量。`LIVEKIT_API_SECRET` 应为至少 32 字节的随机值；模板会自动把相同密钥传给 server 和 LiveKit
5. 等待所有服务启动完成

### 第二步：删除 Zeabur 上的 client 服务

部署完成后，Zeabur 会创建 `client`、`server`、`MySQL`、`Redis`、`LiveKit` 五个服务。由于前端单独部署到 Vercel，需要删除 Zeabur 上的 client 服务：

1. 进入 [Zeabur Dashboard](https://dash.zeabur.com)
2. 找到刚部署的项目
3. 点击 **client** 服务
4. 进入服务设置 → 底部找到 **Delete Service**（删除服务）
5. 确认删除

> ⚠️ 仅删除 `client`，**不要**删除 `server`、`MySQL`、`Redis` 或 `LiveKit`。

### Zeabur 上的会议限制与升级路径

- 当前模板公开 LiveKit WebSocket/API 7880 和 ICE/TCP 7881，UDP 7882 仅保留在内部配置。
- TCP 回退适合功能验证和一般网络；百人生产会议建议使用 LiveKit Cloud，或将 LiveKit 单独部署到具有公网 IP、可开放 UDP 7882 的主机。
- 外置 LiveKit 时，在 Zeabur 的 `server` 服务中设置 `LIVEKIT_URL=wss://meeting.example.com`，并保证 `LIVEKIT_API_KEY`、`LIVEKIT_API_SECRET` 与外置 LiveKit 完全一致。
- Zeabur 将来支持 UDP 后，在 LiveKit 服务声明 UDP 7882，并在防火墙开放该端口即可；客户端无需修改。

### 第三步：记录 server 服务的域名

1. 在 Zeabur Dashboard 中点击 **server** 服务
2. 进入 **Networking** 选项卡
3. 记录 server 服务的公网域名，例如：`https://your-server-xxx.zeabur.app`
4. 如需自定义域名，可在此处绑定自己的域名

### 第四步：在 Vercel 部署前端

1. **Fork 本仓库** 到你的 GitHub 账号

2. 登录 [Vercel](https://vercel.com)，点击 **Add New Project**

3. 从 GitHub 导入你 fork 的仓库

4. 配置项目设置：

   | 配置项 | 值 |
   |--------|-----|
   | **Root Directory** | `client/` |
   | **Framework Preset** | Vite |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist/` |

5. **无需设置任何环境变量** — 用户在前端登录页面填写后端服务器地址即可

6. 点击 **Deploy** 开始部署

7. 部署完成后，Vercel 会分配一个域名（如 `your-app.vercel.app`），也可以绑定自定义域名

### 第五步：验证部署

1. 打开 Vercel 部署的前端页面
2. 在登录页面的服务器地址输入框中，填写 Zeabur 上 **server** 服务的域名（如 `https://your-server-xxx.zeabur.app`）
3. 注册账号并登录
4. 测试消息发送、文件上传等功能

---

## 方式二：Docker Compose + Nginx 本地部署

此方案适合有自己服务器的用户，将所有服务（除前端外）通过 Docker Compose 部署，使用 Nginx 作为反向代理提供 HTTPS 访问。

### 第一步：准备服务器环境

**系统要求**：
- Linux 服务器（推荐 Ubuntu 22.04+ / Debian 12+）
- 已安装 Docker 和 Docker Compose
- 一个域名（已解析到服务器 IP）
- 建议至少 2GB 内存

**安装 Docker**（如未安装）：
```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker 服务
sudo systemctl enable docker
sudo systemctl start docker

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
# 重新登录使组变更生效
```

### 第二步：克隆项目并配置

```bash
# 克隆仓库
git clone <repo-url> && cd paperphone-plus

# 复制并编辑环境变量
cp server/.env.example server/.env
```

编辑 `server/.env` 文件，配置必要的环境变量：

```bash
# 必须修改的配置
JWT_SECRET=你的随机密钥字符串          # 生产环境必须更改
DB_PASS=你的数据库密码                 # 与 docker-compose.yml 中保持一致
ADMIN_PASSWORD=你的管理后台密码        # 生产环境必须更改
LIVEKIT_URL=wss://meeting.example.com
LIVEKIT_API_KEY=你的会议API密钥
LIVEKIT_API_SECRET=至少32字节随机密钥

# 可选配置（按需填写）
R2_ACCOUNT_ID=...                     # Cloudflare R2 文件存储
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
CF_CALLS_APP_ID=...                   # Cloudflare TURN（视频通话）
CF_CALLS_APP_SECRET=...
VAPID_PUBLIC_KEY=...                  # Web Push 推送通知
VAPID_PRIVATE_KEY=...
```

### 第三步：修改 docker-compose.yml，删除 client 部分

由于前端将通过 Nginx 直接提供服务（或部署到 Vercel），需要从 `docker-compose.yml` 中删除 `client` 服务。

编辑 `docker-compose.yml`，**删除以下内容**：

```yaml
  # ── Frontend (Nginx + React SPA) ────────────────────────────
  client:
    container_name: paperphone-plus-client
    image: facilisvelox/paperphone-plus-client:latest
    ports:
      - "80:80"
    depends_on:
      server:
        condition: service_healthy
    restart: unless-stopped
```

删除后应保留 `server`、`mysql`、`redis`、`livekit` 四个服务。不要删除 `livekit`，否则群会议令牌接口会返回未配置错误。

### 第四步：启动 Docker 服务

```bash
# 启动所有服务（后端 + MySQL + Redis）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f server
```

确认所有服务状态为 `running` 且 `healthy`。server 首次启动会自动创建数据库表，无需手动导入 SQL。升级现有部署时，server 还会检查 `users.username` 和 `users.nickname` 的字符集，并在需要时迁移为 `utf8mb4`，从而支持中文用户名与昵称搜索。生产升级前仍建议备份 MySQL。

### 第五步：构建前端静态文件

> [!NOTE]
> 目前 iOS、Android、Windows、Mac 客户端均已完成，无需在服务器上部署 Web 前端，此步骤可省略。

有两种方式获取前端静态文件：

**方式 A：本地构建（推荐）**

```bash
cd client
npm install
npm run build
# 构建产物在 client/dist/ 目录
```

**方式 B：从 Docker 镜像提取**

```bash
# 创建临时容器并复制文件
docker create --name temp-client facilisvelox/paperphone-plus-client:latest
docker cp temp-client:/usr/share/nginx/html ./client/dist
docker rm temp-client
```

### 第六步：安装并配置 Nginx

**安装 Nginx**：

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y nginx

# CentOS / RHEL
sudo yum install -y nginx

# 启动 Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

**安装 SSL 证书**（使用 Let's Encrypt 免费证书）：

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（将 your.domain.com 替换为你的域名）
sudo certbot --nginx -d your.domain.com

# 证书会自动配置到 Nginx，并设置自动续期
```

**配置 Nginx**：

推荐直接使用仓库中同时代理业务后端与 LiveKit 的双域名配置：

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/paperphone-plus.conf /etc/nginx/sites-available/paperphone-plus
sudo nano /etc/nginx/sites-available/paperphone-plus
```

把文件中的 `api.example.com`、`meeting.example.com` 和证书路径替换为实际值。先为两个域名申请证书：

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d api.example.com -d meeting.example.com
sudo ln -s /etc/nginx/sites-available/paperphone-plus /etc/nginx/sites-enabled/paperphone-plus
sudo nginx -t
sudo systemctl reload nginx
```

后端环境变量设置为 `LIVEKIT_URL=wss://meeting.example.com`。Nginx 负责 443 上的 API、IM WebSocket 与 LiveKit WebSocket；还必须在主机防火墙和云安全组直接开放 `7881/tcp` 与 `7882/udp`。例如使用 UFW：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 7882/udp
```

以下单域名配置只适用于不启用群会议的旧式部署；启用会议时请使用上面的仓库配置。创建站点配置文件：

```bash
sudo nano /etc/nginx/sites-available/paperphoneplus
```

写入以下内容（将 `your.domain.com` 替换为你的域名）：

```nginx
server {
    listen 80;
    server_name your.domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your.domain.com;

    ssl_certificate     /etc/letsencrypt/live/your.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;

    # SSL 安全优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # 文件上传大小限制（与 500MB 文件上传对应）
    client_max_body_size 512M;

    # 前端静态文件
    location / {
        root /path/to/paperphone-plus/client/dist;
        try_files $uri /index.html;

        # 缓存优化
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 信令（实时通讯）
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # 管理后台（可选，路径与 ADMIN_PATH 环境变量一致）
    location /admin {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

**启用站点并重启 Nginx**：

```bash
# 创建符号链接启用站点
sudo ln -s /etc/nginx/sites-available/paperphoneplus /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置文件语法
sudo nginx -t

# 重启 Nginx
sudo systemctl reload nginx
```

### 第七步：验证部署

1. 浏览器访问 `https://your.domain.com`，应能看到前端登录页面
2. 注册账号并测试各项功能
3. 检查 WebSocket 连接是否正常（聊天消息实时送达）
4. 测试文件上传功能

### 故障排查

```bash
# 检查 Docker 容器状态
docker compose ps

# 查看后端日志
docker compose logs -f server

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 检查端口占用
sudo ss -tlnp | grep -E '80|443|3000|3306|6379'

# 重启所有服务
docker compose restart
sudo systemctl restart nginx
```

---

## 客户端服务器地址配置

所有客户端（iOS、Android、Web、Windows、macOS）连接的服务器地址，应该填写 **server 后端服务** 的地址，而非前端地址。

> ⚠️ **重要**：客户端中填写的服务器地址是 **后端 server 的地址**，不是前端网页的地址。

### 各部署方式对应的服务器地址

| 部署方式 | 服务器地址 | 示例 |
|----------|-----------|------|
| **Zeabur** | Zeabur 上 server 服务的域名 | `https://your-server-xxx.zeabur.app` |
| **Docker Compose + Nginx** | 你的域名（Nginx 会代理到后端） | `https://your.domain.com` |
| **本地开发** | 本地后端地址 | `http://localhost:3000` |

### 各客户端配置方式

#### 📱 iOS App（App Store 版 / PWA）
1. 打开 App → 进入登录页面
2. 在 **服务器地址** 输入框中填写 server 地址
3. 例如：`https://your-server-xxx.zeabur.app`

#### 🤖 Android App（Google Play 版）
1. 打开 App → 进入登录页面
2. 在 **服务器地址** 输入框中填写 server 地址
3. 例如：`https://your-server-xxx.zeabur.app`

#### 🌐 Web 端（浏览器）
1. 打开 Vercel 或 Nginx 部署的前端页面
2. 在登录页面的 **服务器地址** 输入框中填写 server 地址
3. 例如：`https://your-server-xxx.zeabur.app`

#### 🖥️ Windows 客户端
1. 下载并安装 [Windows 客户端](https://github.com/619dev/ppp-win/releases)
2. 打开应用 → 进入登录页面
3. 在 **服务器地址** 输入框中填写 server 地址
4. 例如：`https://your-server-xxx.zeabur.app`

#### 🍎 macOS 客户端
1. 下载并安装 [Mac 客户端](https://github.com/619dev/ppp-mac/releases)
2. 打开应用 → 进入登录页面
3. 在 **服务器地址** 输入框中填写 server 地址
4. 例如：`https://your-server-xxx.zeabur.app`

### Docker Compose + Nginx 部署时的特殊说明

当使用 Docker Compose + Nginx 部署时，前端和后端共用同一个域名（通过 Nginx 反向代理）。此时客户端中填写的服务器地址就是你的域名本身：

```
服务器地址：https://your.domain.com
```

Nginx 会根据请求路径自动将 API 请求（`/api/*`）和 WebSocket 连接（`/ws`）转发到后端 server 容器。

---

## 常见问题

### Q: 前端和后端可以部署在不同域名吗？
**A:** 可以。前端支持在登录页面手动输入后端服务器地址，前端与后端不需要同一域名。

### Q: Vercel 部署前端需要设置环境变量吗？
**A:** 不需要。前端的服务器地址由用户在登录页面手动输入，无需预设。

### Q: 为什么推荐删除 Zeabur/Docker 中的 client 服务？
**A:** 将前端部署到 Vercel 可以利用其全球 CDN 加速，用户访问速度更快。同时减轻服务器负担，让服务器专注于后端处理。

### Q: iOS PWA 用户需要 HTTPS 吗？
**A:** 是的。WebRTC 和 Web Crypto API 必须在 HTTPS（安全上下文）环境中运行。iOS PWA 的「添加到主屏幕」功能也需要 HTTPS。

### Q: 如何更新部署？
**A:**
- **Zeabur**：在 Dashboard 中重新部署 server 服务即可
- **Docker Compose**：执行 `docker compose pull && docker compose up -d`
- **Vercel 前端**：推送到 GitHub，Vercel 自动触发重新部署

升级后请至少验证一次中文用户名搜索，并刷新 Web/PWA 以激活新版 Service Worker。Web 端会按账户缓存联系人、群组、聊天记录、朋友圈、时间线和媒体；用户可在“个人资料 → 清理本地缓存”删除这些离线数据。若前后端使用不同域名，媒体服务器必须允许浏览器跨域获取媒体，才能写入离线缓存。
