# 📦 部署指南

PaperPhonePlus 的自托管部署只包含 `server`、MySQL、Redis 和 LiveKit。**不部署 Web 前端，也不需要构建或拉取 `paperphone-plus-client` 镜像。** 仓库中的 `/client` 目录仅用于 Android、iOS、Windows 和 macOS 客户端共享前端代码，不是独立部署入口。

客户端登录时填写公开的 **server 后端地址**。`LIVEKIT_URL` 由 server 下发，用于 1:1 和群组音视频通话。

上传文件保存在 server 的持久卷中。头像、群头像、朋友圈及时间线媒体永久保存；私聊和群聊附件由 `CHAT_FILE_RETENTION_DAYS` 控制，默认 14 天。旧 R2 实例仍可在升级时手动向 server 传入 `R2_*` 环境变量，以触发只读自动迁移；Docker Compose不再预置这些变量，迁移完成后应删除。

## 签名与身份验证升级（当前源码）

此次同步 Lite 安全协议，包版本为 2.6.0。升级前备份 MySQL 与上传卷；停止旧服务端写入，再启动新版服务端执行 `server/src/db/schema.sql` 自动迁移，并协调升级全部客户端。启动会检查关键迁移，失败时须检查数据库权限与日志。旧客户端不能解析新签名信封，无法发送新群消息。

迁移新增身份验证消息类型、群成员代次、签名协议状态及消息提交顺序屏障；现有群一次性开启加密并推进代次，不能再关闭。已有历史保留；已丢失的旧密钥无法恢复。可先在隔离 MySQL 上运行 `client/tests/README.md` 中的集成测试，验证重复迁移和历史兼容性。

用户在“消息隐私”设置相同的、仅在线下约定的文本外观密码，然后在联系人资料页完成双向验证。群消息发送前需私聊验证每名成员；身份密钥变化须线下重新核对并手动发起验证。绿色身份标记表示双向证明与回执通过，群消息绿色标记表示签名通过；缺少解密密钥时正文仍锁定。`kem_pub` 是历史命名，当前实际承载 Ed25519 签名公钥；签名消息使用 X25519，不能宣称已实现后量子身份注册。附件文件本身仍按原有存储方式处理。

可选 Bark：`BARK_ALLOWED_HOSTS=api.day.app`，自建服务用逗号分隔添加允许的域名。已登录客户端可用 `/api/push/bark` GET/POST/DELETE 管理订阅（POST 为 `{ "endpoint": "https://api.day.app/<device-key>", "platform": "ios" }`），用 `/api/push/bark/test` POST `{}` 测试已保存配置。查询仅返回脱敏地址，不改变现有 FCM/APNs/ntfy 配置。

## Docker Compose + Nginx 部署

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

确保数据库、Redis 和 LiveKit 的密码/密钥与 `docker-compose.yml` 使用的值一致。FCM、ntfy、APNS 等配置均为按需启用。

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

- Docker：当前只发布 `facilisvelox/paperphone-plus-server` 应用镜像。
- `/client` 的代码随原生客户端版本发布，不部署到 Vercel、Nginx 或独立 Docker 容器。
- 若旧环境还存在 `paperphone-plus-client` 容器，可停止并删除；它不再属于当前部署拓扑。
