ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NULL DEFAULT current_timestamp(),
  ADD COLUMN IF NOT EXISTS `last_login_at` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `last_seen_at` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `app_version` VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS `is_admin` TINYINT(1) NOT NULL DEFAULT 0;

UPDATE `users` SET `created_at` = NOW() WHERE `created_at` IS NULL;

CREATE TABLE IF NOT EXISTS `login_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `app_version` varchar(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_login_events_user` (`user_id`),
  CONSTRAINT `fk_login_events_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_updates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `from_version` varchar(20) DEFAULT NULL,
  `to_version` varchar(20) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_app_updates_user` (`user_id`),
  CONSTRAINT `fk_app_updates_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_audit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `target_id` int(11) DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_actor` (`actor_id`),
  CONSTRAINT `fk_admin_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `users` SET `is_admin` = 1 WHERE `email` = 'esiah.dev@gmail.com';
