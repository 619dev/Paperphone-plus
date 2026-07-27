# LiveKit 音视频通话部署

1:1 私聊语音/视频和群会议均使用 LiveKit SFU。每个客户端只向 SFU 发布一路媒体；
群会议使用 simulcast/dynacast 和可见画面订阅来支持 100 人房间。

## 本地开发

```bash
docker compose up -d
```

本地默认地址为 `ws://localhost:7880`，默认密钥仅用于开发。

## 生产环境

必须设置以下环境变量，并保证服务端和 LiveKit 使用完全相同的 key/secret：

```text
LIVEKIT_URL=wss://meeting.example.com
LIVEKIT_API_KEY=<随机 API key>
LIVEKIT_API_SECRET=<至少 32 字节随机 secret>
```

- 给 `meeting.example.com` 配置可信 TLS 证书；Web/PWA 在 HTTPS 页面中不能连接 `ws://`。
- 对外开放 TCP 7881 和 UDP 7882；7880 应放在支持 WebSocket 的 HTTPS 反向代理后。
- `rtc.use_external_ip` 已开启，主机必须具有可达公网 IP。复杂企业网络建议额外配置 TURN/TLS。
- 100 人会议的实际容量取决于并发开麦/开摄像头数、出口带宽和 CPU。正式上线前应使用目标码率和设备模型进行压测。
- 生产环境不要使用仓库中的默认密钥。

仓库提供了可直接修改的双域名 Nginx 配置：
[`deploy/nginx/paperphone-plus.conf`](deploy/nginx/paperphone-plus.conf)。将
`api.example.com`、`meeting.example.com` 和证书路径替换为实际值后启用。Nginx 只代理
HTTPS/WebSocket；LiveKit 的 TCP 7881 和 UDP 7882 必须在主机及云防火墙中直接开放。

## Zeabur 部署

`zeabur.yaml` 会创建 LiveKit 服务，并自动向 server 注入相同的通话密钥和
`LIVEKIT_URL=wss://<会议域名>`。

Zeabur 当前不支持公开 UDP 服务端口，因此模板只公开：

- 7880：WebSocket/API，经 Zeabur HTTPS 域名访问；
- 7881：ICE/TCP 媒体回退。

LiveKit 内部仍配置 UDP 7882，但在 Zeabur 模板中不声明该端口，以保证模板当前可用。
TCP 可以建立通话，但丢包恢复、延迟和弱网画质通常不如 UDP。当前需要生产级通话时，
请使用 LiveKit Cloud，或在具有公网 IP 的 VM 上单独运行 LiveKit，并将 Zeabur server 的
`LIVEKIT_URL` 和会议密钥改为外置实例。Zeabur 支持 UDP 后，只需给 LiveKit 服务增加 UDP
7882 声明，客户端和令牌接口不需要修改。

私聊令牌接口只允许已接受的好友进入唯一私聊房间，令牌有效期为 1 小时。群会议令牌
只允许群成员进入对应房间，群主获得主席权限，令牌有效期为 6 小时。
