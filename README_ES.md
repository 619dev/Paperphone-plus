🌐 **Otros idiomas:** [中文](README.md) · [English](README_EN.md) · [日本語](README_JA.md) · [한국어](README_KO.md) · [Français](README_FR.md) · [Deutsch](README_DE.md) · [Русский](README_RU.md)

Una aplicación de mensajería instantánea cifrada de extremo a extremo, estilo WeChat, con cifrado ECDH + XSalsa20-Poly1305 sin estado por mensaje, videollamadas en tiempo real, almacenamiento de archivos Cloudflare R2, soporte multilingüe y despliegue PWA para iOS.

[![Rust](https://img.shields.io/badge/Rust-1.83+-orange)](#) [![React](https://img.shields.io/badge/React-19-blue)](#) [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](#) [![MySQL](https://img.shields.io/badge/MySQL-8.0-blue)](#) [![Redis](https://img.shields.io/badge/Redis-7.x-red)](#) [![WebRTC](https://img.shields.io/badge/WebRTC-P2P%20%2B%20Mesh-orange)](#) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

[![Google Play](https://img.shields.io/badge/Google%20Play-Descargar-green?logo=google-play)](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus)
[![App Store](https://img.shields.io/badge/App%20Store-Descargar-blue?logo=apple)](https://apps.apple.com/us/app/paperphoneplus/id6769265178)
[![Windows](https://img.shields.io/badge/Windows-Cliente-blue?logo=windows)](https://github.com/619dev/ppp-win/releases)
[![Mac](https://img.shields.io/badge/Mac-Cliente-black?logo=apple)](https://github.com/619dev/ppp-mac/releases)

---

<details>
<summary>📸 Capturas de pantalla (haga clic para expandir)</summary>


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

## Características
| Característica | Descripción |
|----------------|-------------|
| 🔐 Cifrado de extremo a extremo | ECDH sin estado + XSalsa20-Poly1305 — claves efímeras por mensaje, forward secrecy, verificación de número de seguridad estilo Signal |
| 🗝️ Servidor de conocimiento cero | El servidor solo almacena texto cifrado; las claves privadas nunca abandonan el dispositivo |
| 📹 Videollamadas y llamadas de voz | WebRTC P2P (1:1) + Mesh (grupo), Cloudflare TURN para traversal de NAT |
| 🎙️ Modificador de voz | Efectos de voz en tiempo real para mensajes de voz, llamadas 1:1 y llamadas grupales — 3 modos (0.8x grave / 1.0x normal / 1.2x agudo), basado en Web Audio API |
| 👥 Chat grupal | Hasta 2000 miembros, mensajes en texto plano (sin cifrado), modo No Molestar, gestión de miembros |
| 👫 Sistema de amigos | Las solicitudes de amistad requieren aprobación con hasta 512 caracteres de mensaje; apodos personalizados; agrupación por etiquetas |
| ⏱️ Eliminación automática de mensajes | 5 niveles (nunca / 1 día / 3 días / 1 semana / 1 mes), configurable por ambas partes en DMs, solo por el propietario en grupos |
| 🔔 Notificaciones push | Web Push (VAPID) + FCM + OneSignal + ntfy + APNS cinco canales — alcanza usuarios incluso sin conexión (iOS nativo + Android chino sin Google Services) |
| 🌐 Multilingüe | Chino, inglés, japonés, coreano, francés, alemán, ruso, español — detección automática + cambio manual |
| 📱 iOS — Sin certificado empresarial | PWA vía Safari «Agregar a pantalla de inicio», funciona permanentemente sin firma de Apple |
| 📱 App nativa Android | Disponible en [Google Play](https://play.google.com/store/apps/details?id=com.fm619.paperphoneplus), con soporte de notificaciones push FCM |
| 📱 App nativa iOS | Disponible en [App Store](https://apps.apple.com/us/app/paperphoneplus/id6769265178), con soporte de notificaciones push APNS |
| 🖥️ Cliente de escritorio Windows | Aplicación de escritorio Windows nativa, [descargar aquí](https://github.com/619dev/ppp-win/releases) |
| 🍎 Cliente de escritorio Mac | Aplicación de escritorio Mac nativa, [descargar aquí](https://github.com/619dev/ppp-mac/releases) |
| 💬 Mensajería enriquecida | Texto, imágenes, video, archivos de documentos, mensajes de voz, 200+ emojis, paquetes de stickers de Telegram, confirmaciones de lectura, indicadores de escritura |
| 📤 Subida de archivos | Hasta 500 MB por archivo, Cloudflare R2 o almacenamiento local, con animación de progreso |
| 🌐 Momentos | Feed social estilo WeChat: texto + hasta 9 fotos o 1 video (≤ 10 min), likes, comentarios, visibilidad por etiquetas |
| 👤 Perfil de usuario | Página de perfil de contacto con controles de privacidad bidireccionales de Momentos |
| 📰 Línea de tiempo | Feed público estilo Xiaohongshu — diseño masonry de dos columnas, publicaciones anónimas, likes y comentarios |
| 🏷️ Etiquetas de amigos | Asignar múltiples etiquetas a amigos (paleta de 12 colores), filtrar contactos por etiqueta |
| 🗂️ Almacenamiento de objetos R2 | Cloudflare R2 para archivos de imagen/voz — URL CDN pública opcional |
| 🔑 Autenticación de dos factores (2FA) | TOTP compatible con Google Authenticator, 8 códigos de recuperación, obligatorio al iniciar sesión |
| 📷 Escanear y compartir código QR | Escanear códigos QR para agregar amigos o unirse a grupos con expiración configurable |
| 🏗️ Auto-hospedable | Docker Compose, Zeabur con un clic, o frontend en Vercel |
| 🌐 Configuración de proxy | Soporte de proxy SOCKS5 / HTTP / HTTPS — configurable en páginas de inicio de sesión y ajustes con dirección del servidor, puerto, usuario y contraseña para entornos de red restringidos |
| 🛡️ Moderación de contenido | Reportes de usuarios (6 categorías) + bloqueo de usuarios (oculta instantáneamente publicaciones/mensajes) + Términos de uso (EULA) |
| 🔧 Panel de administración | Dashboard de administración web integrado (`/admin`, ruta configurable), protegido por contraseña, revisar reportes, eliminar contenido infractor, banear usuarios — 8 idiomas |

---

## Stack tecnológico
```
Backend (server/)
  Rust (Axum 0.8) — Framework web asíncrono de alto rendimiento
  sqlx + MySQL 8.0 — Persistencia de usuarios/mensajes
  deadpool-redis + Redis 7 — Presencia en línea + enrutamiento entre nodos
  aws-sdk-s3 — Almacenamiento de archivos Cloudflare R2 (API compatible con S3)
  Autenticación argon2 + jsonwebtoken

Frontend (client/)
  React 19 + TypeScript + Vite 6
  Gestión de estado Zustand
  libsodium-wrappers-sumo (WebAssembly — Curve25519 / XSalsa20-Poly1305)
  WebRTC API — videollamadas / llamadas de voz
  Web Audio API — modificador de voz en tiempo real (cadena de audio ScriptProcessorNode)
  PWA: manifest.json + Service Worker

Capa criptográfica
  ECDH sin estado + XSalsa20-Poly1305 — par de claves efímero por mensaje
  Persistencia de claves en cuatro niveles: memoria → localStorage → sessionStorage → IndexedDB
  Todas las claves privadas almacenadas solo en el dispositivo — nunca enviadas al servidor
```

---

### Opción 0: Despliegue en la nube con Zeabur en un clic
[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/SK6T93?referralCode=619dev)

> [!TIP]
> **Avanzado: Despliegue híbrido Zeabur + Vercel**
> Después de desplegar en Zeabur, puede eliminar manualmente el servicio **client** y desplegar el frontend en Vercel en su lugar (ver Opción 2 a continuación).
> De esta forma, server/MySQL/Redis se alojan en Zeabur mientras el frontend se acelera mediante el CDN global de Vercel.
> El frontend no requiere **variables de entorno en Vercel** — los usuarios simplemente ingresan la dirección del servidor backend en la página de inicio de sesión.

### Opción 1: Docker Compose (Recomendado)
```bash
git clone <repo-url> && cd paperphone-plus
cp server/.env.example server/.env
# Editar: DB_PASS / JWT_SECRET / CF_CALLS_APP_ID etc.
docker compose up -d
open http://localhost
```

### Opción 2: Frontend en Vercel
```bash
# 1. Hacer fork de este repositorio
# 2. Importar en Vercel: Root Directory = client/, Build = npm run build, Output = dist/
#    No se necesitan variables de entorno
# 3. Desplegar el backend vía Docker o Zeabur
# 4. Abrir el frontend desplegado en Vercel, ingresar la dirección del servidor backend en la página de inicio de sesión
#    ej. https://your-server.zeabur.app
```

### Opción 3: Desarrollo local
```bash
# Backend (Rust)
cd server && cp .env.example .env && cargo run --release

# Frontend (React)
cd client && npm install && npm run dev
```

---

## Modificador de voz

Los mensajes de voz, las llamadas 1:1 y las llamadas grupales admiten modificación de voz en tiempo real con 3 modos seleccionables:

| Modo | Velocidad | Efecto |
|------|-----------|--------|
| 🐢 Lento | 0.8x | Voz más profunda y grave — ideal para anonimato |
| 🔊 Normal | 1.0x | Voz original, sin procesamiento |
| 🐇 Rápido | 1.2x | Voz más aguda — divertida y juguetona |

**Cómo funciona**: Utiliza la Web Audio API para construir una cadena de procesamiento de audio (AudioContext → MediaStreamSource → ScriptProcessorNode → MediaStreamDestination) que ajusta el tono/velocidad de la entrada del micrófono en tiempo real.

- **Mensajes de voz**: Seleccionar el modo de voz durante la grabación. El archivo `.webm` exportado ya contiene el efecto de voz — los destinatarios no pueden restaurar la voz original, permitiendo mensajería verdaderamente anónima
- **Llamadas 1:1 / Grupales**: Tocar el botón de modificador de voz durante una llamada para alternar entre modos. La pista de audio procesada reemplaza la original mediante `RTCRtpSender.replaceTrack()`

> No se requiere configuración del lado del servidor. El modificador de voz funciona completamente en el lado del cliente.

---

## Variables de entorno
| Variable | Descripción | Predeterminado |
|----------|-------------|----------------|
| `PORT` | Puerto del servidor | `3000` |
| `JWT_SECRET` | Clave de firma JWT (**cambiar en producción**) | dev_secret |
| `DB_HOST` / `DB_PASS` / `DB_NAME` | Conexión MySQL | — |
| `REDIS_HOST` / `REDIS_PASS` | Conexión Redis | — |
| `R2_ACCOUNT_ID` | ID de cuenta de Cloudflare | — |
| `R2_ACCESS_KEY_ID` | Access Key del token API de R2 | — |
| `R2_SECRET_ACCESS_KEY` | Secret Key del token API de R2 | — |
| `R2_BUCKET` | Nombre del bucket R2 | — |
| `R2_PUBLIC_URL` | URL base pública de R2 (opcional) | — |
| `CF_CALLS_APP_ID` | Cloudflare Calls App ID (opcional) | — |
| `CF_CALLS_APP_SECRET` | Cloudflare Calls App Secret (opcional) | — |
| `METERED_TURN_API_KEY` | Metered.ca TURN API Key (opcional, alternativa gratuita) | — |
| `VAPID_PUBLIC_KEY` | Clave pública VAPID de Web Push (opcional) | — |
| `VAPID_PRIVATE_KEY` | Clave privada VAPID de Web Push (opcional) | — |
| `VAPID_SUBJECT` | Email de contacto VAPID (opcional) | `mailto:admin@paperphone.app` |
| `FCM_PROJECT_ID` | ID del proyecto Firebase (opcional, Capacitor Android) | — |
| `FCM_CLIENT_EMAIL` | Email de la cuenta de servicio Firebase (opcional) | — |
| `FCM_PRIVATE_KEY` | Clave privada de la cuenta de servicio Firebase (opcional, soporta tanto escape `\n` como saltos de línea reales; ver abajo) | — |
| `FCM_RELAY_SECRET` | Secreto del relay push FCM (opcional, configurar en el host relay para habilitar endpoint) | — |
| `FCM_RELAY_URL` | URL del relay push FCM (opcional, servidores auto-hospedados apuntan al host relay) | — |
| `FCM_RELAY_KEY` | Clave de autenticación del relay push FCM (opcional, debe coincidir con `FCM_RELAY_SECRET` del host relay) | — |
| `ONESIGNAL_APP_ID` | OneSignal App ID (opcional) | — |
| `ONESIGNAL_REST_KEY` | OneSignal REST API Key (opcional) | — |
| `ONESIGNAL_RELAY_SECRET` | Secreto del relay push OneSignal (opcional, configurar en host relay para habilitar endpoint) | — |
| `ONESIGNAL_RELAY_URL` | URL del relay push OneSignal (opcional, servidores auto-hospedados apuntan al host relay) | — |
| `ONESIGNAL_RELAY_KEY` | Clave de autenticación del relay push OneSignal (opcional, debe coincidir con `ONESIGNAL_RELAY_SECRET` del host relay) | — |
| `NTFY_BASE_URL` | URL del servidor ntfy (opcional, usa ntfy.sh público por defecto) | `https://ntfy.sh` |
| `NTFY_TOKEN` | Token de autenticación ntfy (opcional, para servidores auto-hospedados) | — |
| `APNS_TEAM_ID` | Apple Developer Team ID (opcional, push nativo iOS) | — |
| `APNS_KEY_ID` | ID de clave de autenticación APNS (opcional) | — |
| `APNS_PRIVATE_KEY` | Contenido de clave privada .p8 de APNS (opcional, soporta escape `\n`) | — |
| `APNS_BUNDLE_ID` | iOS App Bundle Identifier (opcional) | — |
| `APNS_SANDBOX` | Modo sandbox APNS (opcional, `true` para desarrollo/TestFlight) | `false` |
| `APNS_RELAY_SECRET` | Secreto del relay push (opcional, configurar en host relay para habilitar endpoint) | — |
| `APNS_RELAY_URL` | URL del relay push (opcional, servidores auto-hospedados apuntan al host relay) | — |
| `APNS_RELAY_KEY` | Clave de autenticación del relay push (opcional, debe coincidir con `APNS_RELAY_SECRET` del host relay) | — |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token (opcional) | — |
| `STICKER_PACKS` | Paquetes de stickers personalizados (opcional, `nombre:etiqueta`) | 9 predeterminados integrados |
| `ADMIN_PATH` | Ruta URL del panel de administración | `/admin` |
| `ADMIN_PASSWORD` | Contraseña del panel de administración (**cambiar en producción**) | `admin123` |

### Manejo de saltos de línea en la clave privada FCM

El campo `private_key` en el JSON de la cuenta de servicio de Firebase contiene una clave privada RSA en formato PEM, que requiere **saltos de línea reales** (`\n`, ASCII 0x0A) entre cada línea de 64 caracteres. Sin embargo, muchas plataformas de despliegue (Zeabur, Vercel, Railway, Docker) almacenan las variables de entorno como cadenas de una sola línea, convirtiendo `\n` en la secuencia literal de dos caracteres `\` + `n`.

**Esta es la causa más común de fallo en las notificaciones push FCM** — el parser PEM falla silenciosamente y no se envían notificaciones push, sin registros de error.

**El servidor maneja esto automáticamente**: `fcm.rs` normaliza las secuencias literales `\n` a saltos de línea reales antes del análisis. Ambos formatos funcionan:

- **Una línea (recomendado para plataformas en la nube)**: Pegar el valor bruto de `private_key` del archivo JSON con escapes `\n`:
  ```
  FCM_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
  ```

- **Múltiples líneas (para archivos .env)**: Envolver el contenido PEM completo entre comillas con saltos de línea reales:
  ```
  FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
  MIIEvQ...
  -----END PRIVATE KEY-----"
  ```

| Plataforma | Formato recomendado | Notas |
|------------|---------------------|-------|
| **Zeabur** | Una línea (`\n` escapado) | Pegar valor JSON directamente en el panel de Variables |
| **Docker / docker-compose** | Ambos | Usar YAML `\|` para múltiples líneas; una línea en `.env` |
| **Vercel / Railway** | Una línea (`\n` escapado) | Los campos de entrada normalmente no soportan saltos de línea reales |
| **Archivo .env en Linux** | Múltiples líneas (con comillas) | Asegurarse de que las comillas estén correctamente cerradas |

**Solución de problemas**: Si las variables FCM están configuradas pero el push de Android no funciona, revisar los registros del servidor:
- `[FCM] No access token available` → Error de formato de clave privada (problema de salto de línea)
- `[FCM] ✅ Push sent to user xxx` → El envío FCM funciona, el problema es del lado del cliente
- Sin registros FCM → `FCM_PROJECT_ID` no configurado o no hay token en la tabla `fcm_tokens`

### Push ntfy (Dispositivos Android chinos sin Google Services)

Para dispositivos Android sin Google Mobile Services (Huawei, Xiaomi, OPPO, vivo, etc.), PaperPhone soporta notificaciones push vía [ntfy](https://ntfy.sh).

**Configuración predeterminada (sin configuración)**: Usa el servicio público ntfy.sh. No se necesita configuración adicional.

**Configuración opcional** (para servidores ntfy auto-hospedados):

```env
NTFY_BASE_URL=https://your-ntfy-server.com
NTFY_TOKEN=your_optional_auth_token
```

**Flujo de configuración del usuario**:
1. Instalar la app ntfy ([Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) / [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/) / [Descarga directa](https://ntfy.sh))
2. Abrir Ajustes de PaperPhone y encontrar la tarjeta «ntfy Push»
3. Copiar el nombre del topic mostrado y suscribirse en la app ntfy
4. Tocar «Registrar Push» para completar el registro

> **Nota de seguridad**: Las notificaciones ntfy contienen títulos y resúmenes en texto plano (no el contenido real del mensaje). Para mayor seguridad, considere auto-hospedar un servidor ntfy.

### Push APNS (App nativa iOS)

APNS (Apple Push Notification Service) envía notificaciones push a apps iOS nativas construidas con Capacitor. Hay dos opciones de configuración:

#### Opción A: Configuración directa (Servidor del desarrollador de la app)

1. Iniciar sesión en [Apple Developer](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles** → **Keys**
2. Clic en **+** para crear una nueva Key → marcar **Apple Push Notifications service (APNs)** → Register
3. **Descargar el archivo `.p8`** (⚠️ ¡solo se puede descargar una vez!) y anotar el **Key ID**
4. Anotar su **Team ID** de la página de membresía de Apple Developer (10 caracteres alfanuméricos)
5. Agregar a `server/.env`:

```env
APNS_TEAM_ID=AB12CD34EF
APNS_KEY_ID=LH4Z9YN3P7
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGTAgEA...(contenido del archivo .p8)...\n-----END PRIVATE KEY-----"
APNS_BUNDLE_ID=com.yourcompany.paperphone
APNS_SANDBOX=false
```

> `APNS_SANDBOX`: Configurar como `true` para compilaciones de desarrollo/TestFlight, `false` para producción en App Store.

#### Opción B: Vía Push Relay (Servidores auto-hospedados)

Si está usando la app iOS de otra persona (ej. descargada del App Store), no tiene las credenciales de Apple del desarrollador y no puede enviar pushes APNS directamente. Use el **Push Relay** en su lugar.

**Cómo funciona:**

```
┌──────────────────────┐       ┌─────────────────────────┐       ┌─────────┐
│  Servidor             │  HTTP  │  Servidor del            │  APNS  │  Apple  │
│  auto-hospedado       │──────→│  desarrollador           │──────→│  ──→ 📱 │
│  (sin creds Apple)    │       │  (tiene .p8 Key + Relay) │       └─────────┘
│  APNS_RELAY_URL=...   │       │  APNS_TEAM_ID=...        │
│  APNS_RELAY_KEY=...   │       │  APNS_RELAY_SECRET=...   │
└──────────────────────┘       └─────────────────────────┘
```

**Paso 1: El desarrollador de la app habilita el endpoint Relay**

En el servidor del desarrollador de la app (que ya tiene credenciales APNS), configurar un secreto relay:

```env
# .env del servidor del desarrollador (ya tiene APNS_TEAM_ID etc.)
APNS_RELAY_SECRET=un_secreto_compartido_largo_aleatorio
```

Esto habilita automáticamente el endpoint de relay push en `POST /api/push-relay/apns`.

**Paso 2: El usuario auto-hospedado configura el Relay**

Los servidores auto-hospedados solo necesitan dos variables — **no se requieren credenciales de Apple**:

```env
# .env del servidor auto-hospedado
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=el_secreto_compartido_del_paso_1
```

**Cómo funciona:**
1. El servidor auto-hospedado recibe un mensaje offline → consulta la tabla local `apns_tokens` para los tokens de dispositivos iOS del usuario
2. Envía tokens de dispositivo + título/contenido push vía HTTP POST al Relay
3. El Relay valida la clave, luego envía a Apple usando sus propias credenciales APNS
4. El Relay devuelve una lista de tokens obsoletos; el servidor auto-hospedado limpia automáticamente su base de datos local

> **Prioridad**: Credenciales APNS locales → Push Relay → Omitir (silencioso). Si ambos están configurados, la conexión directa local tiene prioridad.

> **Nota de seguridad**: El relay solo transmite títulos y resúmenes de notificaciones push (ej. «Alguien te envió un mensaje»), no el contenido real del mensaje. Los tokens de dispositivo no pueden usarse para leer datos del usuario.

### Push Relay (Todos los canales)

Para operadores de servidores auto-hospedados que usan la app publicada de otra persona (ej. del App Store/Google Play), no tiene las credenciales push del desarrollador (Apple .p8 Key / cuenta de servicio Firebase / OneSignal API Key).

El sistema Push Relay proporciona capacidad de relay para los canales **APNS, FCM y OneSignal**:

**El desarrollador de la app** habilita los endpoints relay en su servidor:

```env
# .env del servidor del desarrollador
APNS_RELAY_SECRET=una_cadena_larga_aleatoria
FCM_RELAY_SECRET=una_cadena_larga_aleatoria
ONESIGNAL_RELAY_SECRET=una_cadena_larga_aleatoria
```

**Los usuarios auto-hospedados** solo necesitan URL y clave del relay — **no se requieren credenciales de servicios push**:

```env
# .env del servidor auto-hospedado
# APNS (push nativo iOS)
APNS_RELAY_URL=https://app-developer-server.com
APNS_RELAY_KEY=secreto_compartido

# FCM (push nativo Android)
FCM_RELAY_URL=https://app-developer-server.com
FCM_RELAY_KEY=secreto_compartido

# OneSignal (apps empaquetadas con Median.co)
ONESIGNAL_RELAY_URL=https://app-developer-server.com
ONESIGNAL_RELAY_KEY=secreto_compartido
```

> **Prioridad**: Credenciales locales → Push Relay → Omitir (silencioso). Si ambos están configurados, la conexión directa local tiene prioridad.

---

## Push Relay oficial

Los operadores de servidores auto-hospedados pueden usar el relay push oficial para habilitar notificaciones push iOS/Android sin configurar credenciales push:

```env
# 2026-05-18
APNS_RELAY_URL=https://619.chat
APNS_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
FCM_RELAY_URL=https://619.chat
FCM_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
ONESIGNAL_RELAY_URL=https://619.chat
ONESIGNAL_RELAY_KEY=EzmpqftbsENaRUO6BTABxLV96q7RuEDyokXJr1DWdDjL54cLg7yXVUQqydCQvxrX
```

Agregue estas líneas al archivo `.env` de su servidor auto-hospedado.

---

## Licencia

Este proyecto está licenciado bajo la [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
