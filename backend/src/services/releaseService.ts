import db from "../config/db.js";
import { transporter } from "../routes/auth.js";
import { getReleaseEmailTemplate } from "../routes/user.js";

const GITHUB_REPO = "xEsiah/zatyshok-frontend";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

let lastReleaseCache: { version: string; url: string } | null = null;

/**
 * Récupère les infos de la dernière release sur GitHub
 */
export async function fetchLatestGitHubRelease() {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: { "User-Agent": "Zatyshok-Backend-Monitor" },
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    const info = {
      version: data.tag_name,
      url: data.html_url,
    };

    lastReleaseCache = info;
    return info;
  } catch (err) {
    console.error("[RELEASE MONITOR] Fetch error:", err);
    return null;
  }
}

/**
 * Vérifie s'il y a une nouvelle release et prévient les utilisateurs
 */
export async function checkAndNotifyNewRelease() {
  try {
    const latest = await fetchLatestGitHubRelease();
    if (!latest) return;

    const [rows]: any = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'last_notified_version'",
    );
    const lastNotified = rows[0]?.setting_value;

    if (latest.version !== lastNotified) {
      const getVersionBase = (v: string) =>
        v.replace(/^v/, "").split(".").slice(0, 2).join(".");
      const latestBase = getVersionBase(latest.version);
      const lastNotifiedBase = lastNotified ? getVersionBase(lastNotified) : "";

      if (latestBase !== lastNotifiedBase) {
        console.log(
          `[RELEASE MONITOR] New Major/Minor version detected: ${latest.version}. Notifying users...`,
        );

        const [users]: any = await db.query(
          "SELECT email, username, role FROM users WHERE isApproved = 1",
        );

        for (const user of users) {
          const { subject, html } = getReleaseEmailTemplate(
            user.role,
            user.username,
            latest.version,
            latest.url,
          );

          transporter
            .sendMail({
              from: `"Zatyshok" <${process.env.SMTP_USER}>`,
              to: user.email,
              subject,
              html,
              attachments: [
                {
                  filename: "icon.png",
                  path: "./uploads/icon.png",
                  cid: "logo-app",
                },
              ],
            })
            .catch((e) =>
              console.error(
                `[RELEASE MONITOR] Mail failed for ${user.email}:`,
                e,
              ),
            );
        }
      }

      await db.execute(
        "INSERT INTO system_settings (setting_key, setting_value) VALUES ('last_notified_version', ?) ON DUPLICATE KEY UPDATE setting_value = ?",
        [latest.version, latest.version],
      );
    }
  } catch (err) {
    console.error(
      "[RELEASE MONITOR] Erreur lors de la vérification (DB non prête ?):",
      err,
    );
  }
}

/**
 * Démarre la surveillance (toutes les heures)
 */
export function setupReleaseMonitoring() {
  checkAndNotifyNewRelease();

  setInterval(checkAndNotifyNewRelease, 3600000);
}

/**
 * Getter pour la route d'accueil
 */
export async function getLatestReleaseInfo() {
  if (lastReleaseCache) return lastReleaseCache;
  return await fetchLatestGitHubRelease();
}
