-- PaperPhone IM — Database Schema
-- MySQL 8.0+  |  utf8mb4  |  InnoDB
--
-- Auto-executed on server startup via sqlx.
-- CREATE TABLE IF NOT EXISTS ensures idempotency.

-- ── Users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)   PRIMARY KEY,
  username    VARCHAR(64)   NOT NULL UNIQUE,
  nickname    VARCHAR(128)  NOT NULL,
  avatar      VARCHAR(512)  DEFAULT NULL,
  password    VARCHAR(255)  NOT NULL,
  ik_pub      TEXT          NOT NULL,
  spk_pub     TEXT          NOT NULL,
  spk_sig     TEXT          NOT NULL,
  kem_pub     TEXT          NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_online   TINYINT(1)    NOT NULL DEFAULT 0,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── One-Time PreKeys (X3DH OPKs) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prekeys (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)     NOT NULL,
  key_id      INT             NOT NULL,
  opk_pub     TEXT            NOT NULL,
  used        TINYINT(1)      NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unused (user_id, used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Friendships ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friends (
  id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)     NOT NULL,
  friend_id   VARCHAR(36)     NOT NULL,
  status      ENUM('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
  auto_delete INT             NOT NULL DEFAULT 604800,
  message     VARCHAR(512)    DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pair (user_id, friend_id),
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Groups ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `groups` (
  id          VARCHAR(36)   PRIMARY KEY,
  name        VARCHAR(128)  NOT NULL,
  avatar      VARCHAR(512)  DEFAULT NULL,
  owner_id    VARCHAR(36)   NOT NULL,
  notice      TEXT          DEFAULT NULL,
  auto_delete INT           NOT NULL DEFAULT 604800,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Group Members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  group_id    VARCHAR(36)   NOT NULL,
  user_id     VARCHAR(36)   NOT NULL,
  role        ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  muted       TINYINT(1)    NOT NULL DEFAULT 0,
  joined_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          VARCHAR(36)   PRIMARY KEY,
  type        ENUM('private','group') NOT NULL,
  from_id     VARCHAR(36)   NOT NULL,
  to_id       VARCHAR(36)   NOT NULL,
  ciphertext  LONGTEXT      NOT NULL,
  header      TEXT          DEFAULT NULL,
  self_ciphertext LONGTEXT  DEFAULT NULL,
  self_header TEXT          DEFAULT NULL,
  msg_type    ENUM('text','image','file','voice','video_call','system','sticker','video') NOT NULL DEFAULT 'text',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered   TINYINT(1)    NOT NULL DEFAULT 0,
  read_at     DATETIME      DEFAULT NULL,
  INDEX idx_to_undelivered (to_id, delivered, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moments (朋友圈) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  text_content VARCHAR(1024) NOT NULL DEFAULT '',
  visibility  ENUM('public','whitelist','blacklist') NOT NULL DEFAULT 'public',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moment Images ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_images (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  moment_id   BIGINT UNSIGNED NOT NULL,
  url         TEXT            NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_moment_id (moment_id),
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moment Videos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_videos (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  moment_id   BIGINT UNSIGNED NOT NULL,
  url         TEXT            NOT NULL,
  thumbnail   TEXT            DEFAULT NULL,
  duration    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_moment_id (moment_id),
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moment Likes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_likes (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  moment_id   BIGINT UNSIGNED NOT NULL,
  user_id     VARCHAR(36)     NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_like (moment_id, user_id),
  FOREIGN KEY (moment_id) REFERENCES moments(id)  ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moment Comments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_comments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  moment_id   BIGINT UNSIGNED NOT NULL,
  user_id     VARCHAR(36)     NOT NULL,
  text_content VARCHAR(512)   NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_moment_id (moment_id),
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Push Subscriptions (Web Push / VAPID) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)     NOT NULL,
  endpoint    TEXT            NOT NULL,
  p256dh      TEXT            NOT NULL,
  auth        TEXT            NOT NULL,
  user_agent  VARCHAR(255)    DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_endpoint (user_id, endpoint(512)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_push_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── OneSignal Players (Median.co native push) ────────────────────────────
CREATE TABLE IF NOT EXISTS onesignal_players (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)     NOT NULL,
  player_id   VARCHAR(64)     NOT NULL,
  platform    VARCHAR(16)     DEFAULT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_player (player_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_os_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Sessions (Login Device Tracking) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id           VARCHAR(36)   PRIMARY KEY,
  user_id      VARCHAR(36)   NOT NULL,
  device_name  VARCHAR(128)  DEFAULT NULL,
  device_type  VARCHAR(16)   DEFAULT NULL,
  os           VARCHAR(64)   DEFAULT NULL,
  browser      VARCHAR(64)   DEFAULT NULL,
  ip_address   VARCHAR(45)   DEFAULT NULL,
  last_active  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked      TINYINT(1)    NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sess_user (user_id, revoked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Friend Tags ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_tags (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  name        VARCHAR(32)   NOT NULL,
  color       VARCHAR(7)    DEFAULT '#2196F3',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_tag (user_id, name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ft_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Friend Tag Assignments (many-to-many) ────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_tag_assignments (
  tag_id      BIGINT UNSIGNED NOT NULL,
  friend_id   VARCHAR(36)     NOT NULL,
  PRIMARY KEY (tag_id, friend_id),
  FOREIGN KEY (tag_id)    REFERENCES friend_tags(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moment Visibility Rules ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS moment_visibility (
  moment_id   BIGINT UNSIGNED NOT NULL,
  type        ENUM('whitelist','blacklist') NOT NULL,
  target_type ENUM('tag','user') NOT NULL,
  target_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (moment_id, target_type, target_id),
  FOREIGN KEY (moment_id) REFERENCES moments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── TOTP Two-Factor Authentication ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_totp (
  user_id         VARCHAR(36)   PRIMARY KEY,
  totp_secret     VARCHAR(64)   NOT NULL,
  recovery_codes  TEXT          DEFAULT NULL,
  enabled         TINYINT(1)    NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Moment Privacy (user-level moments visibility) ──────────────────────
CREATE TABLE IF NOT EXISTS moment_privacy (
  user_id     VARCHAR(36)   NOT NULL,
  target_id   VARCHAR(36)   NOT NULL,
  hide_their  TINYINT(1)    NOT NULL DEFAULT 0,
  hide_mine   TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, target_id),
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Timeline (public posts, Xiaohongshu-style) ──────────────────────────
CREATE TABLE IF NOT EXISTS timeline_posts (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       VARCHAR(36)     NOT NULL,
  text_content  VARCHAR(2000)   NOT NULL DEFAULT '',
  is_anonymous  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tl_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timeline_media (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id     BIGINT UNSIGNED NOT NULL,
  url         TEXT            NOT NULL,
  media_type  ENUM('image','video') NOT NULL DEFAULT 'image',
  thumbnail   TEXT            DEFAULT NULL,
  duration    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  INDEX idx_tl_media_post (post_id),
  FOREIGN KEY (post_id) REFERENCES timeline_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timeline_likes (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id     BIGINT UNSIGNED NOT NULL,
  user_id     VARCHAR(36)     NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tl_like (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES timeline_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timeline_comments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id       BIGINT UNSIGNED NOT NULL,
  user_id       VARCHAR(36)     NOT NULL,
  is_anonymous  TINYINT(1)      NOT NULL DEFAULT 0,
  text_content  VARCHAR(512)    NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tl_comment_post (post_id),
  FOREIGN KEY (post_id) REFERENCES timeline_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Group Invites (QR code invite links with expiration) ─────────────────
CREATE TABLE IF NOT EXISTS group_invites (
  id          VARCHAR(36)   PRIMARY KEY,
  group_id    VARCHAR(36)   NOT NULL,
  created_by  VARCHAR(36)   NOT NULL,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id)   REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_gi_group (group_id),
  INDEX idx_gi_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
