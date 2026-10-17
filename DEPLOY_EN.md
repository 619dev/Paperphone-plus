# Deployment Guide

A self-hosted PaperPhonePlus deployment contains only `server`, MySQL, Redis, and LiveKit. **Do not deploy a Web frontend and do not build or pull a `paperphone-plus-client` image.** The repository's `/client` directory is frontend source shared by the Android, iOS, Windows, and macOS clients; it is not a standalone deployment target.

Users enter the public **server backend URL** in a native client. The server-provided `LIVEKIT_URL` is used for all direct and group audio/video calls.

Uploads live on the server's persistent volume. Avatars and social/timeline media are permanent; private and group chat attachments default to 14 days via `CHAT_FILE_RETENTION_DAYS`. Existing R2 deployments can still trigger the read-only automatic migration by manually passing `R2_*` variables to the server during an upgrade. Docker Compose no longer preset them; remove them after migration.

## Signed messaging upgrade (current source)

Package versions are 2.6.0. Back up MySQL and upload volumes, stop writes from old servers, then start the updated server to apply `server/src/db/schema.sql`. Coordinate upgrades of every client: older clients cannot parse signed envelopes or send new group messages. Startup checks critical migrations; inspect database permissions/logs if those checks fail.

Migration adds identity-verification messages, membership epochs, signed-group protocol state and a message commit barrier. Existing groups are migrated once to mandatory encryption and a new epoch. History is retained; already-lost keys cannot be recovered. See `client/tests/README.md` for isolated MySQL integration checks, including repeatable migration.

Contacts configure the same appearance password agreed only offline, then complete mutual verification in the contact profile. Group senders must privately verify every member first. Changed identity keys require an explicit offline recheck. Profile badges require both proofs and receipts; group badges indicate valid signatures, while missing keys leave content locked. The legacy `kem_pub` field holds an Ed25519 signing key; signed messaging uses X25519 and does not implement post-quantum identity registration. Uploaded file bytes retain their existing storage protection.

Optional Bark: set `BARK_ALLOWED_HOSTS=api.day.app`, adding self-hosted domains as a comma-separated allowlist. Authenticated clients manage subscriptions through GET/POST/DELETE `/api/push/bark` (POST `{ "endpoint": "https://api.day.app/<device-key>", "platform": "ios" }`) and test saved settings with POST `/api/push/bark/test` and `{}`. GET returns only a redacted endpoint hint. Existing FCM/APNs/ntfy configuration is preserved.

## Docker Compose + Nginx Deployment

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

Keep database, Redis, and LiveKit credentials consistent with `docker-compose.yml`. FCM, ntfy, and APNS settings are optional.

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

- Docker: the only PaperPhonePlus application image currently published is `facilisvelox/paperphone-plus-server`.
- `/client` code is released through native client builds; do not deploy it to Vercel, Nginx, or a standalone Docker container.
- If a legacy environment still has a `paperphone-plus-client` container, it can be stopped and removed; it is no longer part of the deployment topology.
