# 📦 部署指南

PaperPhonePlus 的自托管部署只包含 `server`、MySQL、Redis 和 LiveKit。**不部署 Web 前端，也不需要构建或拉取 `paperphone-plus-client` 镜像。** 仓库中的 `/client` 目录仅用于 Android、iOS、Windows 和 macOS 客户端共享前端代码，不是独立部署入口。

客户端登录时填写公开的 **server 后端地址**。`LIVEKIT_URL` 由 server 下发，用于 1:1 和群组音视频通话。

上传文件保存在 server 的持久卷中。头像、群头像、朋友圈及时间线媒体永久保存；私聊和群聊附件由 `CHAT_FILE_RETENTION_DAYS` 控制，默认 14 天。升级自 R2 的实例第一次启动会只读复制全部对象到本地，成功后的下一次启动会提示可以删除 `R2_*` 变量；迁移程序不会删除 R2 原件。

## 方式一：Zeabur 模板

1. 使用 [Zeabur 模板](https://zeabur.com/templates/SK6T93?referralCode=619dev)部署。
2. 选择区域并填写环境变量。生产环境必须修改 `JWT_SECRET`、`ADMIN_PASSWORD` 和至少 32 字节的 `LIVEKIT_API_SECRET`。
3. 等待 `server`、`MySQL`、`Redis`、`LiveKit` 四个服务启动。模板不会创建 `client` 服务。
4. 在 `server` 服务的 **Networking** 页面记录公网 HTTPS 域名。
5. 在官方 Android、iOS、Windows 或 macOS 客户端的登录页填写该 server 域名。

Zeabur 当前不公开 UDP 服务端口，LiveKit 会通过 ICE/TCP 7881 回退。生产通话建议使用 LiveKit Cloud，或把 LiveKit 部署到可开放 `7881/tcp` 和 `7882/udp` 的主机，然后在 server 中设置对应的 `LIVEKIT_URL`、`LIVEKIT_API_KEY` 和 `LIVEKIT_API_SECRET`。

## 方式二：Docker Compose + Nginx

需要 Linux 服务器、Docker、Docker Compose、至少 2 GB 内存，以及两个已解析到服务器的域名（例如 `api.example.com` 和 `meeting.example.com`）。

```bash
git clone <repo-url>
cd paperphone-plus
cp server/.env.example server/.env
```

编辑 `server/.env`，至少设置：

```dotenv
JWT_SECRET=请替换为长随机字符串
DB_PASS=请替换为数据库密码
REDIS_PASS=请替换为Redis密码
ADMIN_PASSWORD=请替换为管理后台密码
LIVEKIT_URL=wss://meeting.example.com
LIVEKIT_API_KEY=请替换为通话API密钥
LIVEKIT_API_SECRET=请替换为至少32字节的随机密钥
```

确保数据库、Redis 和 LiveKit 的密码/密钥与 `docker-compose.yml` 使用的值一致。R2、FCM、ntfy、APNS 等配置均为按需启用。

### 启动后端服务

Compose 文件已经不含 Web 前端服务，无需手动删除任何段落。

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f server
```

应看到 `server`、`mysql`、`redis`、`livekit` 四个服务。server 首次启动会创建数据库表；升级时会自动迁移并验证可靠消息、设备会话和字符集字段。生产升级前先备份 MySQL，并先升级 server、确认健康后再更新客户端。

### 配置 HTTPS 反向代理

仓库提供的 [Nginx 配置](deploy/nginx/paperphone-plus.conf)只代理后端 API、管理后台、IM WebSocket 和 LiveKit WebSocket，不提供前端静态文件。

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/paperphone-plus.conf /etc/nginx/sites-available/paperphone-plus
sudo nano /etc/nginx/sites-available/paperphone-plus
sudo certbot certonly --webroot -w /var/www/certbot -d api.example.com -d meeting.example.com
sudo ln -s /etc/nginx/sites-available/paperphone-plus /etc/nginx/sites-enabled/paperphone-plus
sudo nginx -t
sudo systemctl reload nginx
```

将配置中的域名和证书路径替换为实际值。同时在主机防火墙和云安全组开放 `80/tcp`、`443/tcp`、`7881/tcp`、`7882/udp`。不要公开 MySQL 3306 或 Redis 6379。

### 验证

```bash
curl -fsS https://api.example.com/health
docker compose ps
docker compose logs --tail=100 server
```

然后在官方原生客户端中填写 `https://api.example.com`，测试注册、登录、消息、上传和通话。浏览器访问 API 域名不会出现登录网页，这是正常现象。

## 客户端服务器地址

| 部署方式 | 客户端填写的地址 |
|---|---|
| Zeabur | `server` 服务的公网 HTTPS 域名 |
| Docker Compose + Nginx | API 域名，例如 `https://api.example.com` |
| 本地开发 | `http://localhost:3000` |

支持的用户入口是 Android、iOS、Windows 和 macOS 客户端。不要把 LiveKit 域名、数据库地址、容器名或 `/client` 目录地址填入服务器地址框。

## 更新与故障排查

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f server
```

- Zeabur：只重新部署 server，并确认健康检查通过；MySQL、Redis、LiveKit 按需更新。
- Docker：当前只发布 `facilisvelox/paperphone-plus-server` 应用镜像。
- `/client` 的代码随原生客户端版本发布，不部署到 Vercel、Nginx、Zeabur 或独立 Docker 容器。
- 若旧环境还存在 `paperphone-plus-client` 容器或 Zeabur `client` 服务，可停止并删除；它不再属于当前部署拓扑。
