# Deployment Guide

A self-hosted PaperPhonePlus deployment contains only `server`, MySQL, Redis, and LiveKit. **Do not deploy a Web frontend and do not build or pull a `paperphone-plus-client` image.** The repository's `/client` directory is frontend source shared by the Android, iOS, Windows, and macOS clients; it is not a standalone deployment target.

Users enter the public **server backend URL** in a native client. The server-provided `LIVEKIT_URL` is used for all direct and group audio/video calls.

Uploads live on the server's persistent volume. Avatars and social/timeline media are permanent; private and group chat attachments default to 14 days via `CHAT_FILE_RETENTION_DAYS`. On the first upgrade startup, legacy R2 objects are copied read-only to local storage. A later startup logs when `R2_*` variables can be removed; remote objects are never deleted.

## Method 1: Zeabur Template

1. Deploy the [Zeabur template](https://zeabur.com/templates/SK6T93?referralCode=619dev).
2. Select a region and fill in the variables. In production, replace `JWT_SECRET`, `ADMIN_PASSWORD`, and `LIVEKIT_API_SECRET` (at least 32 bytes).
3. Wait for the four services—`server`, `MySQL`, `Redis`, and `LiveKit`—to start. The template does not create a `client` service.
4. Record the public HTTPS domain under the `server` service's **Networking** tab.
5. Enter that server domain on the login screen of an official Android, iOS, Windows, or macOS client.

Zeabur currently does not expose UDP service ports, so LiveKit falls back to ICE/TCP 7881. For production calling, use LiveKit Cloud or host LiveKit where `7881/tcp` and `7882/udp` can be opened, then configure the matching `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` on server.

## Method 2: Docker Compose + Nginx

You need a Linux host, Docker, Docker Compose, at least 2 GB RAM, and two domains pointed at the host (for example, `api.example.com` and `meeting.example.com`).

```bash
git clone <repo-url>
cd paperphone-plus
cp server/.env.example server/.env
```

Set at least these values in `server/.env`:

```dotenv
JWT_SECRET=replace_with_a_long_random_value
DB_PASS=replace_with_the_database_password
REDIS_PASS=replace_with_the_redis_password
ADMIN_PASSWORD=replace_with_the_admin_password
LIVEKIT_URL=wss://meeting.example.com
LIVEKIT_API_KEY=replace_with_the_call_api_key
LIVEKIT_API_SECRET=replace_with_at_least_32_random_bytes
```

Keep database, Redis, and LiveKit credentials consistent with `docker-compose.yml`. R2, FCM, ntfy, and APNS settings are optional.

### Start backend services

The Compose file already excludes the Web frontend; no manual YAML deletion is required.

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f server
```

You should see `server`, `mysql`, `redis`, and `livekit`. Server creates tables on first start and automatically migrates and verifies reliability, device-session, and character-set fields during upgrades. Back up MySQL before production upgrades; upgrade server first and update clients only after server is healthy.

### Configure the HTTPS reverse proxy

The supplied [Nginx configuration](deploy/nginx/paperphone-plus.conf) proxies only the backend API, admin endpoint, IM WebSocket, and LiveKit WebSocket. It does not serve frontend static files.

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/paperphone-plus.conf /etc/nginx/sites-available/paperphone-plus
sudo nano /etc/nginx/sites-available/paperphone-plus
sudo certbot certonly --webroot -w /var/www/certbot -d api.example.com -d meeting.example.com
sudo ln -s /etc/nginx/sites-available/paperphone-plus /etc/nginx/sites-enabled/paperphone-plus
sudo nginx -t
sudo systemctl reload nginx
```

Replace the example domains and certificate paths. Open `80/tcp`, `443/tcp`, `7881/tcp`, and `7882/udp` in both host and cloud firewalls. Do not expose MySQL 3306 or Redis 6379 publicly.

### Verify

```bash
curl -fsS https://api.example.com/health
docker compose ps
docker compose logs --tail=100 server
```

Then enter `https://api.example.com` in an official native client and test registration, login, messages, uploads, and calls. It is normal for the API domain not to show a browser login page.

## Client Server Address

| Deployment | Address entered in the client |
|---|---|
| Zeabur | Public HTTPS domain of the `server` service |
| Docker Compose + Nginx | API domain, such as `https://api.example.com` |
| Local development | `http://localhost:3000` |

Supported user entry points are the Android, iOS, Windows, and macOS clients. Do not enter the LiveKit domain, a database address, a container name, or a `/client` directory location in the server-address field.

## Updates and Troubleshooting

```bash
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f server
```

- Zeabur: redeploy server and wait for its health check; update MySQL, Redis, or LiveKit only when needed.
- Docker: the only PaperPhonePlus application image currently published is `facilisvelox/paperphone-plus-server`.
- `/client` code is released through native client builds; do not deploy it to Vercel, Nginx, Zeabur, or a standalone Docker container.
- If a legacy environment still has a `paperphone-plus-client` container or Zeabur `client` service, it can be stopped and removed; it is no longer part of the deployment topology.
