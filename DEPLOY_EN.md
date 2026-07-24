# 📦 Deployment Guide

This document provides detailed instructions for two recommended deployment methods for PaperPhonePlus, along with client-side server address configuration for all platforms.

> **Key concept**: server, MySQL, Redis, and the LiveKit meeting SFU run on server infrastructure. The frontend may run on Vercel. Clients use the **server address** for application APIs and the server-provided `LIVEKIT_URL` for meetings.

---

## Table of Contents

- [Method 1: Zeabur Template + Vercel Frontend (Recommended)](#method-1-zeabur-template--vercel-frontend-recommended)
- [Method 2: Docker Compose + Nginx Local Deployment](#method-2-docker-compose--nginx-local-deployment)
- [Client Server Address Configuration](#client-server-address-configuration)

---

## Method 1: Zeabur Template + Vercel Frontend (Recommended)

This approach deploys server, MySQL, Redis, and LiveKit on Zeabur, with the frontend on Vercel. Zeabur currently does not expose UDP service ports, so LiveKit falls back to ICE/TCP 7881. Meetings work, but weak-network quality is not equivalent to a production UDP deployment.

### Step 1: Deploy Using the Zeabur Template

1. Click the one-click deploy button:

   [![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

2. Log in to your Zeabur account (GitHub login supported)
3. Select a deployment region (choose the region closest to your target users)
4. Fill in the prompted variables. Use at least 32 random bytes for `LIVEKIT_API_SECRET`; the template supplies the same credentials to server and LiveKit
5. Wait for all services to finish starting

### Step 2: Delete the client Service on Zeabur

Zeabur creates five services: `client`, `server`, `MySQL`, `Redis`, and `LiveKit`. Delete only the client service when moving the frontend to Vercel:

1. Go to the [Zeabur Dashboard](https://dash.zeabur.com)
2. Find the project you just deployed
3. Click on the **client** service
4. Go to Service Settings → scroll to the bottom and find **Delete Service**
5. Confirm the deletion

> ⚠️ Delete only `client`. Do **not** delete `server`, `MySQL`, `Redis`, or `LiveKit`.

### Zeabur meeting limitation and upgrade path

- The template exposes LiveKit WebSocket/API 7880 and ICE/TCP 7881. UDP 7882 remains configured internally but is not declared as a Zeabur port.
- TCP fallback is suitable for functional testing and ordinary networks. For production-quality 100-person meetings, use LiveKit Cloud or host LiveKit on a public VM that exposes UDP 7882.
- For external LiveKit, set `LIVEKIT_URL=wss://meeting.example.com` on the Zeabur server service and use identical `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` values on both services.
- When Zeabur adds UDP support, declare UDP 7882 on the LiveKit service and open it in the firewall. No client update is required.

### Step 3: Note the server Service Domain

1. In the Zeabur Dashboard, click on the **server** service
2. Go to the **Networking** tab
3. Note the server service's public domain, e.g., `https://your-server-xxx.zeabur.app`
4. You can bind a custom domain here if needed

### Step 4: Deploy the Frontend on Vercel

1. **Fork this repository** to your GitHub account

2. Log in to [Vercel](https://vercel.com) and click **Add New Project**

3. Import your forked repository from GitHub

4. Configure the project settings:

   | Setting | Value |
   |---------|-------|
   | **Root Directory** | `client/` |
   | **Framework Preset** | Vite |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist/` |

5. **No environment variables are needed** — users enter the backend server address on the frontend login page

6. Click **Deploy** to start the deployment

7. After deployment, Vercel will assign a domain (e.g., `your-app.vercel.app`). You can also bind a custom domain

### Step 5: Verify the Deployment

1. Open the Vercel-deployed frontend page
2. On the login page, enter the **server** service domain from Zeabur in the server address field (e.g., `https://your-server-xxx.zeabur.app`)
3. Register an account and log in
4. Test messaging, file upload, and other features

---

## Method 2: Docker Compose + Nginx Local Deployment

This approach is suitable for users with their own servers. All services (except the frontend) are deployed via Docker Compose, with Nginx serving as a reverse proxy providing HTTPS access.

### Step 1: Prepare the Server Environment

**System Requirements**:
- Linux server (Ubuntu 22.04+ / Debian 12+ recommended)
- Docker and Docker Compose installed
- A domain name (DNS already pointing to your server IP)
- At least 2GB of RAM recommended

**Install Docker** (if not already installed):
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Start Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group (no sudo needed)
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect
```

### Step 2: Clone the Project and Configure

```bash
# Clone the repository
git clone <repo-url> && cd paperphone-plus

# Copy and edit environment variables
cp server/.env.example server/.env
```

Edit the `server/.env` file and configure the necessary environment variables:

```bash
# Required configuration — must change
JWT_SECRET=your_random_secret_string          # Must change for production
DB_PASS=your_database_password                # Keep consistent with docker-compose.yml
ADMIN_PASSWORD=your_admin_panel_password      # Must change for production
LIVEKIT_URL=wss://meeting.example.com
LIVEKIT_API_KEY=your_meeting_api_key
LIVEKIT_API_SECRET=at_least_32_random_bytes

# Optional configuration (fill in as needed)
R2_ACCOUNT_ID=...                             # Cloudflare R2 file storage
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
CF_CALLS_APP_ID=...                           # Cloudflare TURN (video calls)
CF_CALLS_APP_SECRET=...
VAPID_PUBLIC_KEY=...                          # Web Push notifications
VAPID_PRIVATE_KEY=...
```

### Step 3: Modify docker-compose.yml — Remove the client Section

Since the frontend will be served directly through Nginx (or deployed to Vercel), you need to remove the `client` service from `docker-compose.yml`.

Edit `docker-compose.yml` and **delete the following block**:

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

After deletion, keep the `server`, `mysql`, `redis`, and `livekit` services. Removing LiveKit makes the group-meeting token endpoint report that the SFU is not configured.

### Step 4: Start Docker Services

```bash
# Start all services (backend + MySQL + Redis)
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f server
```

Confirm all services show `running` and `healthy` status. The server automatically creates database tables on first startup, so no manual SQL import is needed. During an upgrade, it also inspects `users.username` and `users.nickname` and migrates incompatible character sets to `utf8mb4` when required, enabling Chinese username and nickname search. A MySQL backup is still recommended before a production upgrade.

### Step 5: Build Frontend Static Files

> [!NOTE]
> Native clients for iOS, Android, Windows, and Mac are already available. There is no need to deploy the web frontend on the server, so this step can be skipped.

There are two ways to obtain the frontend static files:

**Option A: Build Locally (Recommended)**

```bash
cd client
npm install
npm run build
# Build output will be in client/dist/
```

**Option B: Extract from Docker Image**

```bash
# Create a temporary container and copy files
docker create --name temp-client facilisvelox/paperphone-plus-client:latest
docker cp temp-client:/usr/share/nginx/html ./client/dist
docker rm temp-client
```

### Step 6: Install and Configure Nginx

**Install Nginx**:

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y nginx

# CentOS / RHEL
sudo yum install -y nginx

# Start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

**Install SSL Certificate** (using Let's Encrypt free certificate):

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Request certificate (replace your.domain.com with your domain)
sudo certbot --nginx -d your.domain.com

# The certificate will be automatically configured in Nginx with auto-renewal
```

**Configure Nginx**:

Prefer the repository's production two-domain configuration, which proxies both the application server and LiveKit:

```bash
sudo mkdir -p /var/www/certbot
sudo cp deploy/nginx/paperphone-plus.conf /etc/nginx/sites-available/paperphone-plus
sudo nano /etc/nginx/sites-available/paperphone-plus
```

Replace `api.example.com`, `meeting.example.com`, and the certificate paths. Obtain certificates for both domains, then enable the site:

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d api.example.com -d meeting.example.com
sudo ln -s /etc/nginx/sites-available/paperphone-plus /etc/nginx/sites-enabled/paperphone-plus
sudo nginx -t
sudo systemctl reload nginx
```

Set `LIVEKIT_URL=wss://meeting.example.com` on the backend. Nginx handles API, IM WebSocket, and LiveKit WebSocket traffic on 443. You must also expose `7881/tcp` and `7882/udp` directly through the host firewall and cloud security group:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 7882/udp
```

The single-domain example below is retained only for legacy deployments without group meetings. Use the repository configuration above when meetings are enabled.

Create an Nginx site configuration file:

```bash
sudo nano /etc/nginx/sites-available/paperphoneplus
```

Enter the following content (replace `your.domain.com` with your domain):

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

    # SSL security optimizations
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # File upload size limit (to support 500MB uploads)
    client_max_body_size 512M;

    # Frontend static files
    location / {
        root /path/to/paperphone-plus/client/dist;
        try_files $uri /index.html;

        # Cache optimization
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # API reverse proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket signaling (real-time communication)
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

    # Admin panel (optional, path should match ADMIN_PATH env var)
    location /admin {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000;
    }
}
```

**Enable the site and restart Nginx**:

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/paperphoneplus /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Verify the Deployment

1. Visit `https://your.domain.com` in a browser — you should see the frontend login page
2. Register an account and test all features
3. Verify that WebSocket connections work correctly (chat messages delivered in real-time)
4. Test file upload functionality

### Troubleshooting

```bash
# Check Docker container status
docker compose ps

# View backend logs
docker compose logs -f server

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check port usage
sudo ss -tlnp | grep -E '80|443|3000|3306|6379'

# Restart all services
docker compose restart
sudo systemctl restart nginx
```

---

## Client Server Address Configuration

All clients (iOS, Android, Web, Windows, macOS) should enter the address of the **backend server service**, not the frontend address.

> ⚠️ **Important**: The server address entered in clients is the **backend server's address**, not the frontend web page's address.

### Server Address by Deployment Method

| Deployment Method | Server Address | Example |
|-------------------|---------------|---------|
| **Zeabur** | Domain of the server service on Zeabur | `https://your-server-xxx.zeabur.app` |
| **Docker Compose + Nginx** | Your domain (Nginx proxies to backend) | `https://your.domain.com` |
| **Local Development** | Local backend address | `http://localhost:3000` |

### Configuration for Each Client

#### 📱 iOS App (App Store / PWA)
1. Open the App → go to the login page
2. Enter the server address in the **Server Address** field
3. Example: `https://your-server-xxx.zeabur.app`

#### 🤖 Android App (Google Play)
1. Open the App → go to the login page
2. Enter the server address in the **Server Address** field
3. Example: `https://your-server-xxx.zeabur.app`

#### 🌐 Web (Browser)
1. Open the frontend page deployed on Vercel or Nginx
2. Enter the server address in the **Server Address** field on the login page
3. Example: `https://your-server-xxx.zeabur.app`

#### 🖥️ Windows Client
1. Download and install the [Windows Client](https://github.com/619dev/ppp-win/releases)
2. Open the app → go to the login page
3. Enter the server address in the **Server Address** field
4. Example: `https://your-server-xxx.zeabur.app`

#### 🍎 macOS Client
1. Download and install the [Mac Client](https://github.com/619dev/ppp-mac/releases)
2. Open the app → go to the login page
3. Enter the server address in the **Server Address** field
4. Example: `https://your-server-xxx.zeabur.app`

### Special Note for Docker Compose + Nginx Deployment

When using Docker Compose + Nginx deployment, the frontend and backend share the same domain (via Nginx reverse proxy). In this case, the server address to enter in clients is simply your domain:

```
Server Address: https://your.domain.com
```

Nginx automatically routes API requests (`/api/*`) and WebSocket connections (`/ws`) to the backend server container based on the request path.

---

## FAQ

### Q: Can the frontend and backend be deployed on different domains?
**A:** Yes. The frontend supports manually entering the backend server address on the login page, so the frontend and backend do not need to share the same domain.

### Q: Does the Vercel-deployed frontend need environment variables?
**A:** No. The server address is entered by users on the login page — no pre-configuration is needed.

### Q: Why is it recommended to remove the client service from Zeabur/Docker?
**A:** Deploying the frontend to Vercel leverages its global CDN for faster user access worldwide. It also reduces server load, allowing the server to focus on backend processing.

### Q: Does iOS PWA require HTTPS?
**A:** Yes. WebRTC and Web Crypto APIs must run in an HTTPS (secure context) environment. The iOS PWA "Add to Home Screen" feature also requires HTTPS.

### Q: How do I update the deployment?
**A:**
- **Zeabur**: Redeploy the server service in the Dashboard
- **Docker Compose**: Run `docker compose pull && docker compose up -d`
- **Vercel Frontend**: Push to GitHub and Vercel will automatically trigger redeployment

After upgrading, test Chinese username search at least once and refresh the Web/PWA client so the new Service Worker becomes active. The Web client keeps account-isolated offline copies of contacts, groups, chats, Moments, Timeline posts, and media; users can remove them under **Profile → Clear Local Cache**. If the frontend and backend use different domains, the media server must permit browser cross-origin media fetches before those responses can be stored offline.
