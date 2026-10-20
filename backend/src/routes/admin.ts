import { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { fetchLatestGitHubRelease, getLatestReleaseInfo } from "../services/releaseService.js";
import { transporter } from "./auth.js";
import {
  clearAdminCookie,
  clearLoginFailures,
  clearPending2faCookie,
  clientKey,
  getAdminUser,
  getPending2faId,
  isLoginBlocked,
  recordLoginFailure,
  requireAdmin,
  setAdminCookie,
  setPending2faCookie,
} from "../middlewares/admin.js";

const ADMIN_COOKIE_HOURS = 12;
const TWOFA_CODE_LENGTH = 6;
const TWOFA_TTL_MINUTES = 5;
const TWOFA_MAX_ATTEMPTS = 5;
const TWOFA_RESEND_COOLDOWN_SECONDS = 60;
const TWOFA_BCRYPT_ROUNDS = 10;

const router = Router();

const audit = async (
  actorId: number | null,
  action: string,
  targetId: number | null = null,
  detail: string | null = null,
) => {
  try {
    await db.execute(
      "INSERT INTO admin_audit (actor_id, action, target_id, detail) VALUES (?, ?, ?, ?)",
      [actorId, action, targetId, detail],
    );
  } catch (err) {
    console.error("[AUDIT ERROR]", err);
  }
};

const parseId = (raw: string | string[]): number | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getVersionBase = (v: string): string =>
  v.replace(/^v/, "").split(".").slice(0, 2).join(".");

const getOverview = async (actorId: number) => {
  const [[counts]]: any = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(isApproved = 1), 0) AS approved,
            COALESCE(SUM(isApproved = 0), 0) AS pending,
            COALESCE(SUM(is_admin = 1), 0) AS admins,
            COALESCE(SUM(last_seen_at >= NOW() - INTERVAL 7 DAY), 0) AS active7d,
            COALESCE(SUM(last_seen_at >= NOW() - INTERVAL 30 DAY), 0) AS active30d
     FROM users`,
  );

  const [versionRows]: any = await db.query(
    "SELECT app_version AS version, COUNT(*) AS count FROM users GROUP BY app_version ORDER BY count DESC",
  );

  const [[updateCounts]]: any = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(created_at >= NOW() - INTERVAL 7 DAY), 0) AS last7d
     FROM app_updates`,
  );

  const [[loginCounts]]: any = await db.query(
    `SELECT COALESCE(SUM(created_at >= NOW() - INTERVAL 7 DAY), 0) AS last7d
     FROM login_events`,
  );

  const release = await getLatestReleaseInfo();

  const [settingRows]: any = await db.query(
    "SELECT setting_value FROM system_settings WHERE setting_key = 'last_notified_version'",
  );
  const notifiedVersion = settingRows[0]?.setting_value || null;

  const tableNames = [
    "users",
    "calendar_entries",
    "mood_entries",
    "transactions",
    "budget_categories",
    "login_events",
    "app_updates",
    "admin_audit",
  ];
  const tables: { name: string; count: number }[] = [];
  for (const name of tableNames) {
    const [rows]: any = await db.query(`SELECT COUNT(*) AS count FROM \`${name}\``);
    tables.push({ name, count: Number(rows[0].count) });
  }

  const [sizeRows]: any = await db.query(
    `SELECT COALESCE(SUM(data_length + index_length), 0) AS bytes
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
  );

  let adoption: { base: string | null; onLatest: number; pct: number } = {
    base: null,
    onLatest: 0,
    pct: 0,
  };
  if (release?.version) {
    const base = getVersionBase(release.version);
    const onLatest = versionRows
      .filter((row: any) =>
        row.version ? getVersionBase(row.version) === base : false,
      )
      .reduce((sum: number, row: any) => sum + Number(row.count), 0);
    adoption = {
      base,
      onLatest,
      pct: counts.approved > 0 ? Math.round((onLatest / counts.approved) * 100) : 0,
    };
  }

  return {
    me: { id: actorId },
    users: counts,
    versions: versionRows.map((row: any) => ({
      version: row.version || "—",
      count: Number(row.count),
    })),
    updates: { total: Number(updateCounts.total), last7d: Number(updateCounts.last7d) },
    logins7d: Number(loginCounts.last7d),
    release: release || null,
    notifiedVersion,
    adoption,
    system: {
      uptimeSeconds: Math.round(process.uptime()),
      dbBytes: Number(sizeRows[0].bytes),
      tables,
    },
  };
};

const getUsers = async () => {
  const [rows]: any = await db.query(
    `SELECT id, username, email, role, isApproved, is_admin, app_version,
            last_login_at, last_seen_at, created_at
     FROM users
     ORDER BY last_login_at IS NULL, last_login_at DESC, id`,
  );
  return rows;
};

const getActivity = async () => {
  const [logins]: any = await db.query(
    `SELECT l.id, l.user_id, u.username, l.ip, l.app_version, l.created_at
     FROM login_events l
     JOIN users u ON u.id = l.user_id
     ORDER BY l.id DESC
     LIMIT 30`,
  );
  const [updates]: any = await db.query(
    `SELECT a.id, a.user_id, u.username, a.from_version, a.to_version, a.created_at
     FROM app_updates a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.id DESC
     LIMIT 30`,
  );
  const [entries]: any = await db.query(
    `SELECT a.id, a.actor_id, u.username AS actor, a.action, a.target_id,
            t.username AS target, a.detail, a.created_at
     FROM admin_audit a
     LEFT JOIN users u ON u.id = a.actor_id
     LEFT JOIN users t ON t.id = a.target_id
     ORDER BY a.id DESC
     LIMIT 30`,
  );
  return { logins, updates, audit: entries };
};

router.get("/", async (req: Request, res: Response) => {
  const user = await getAdminUser(req);
  if (!user) return res.redirect("/admin/login");
  res.send(getDashboardHtml(req));
});

router.get("/login", async (req: Request, res: Response) => {
  const user = await getAdminUser(req);
  if (user) return res.redirect("/admin");
  res.send(getLoginHtml(req));
});

const build2faEmail = (fr: boolean, code: string) => {
  const content = fr
    ? {
        subject: "Code de connexion · Zatyshok Admin",
        title: "Code de connexion",
        text: "Voici ton code pour accéder à l'administration :",
        expiry: `Valable ${TWOFA_TTL_MINUTES} minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.`,
      }
    : {
        subject: "Sign-in code · Zatyshok Admin",
        title: "Sign-in code",
        text: "Here is your code to access the administration panel:",
        expiry: `Valid for ${TWOFA_TTL_MINUTES} minutes. If you didn't request this, ignore this email.`,
      };
  return `
    <div style="font-family: 'Quicksand', sans-serif; background-color: #0a0a0f; color: #e0e0e0; padding: 40px; text-align: center; border-radius: 20px; border: 1px solid #1e1e2e;">
      <h1 style="color: #f5c518; margin: 0 0 12px;">${content.title}</h1>
      <p style="font-size: 15px; margin: 0 0 24px;">${content.text}</p>
      <div style="font-size: 34px; font-weight: 700; letter-spacing: 0.35em; color: #f5c518; margin: 0 0 28px;">${code}</div>
      <p style="font-size: 12px; opacity: 0.6; margin: 0;">${content.expiry}</p>
      <p style="margin-top: 30px; font-size: 12px; opacity: 0.5;">© 2026 - Co Hai Se • Zatyshok • Automated Transmission</p>
    </div>`;
};

const send2faCode = async (userId: number, email: string, fr: boolean): Promise<void> => {
  const code = String(crypto.randomInt(10 ** TWOFA_CODE_LENGTH)).padStart(TWOFA_CODE_LENGTH, "0");
  const hash = await bcrypt.hash(code, TWOFA_BCRYPT_ROUNDS);
  await db.execute("DELETE FROM admin_2fa_codes WHERE user_id = ? AND used = 0", [userId]);
  await db.execute(
    `INSERT INTO admin_2fa_codes (user_id, code_hash, expires_at)
     VALUES (?, ?, NOW() + INTERVAL ${TWOFA_TTL_MINUTES} MINUTE)`,
    [userId, hash],
  );
  await transporter.sendMail({
    from: `"Zatyshok" <${process.env.SMTP_USER}>`,
    to: email,
    subject: fr ? "Code de connexion · Zatyshok Admin" : "Sign-in code · Zatyshok Admin",
    html: build2faEmail(fr, code),
  });
};

router.post("/login", async (req: Request, res: Response) => {
  const key = clientKey(req);
  if (isLoginBlocked(key)) {
    return res.status(429).json({ error: "rate_limited" });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "missing" });
  }

  try {
    const [users]: any = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username],
    );
    const user = users[0];
    if (!user) {
      recordLoginFailure(key);
      return res.status(401).json({ error: "invalid" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match || user.isApproved !== 1 || user.is_admin !== 1) {
      recordLoginFailure(key);
      return res.status(401).json({ error: "invalid" });
    }

    clearLoginFailures(key);
    await send2faCode(user.id, user.email, isFrench(req));
    const pending = jwt.sign(
      { id: user.id, purpose: "2fa" },
      process.env.JWT_SECRET as string,
      { expiresIn: "10m" },
    );
    setPending2faCookie(res, pending);
    await audit(user.id, "admin_2fa_sent", null, key);
    res.json({ requires2FA: true });
  } catch (err) {
    console.error("[ADMIN LOGIN ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

router.post("/2fa/verify", async (req: Request, res: Response) => {
  const key = clientKey(req);
  if (isLoginBlocked(key)) {
    return res.status(429).json({ error: "rate_limited" });
  }

  const pendingId = getPending2faId(req);
  if (!pendingId) {
    return res.status(401).json({ error: "expired" });
  }

  const code = String(req.body?.code || "").trim();
  if (!code) {
    return res.status(400).json({ error: "missing" });
  }

  try {
    const [users]: any = await db.query(
      "SELECT id, isApproved, is_admin FROM users WHERE id = ?",
      [pendingId],
    );
    const user = users[0];
    if (!user || user.isApproved !== 1 || user.is_admin !== 1) {
      clearPending2faCookie(res);
      return res.status(401).json({ error: "expired" });
    }

    const [codes]: any = await db.query(
      `SELECT id, code_hash, attempts FROM admin_2fa_codes
       WHERE user_id = ? AND used = 0 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [pendingId],
    );
    const active = codes[0];
    if (!active) {
      return res.status(401).json({ error: "expired" });
    }
    if (active.attempts >= TWOFA_MAX_ATTEMPTS) {
      await db.execute("DELETE FROM admin_2fa_codes WHERE user_id = ? AND used = 0", [pendingId]);
      clearPending2faCookie(res);
      return res.status(429).json({ error: "too_many" });
    }

    await db.execute("UPDATE admin_2fa_codes SET attempts = attempts + 1 WHERE id = ?", [
      active.id,
    ]);
    const match = await bcrypt.compare(code, active.code_hash);
    if (!match) {
      recordLoginFailure(key);
      return res.status(401).json({ error: "invalid" });
    }

    await db.execute("UPDATE admin_2fa_codes SET used = 1 WHERE id = ?", [active.id]);
    await db.execute("DELETE FROM admin_2fa_codes WHERE user_id = ? AND used = 0", [pendingId]);
    clearLoginFailures(key);
    clearPending2faCookie(res);
    const token = jwt.sign(
      { id: pendingId, purpose: "admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: `${ADMIN_COOKIE_HOURS}h` },
    );
    setAdminCookie(res, token);
    await audit(pendingId, "admin_login", null, key);
    res.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN 2FA VERIFY ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

router.post("/2fa/resend", async (req: Request, res: Response) => {
  const key = clientKey(req);
  if (isLoginBlocked(key)) {
    return res.status(429).json({ error: "rate_limited" });
  }

  const pendingId = getPending2faId(req);
  if (!pendingId) {
    return res.status(401).json({ error: "expired" });
  }

  try {
    const [users]: any = await db.query(
      "SELECT id, email, isApproved, is_admin FROM users WHERE id = ?",
      [pendingId],
    );
    const user = users[0];
    if (!user || user.isApproved !== 1 || user.is_admin !== 1) {
      clearPending2faCookie(res);
      return res.status(401).json({ error: "expired" });
    }

    const [recent]: any = await db.query(
      `SELECT COUNT(*) AS recent FROM admin_2fa_codes
       WHERE user_id = ? AND created_at > NOW() - INTERVAL ${TWOFA_RESEND_COOLDOWN_SECONDS} SECOND`,
      [pendingId],
    );
    if (Number(recent[0].recent) > 0) {
      return res.status(429).json({ error: "cooldown" });
    }

    await send2faCode(user.id, user.email, isFrench(req));
    await audit(user.id, "admin_2fa_sent", null, key);
    res.json({ ok: true });
  } catch (err) {
    console.error("[ADMIN 2FA RESEND ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  const user = await getAdminUser(req);
  if (user) await audit(user.id, "admin_logout", null, clientKey(req));
  clearAdminCookie(res);
  clearPending2faCookie(res);
  res.json({ ok: true });
});

router.get("/api/overview", requireAdmin, async (req: Request, res: Response) => {
  try {
    res.json(await getOverview(req.user.id));
  } catch (err) {
    console.error("[ADMIN OVERVIEW ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

router.get("/api/users", requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json(await getUsers());
  } catch (err) {
    console.error("[ADMIN USERS ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

router.get("/api/activity", requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json(await getActivity());
  } catch (err) {
    console.error("[ADMIN ACTIVITY ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

const userAction = async (
  req: Request,
  res: Response,
  action: string,
  apply: (userId: number, actorId: number) => Promise<boolean>,
  denySelf = false,
) => {
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(400).json({ error: "bad_id" });
  if (denySelf && targetId === req.user.id) {
    return res.status(400).json({ error: "self_target" });
  }
  try {
    const changed = await apply(targetId, req.user.id);
    if (!changed) return res.status(404).json({ error: "not_found" });
    await audit(req.user.id, action, targetId, null);
    res.json({ ok: true });
  } catch (err) {
    console.error(`[ADMIN ACTION ${action}]`, err);
    res.status(500).json({ error: "server" });
  }
};

router.post("/api/users/:id/approve", requireAdmin, (req, res) =>
  userAction(req, res, "user_approve", async (targetId) => {
    const [result]: any = await db.execute(
      "UPDATE users SET isApproved = 1, approval_token = NULL WHERE id = ?",
      [targetId],
    );
    return result.affectedRows > 0;
  }),
);

router.post("/api/users/:id/revoke", requireAdmin, (req, res) =>
  userAction(
    req,
    res,
    "user_revoke",
    async (targetId) => {
      const [result]: any = await db.execute(
        "UPDATE users SET isApproved = 0 WHERE id = ?",
        [targetId],
      );
      return result.affectedRows > 0;
    },
    true,
  ),
);

router.post("/api/users/:id/admin", requireAdmin, (req, res) =>
  userAction(req, res, "user_promote", async (targetId) => {
    const [result]: any = await db.execute(
      "UPDATE users SET is_admin = 1 WHERE id = ?",
      [targetId],
    );
    return result.affectedRows > 0;
  }),
);

router.post("/api/users/:id/demote", requireAdmin, (req, res) =>
  userAction(
    req,
    res,
    "user_demote",
    async (targetId) => {
      const [result]: any = await db.execute(
        "UPDATE users SET is_admin = 0 WHERE id = ?",
        [targetId],
      );
      return result.affectedRows > 0;
    },
    true,
  ),
);

router.post("/api/check-release", requireAdmin, async (req: Request, res: Response) => {
  try {
    const release = await fetchLatestGitHubRelease();
    await audit(req.user.id, "release_check", null, release?.version || null);
    res.json({ release });
  } catch (err) {
    console.error("[ADMIN RELEASE CHECK ERROR]", err);
    res.status(500).json({ error: "server" });
  }
});

const isFrench = (req: Request): boolean => {
  const lang = req.headers["accept-language"];
  return typeof lang === "string" ? lang.startsWith("fr") : true;
};

const getLoginHtml = (req: Request): string => {
  const t = isFrench(req)
    ? {
        title: "Zatyshok · Admin",
        heading: "Administration",
        username: "Utilisateur ou email",
        password: "Mot de passe",
        submit: "Se connecter",
        errorInvalid: "Identifiants invalides.",
        errorRate: "Trop de tentatives. Réessaie dans 15 minutes.",
        errorMissing: "Remplis tous les champs.",
        errorServer: "Erreur serveur. Réessaie.",
        hint: "Utilise les mêmes identifiants que l'application.",
        codeHint: "Un code à 6 chiffres vient d'être envoyé par email.",
        codeLabel: "Code de vérification",
        codeSubmit: "Vérifier",
        codeResend: "Renvoyer le code",
        codeBack: "Retour",
        codeSent: "Nouveau code envoyé.",
        errorInvalidCode: "Code invalide ou expiré.",
        errorExpired: "Session expirée. Recommence.",
        errorTooMany: "Trop de tentatives de code. Recommence dans 15 minutes.",
        errorCooldown: "Patiente quelques secondes avant de renvoyer un code.",
      }
    : {
        title: "Zatyshok · Admin",
        heading: "Administration",
        username: "Username or email",
        password: "Password",
        submit: "Sign in",
        errorInvalid: "Invalid credentials.",
        errorRate: "Too many attempts. Try again in 15 minutes.",
        errorMissing: "Please fill in all fields.",
        errorServer: "Server error. Please retry.",
        hint: "Use the same credentials as the application.",
        codeHint: "A 6-digit code has been sent to your email.",
        codeLabel: "Verification code",
        codeSubmit: "Verify",
        codeResend: "Resend code",
        codeBack: "Back",
        codeSent: "New code sent.",
        errorInvalidCode: "Invalid or expired code.",
        errorExpired: "Session expired. Please start over.",
        errorTooMany: "Too many code attempts. Try again in 15 minutes.",
        errorCooldown: "Wait a few seconds before requesting a new code.",
      };

  return `<!DOCTYPE html>
<html lang="${isFrench(req) ? "fr" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <link rel="icon" type="image/png" href="/uploads/icon.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap">
  <style>
    :root { --bg: #0a0a0f; --card: #14141f; --text: #e0e0e0; --muted: #7a7a8e; --accent: #f5c518; --shadow-dark: #000000; --shadow-light: #1e1e2e; }
    * { box-sizing: border-box; }
    body { font-family: 'Quicksand', sans-serif; background-color: var(--bg); display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: var(--text); }
    .card { background: var(--card); padding: 40px; border-radius: 24px; box-shadow: 0 0 30px rgba(245,197,24,0.08), 8px 8px 16px var(--shadow-dark); text-align: center; max-width: 400px; width: 90%; border: 1px solid #1e1e2e; }
    img.logo { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 0 20px rgba(245,197,24,0.15); }
    h1 { color: var(--accent); margin: 0 0 8px; font-size: 1.6rem; font-weight: 700; }
    p.hint { opacity: 0.6; font-size: 0.85rem; margin: 0 0 20px; }
    label { display: block; text-align: left; font-weight: 600; font-size: 0.85rem; margin: 14px 0 6px; color: var(--muted); }
    input { width: 100%; padding: 12px 16px; border: 1px solid #2a2a3e; border-radius: 12px; background: #0d0d14; color: var(--text); font-family: inherit; font-size: 1rem; outline: none; transition: border-color 0.2s; }
    input:focus { border-color: var(--accent); }
    button { margin-top: 24px; width: 100%; padding: 13px; border: none; border-radius: 12px; background: var(--accent); color: #0a0a0f; font-family: inherit; font-weight: 700; font-size: 1rem; cursor: pointer; transition: transform 0.2s, filter 0.2s; }
    button:hover { transform: translateY(-2px); filter: brightness(1.1); }
    button.linklike { background: transparent; color: var(--muted); font-size: 0.8rem; margin-top: 10px; padding: 6px; }
    button.linklike:hover { color: var(--accent); transform: none; filter: none; }
    #error { color: #e74c3c; font-size: 0.9rem; min-height: 1.2em; margin-top: 14px; font-weight: 600; }
    #info { color: var(--accent); font-size: 0.9rem; min-height: 1.2em; margin-top: 14px; font-weight: 600; }
    #code { text-align: center; letter-spacing: 0.4em; font-size: 1.3rem; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/uploads/icon.png" alt="Zatyshok" class="logo">
    <h1>${t.heading}</h1>
    <p class="hint">${t.hint}</p>
    <form id="form">
      <label for="username">${t.username}</label>
      <input id="username" name="username" autocomplete="username" required>
      <label for="password">${t.password}</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">${t.submit}</button>
    </form>
    <div id="twofa" style="display:none">
      <p class="hint">${t.codeHint}</p>
      <label for="code">${t.codeLabel}</label>
      <input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required>
      <button type="button" id="verifyBtn">${t.codeSubmit}</button>
      <button type="button" id="resendBtn" class="linklike">${t.codeResend}</button>
      <button type="button" id="backBtn" class="linklike">${t.codeBack}</button>
    </div>
    <div id="error"></div>
    <div id="info"></div>
  </div>
  <script>
    const MESSAGES = {
      invalid: ${JSON.stringify(t.errorInvalid)},
      rate_limited: ${JSON.stringify(t.errorRate)},
      missing: ${JSON.stringify(t.errorMissing)},
      server: ${JSON.stringify(t.errorServer)}
    };
    const CODE_MESSAGES = {
      invalid: ${JSON.stringify(t.errorInvalidCode)},
      expired: ${JSON.stringify(t.errorExpired)},
      too_many: ${JSON.stringify(t.errorTooMany)},
      rate_limited: ${JSON.stringify(t.errorRate)},
      cooldown: ${JSON.stringify(t.errorCooldown)},
      missing: ${JSON.stringify(t.errorMissing)},
      server: ${JSON.stringify(t.errorServer)}
    };
    const CODE_SENT = ${JSON.stringify(t.codeSent)};

    const errorEl = document.getElementById('error');
    const infoEl = document.getElementById('info');
    const form = document.getElementById('form');
    const twofa = document.getElementById('twofa');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      infoEl.textContent = '';
      const body = {
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value
      };
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (res.ok && data.requires2FA) {
          form.style.display = 'none';
          twofa.style.display = 'block';
          document.getElementById('code').focus();
        } else if (res.ok) {
          window.location.href = '/admin';
        } else {
          errorEl.textContent = MESSAGES[data.error] || MESSAGES.server;
        }
      } catch (err) {
        errorEl.textContent = MESSAGES.server;
      }
    });

    const submitCode = async () => {
      errorEl.textContent = '';
      infoEl.textContent = '';
      const code = document.getElementById('code').value.trim();
      if (!code) { errorEl.textContent = CODE_MESSAGES.missing; return; }
      try {
        const res = await fetch('/admin/2fa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok) {
          window.location.href = '/admin';
        } else {
          errorEl.textContent = CODE_MESSAGES[data.error] || CODE_MESSAGES.server;
        }
      } catch (err) {
        errorEl.textContent = CODE_MESSAGES.server;
      }
    };

    document.getElementById('verifyBtn').addEventListener('click', submitCode);
    document.getElementById('code').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); submitCode(); }
    });

    let resendTimer = null;
    document.getElementById('resendBtn').addEventListener('click', async () => {
      errorEl.textContent = '';
      infoEl.textContent = '';
      const btn = document.getElementById('resendBtn');
      if (btn.disabled) return;
      try {
        const res = await fetch('/admin/2fa/resend', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          infoEl.textContent = CODE_SENT;
          btn.disabled = true;
          resendTimer = setTimeout(() => { btn.disabled = false; }, 60000);
        } else {
          errorEl.textContent = CODE_MESSAGES[data.error] || CODE_MESSAGES.server;
        }
      } catch (err) {
        errorEl.textContent = CODE_MESSAGES.server;
      }
    });

    document.getElementById('backBtn').addEventListener('click', () => {
      errorEl.textContent = '';
      infoEl.textContent = '';
      document.getElementById('code').value = '';
      twofa.style.display = 'none';
      form.style.display = 'block';
      document.getElementById('password').value = '';
      document.getElementById('password').focus();
    });
  </script>
</body>
</html>`;
};

const getDashboardHtml = (req: Request): string => {
  const fr = isFrench(req);
  const t = fr
    ? {
        title: "Zatyshok · Administration",
        logout: "Déconnexion",
        refresh: "Actualiser",
        users: "Utilisateurs",
        approved: "Approuvés",
        pending: "En attente",
        active7: "Actifs (7 j)",
        active30: "Actifs (30 j)",
        updates7: "Mises à jour (7 j)",
        logins7: "Connexions (7 j)",
        release: "Dernière release",
        notified: "Notifiée",
        adoption: "Adoption",
        versions: "Versions installées",
        system: "Système",
        uptime: "Uptime",
        dbSize: "Taille base",
        usersTable: "Comptes",
        updatesTable: "Historique des mises à jour",
        loginsTable: "Connexions récentes",
        auditTable: "Journal d'audit",
        cUser: "Utilisateur",
        cEmail: "Email",
        cTheme: "Thème",
        cVersion: "Version",
        cLastLogin: "Dernière connexion",
        cLastSeen: "Dernière activité",
        cCreated: "Inscrit le",
        cActions: "Actions",
        cFrom: "De",
        cTo: "Vers",
        cDate: "Date",
        cIp: "IP",
        cActor: "Acteur",
        cAction: "Action",
        cTarget: "Cible",
        approve: "Approuver",
        revoke: "Révoquer",
        demote: "Rétrograder",
        checkRelease: "Vérifier la release",
        confirmApprove: "Approuver ce compte ?",
        confirmRevoke: "Révoquer l'accès de ce compte ?",
        confirmDemote: "Retirer les droits admin de ce compte ?",
        confirmCheck: "Interroger GitHub pour la dernière release ?",
        none: "Aucune donnée",
        badgeAdmin: "admin",
        badgePending: "en attente",
        badgeApproved: "actif",
        badgeNone: "jamais vu",
        loading: "Chargement…",
        errorLoad: "Erreur de chargement des données.",
        justNow: "à l'instant",
      }
    : {
        title: "Zatyshok · Administration",
        logout: "Sign out",
        refresh: "Refresh",
        users: "Users",
        approved: "Approved",
        pending: "Pending",
        active7: "Active (7d)",
        active30: "Active (30d)",
        updates7: "Updates (7d)",
        logins7: "Logins (7d)",
        release: "Latest release",
        notified: "Notified",
        adoption: "Adoption",
        versions: "Installed versions",
        system: "System",
        uptime: "Uptime",
        dbSize: "DB size",
        usersTable: "Accounts",
        updatesTable: "Update history",
        loginsTable: "Recent logins",
        auditTable: "Audit log",
        cUser: "User",
        cEmail: "Email",
        cTheme: "Theme",
        cVersion: "Version",
        cLastLogin: "Last login",
        cLastSeen: "Last seen",
        cCreated: "Signed up",
        cActions: "Actions",
        cFrom: "From",
        cTo: "To",
        cDate: "Date",
        cIp: "IP",
        cActor: "Actor",
        cAction: "Action",
        cTarget: "Target",
        approve: "Approve",
        revoke: "Revoke",
        demote: "Demote",
        checkRelease: "Check release",
        confirmApprove: "Approve this account?",
        confirmRevoke: "Revoke this account's access?",
        confirmDemote: "Remove admin rights from this account?",
        confirmCheck: "Query GitHub for the latest release?",
        none: "No data",
        badgeAdmin: "admin",
        badgePending: "pending",
        badgeApproved: "active",
        badgeNone: "never seen",
        loading: "Loading…",
        errorLoad: "Failed to load data.",
        justNow: "just now",
      };

  return `<!DOCTYPE html>
<html lang="${fr ? "fr" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <link rel="icon" type="image/png" href="/uploads/icon.png">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap">
  <style>
    :root {
      --bg: #0a0a0f; --card: #14141f; --text: #e0e0e0; --muted: #7a7a8e;
      --accent: #f5c518; --shadow-dark: #000000; --shadow-light: #1e1e2e;
      --ok: #2ecc71; --warn: #f5c518; --bad: #e74c3c;
    }
    * { box-sizing: border-box; }
    body { font-family: 'Quicksand', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 24px; min-height: 100vh; }
    header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
    header img { width: 44px; height: 44px; border-radius: 12px; box-shadow: 0 0 15px rgba(245,197,24,0.15); }
    header h1 { font-size: 1.35rem; color: var(--accent); margin: 0; flex: 1; }
    .btn { border: none; border-radius: 12px; padding: 10px 18px; font-family: inherit; font-weight: 700; font-size: 0.9rem; cursor: pointer; background: var(--accent); color: #0a0a0f; transition: transform 0.2s, filter 0.2s; }
    .btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
    .btn.ghost { background: var(--card); color: var(--text); border: 1px solid #2a2a3e; }
    .btn.small { padding: 6px 12px; font-size: 0.78rem; border-radius: 9px; }
    .btn.danger { background: var(--bad); color: #fff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat { background: var(--card); border-radius: 18px; padding: 18px 20px; border: 1px solid #1e1e2e; box-shadow: 0 0 20px rgba(0,0,0,0.3); }
    .stat .label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
    .stat .value { font-size: 1.7rem; font-weight: 700; margin-top: 6px; color: var(--accent); }
    .stat .sub { font-size: 0.78rem; color: var(--muted); margin-top: 4px; }
    section { background: var(--card); border-radius: 18px; padding: 20px; border: 1px solid #1e1e2e; box-shadow: 0 0 20px rgba(0,0,0,0.3); margin-bottom: 20px; }
    section h2 { margin: 0 0 14px; font-size: 1.05rem; color: var(--accent); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
    th { text-align: left; color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 8px 10px; border-bottom: 2px solid #2a2a3e; }
    td { padding: 9px 10px; border-bottom: 1px solid #1e1e2e; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; margin-right: 5px; }
    .badge.ok { background: rgba(46,204,113,0.12); color: var(--ok); }
    .badge.warn { background: rgba(245,197,24,0.12); color: var(--warn); }
    .badge.bad { background: rgba(231,76,60,0.12); color: var(--bad); }
    .badge.neutral { background: #1a1a2e; color: var(--muted); }
    .actions { display: flex; gap: 6px; flex-wrap: nowrap; white-space: nowrap; }
    #usersTable { table-layout: fixed; width: 100%; }
    #usersTable th:nth-child(1) { width: 16%; }
    #usersTable th:nth-child(2) { width: 12%; }
    #usersTable th:nth-child(3) { width: 6%; }
    #usersTable th:nth-child(4) { width: 8%; }
    #usersTable th:nth-child(5) { width: 13%; }
    #usersTable th:nth-child(6) { width: 13%; }
    #usersTable th:nth-child(7) { width: 11%; }
    #usersTable th:nth-child(8) { width: 21%; }
    #usersTable td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #usersTable td:nth-child(8) { overflow: visible; text-overflow: clip; }
    .chip { display: inline-block; background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 999px; padding: 5px 12px; font-size: 0.8rem; font-weight: 600; margin: 0 6px 6px 0; }
    .empty { color: var(--muted); font-style: italic; padding: 10px 0; }
    .muted { color: var(--muted); }
    .two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; }
    #status { font-size: 0.8rem; color: var(--muted); font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <img src="/uploads/icon.png" alt="Zatyshok">
    <h1>${t.title}</h1>
    <span id="status"></span>
    <button class="btn ghost" id="refreshBtn">${t.refresh}</button>
    <button class="btn ghost" id="checkReleaseBtn">${t.checkRelease}</button>
    <button class="btn" id="logoutBtn">${t.logout}</button>
  </header>

  <div class="grid" id="cards"></div>

  <section>
    <h2>${t.versions}</h2>
    <div id="versions"></div>
  </section>

  <div class="two-col">
    <section>
      <h2>${t.usersTable}</h2>
      <div style="overflow:auto;max-height:420px"><table id="usersTable">
        <thead><tr>
          <th>${t.cUser}</th><th>${t.cEmail}</th><th>${t.cTheme}</th>
          <th>${t.cVersion}</th><th>${t.cLastLogin}</th><th>${t.cLastSeen}</th>
          <th>${t.cCreated}</th><th>${t.cActions}</th>
        </tr></thead>
        <tbody></tbody>
      </table></div>
    </section>

    <div>
      <section>
        <h2>${t.updatesTable}</h2>
        <div style="overflow-x:auto"><table id="updatesTable">
          <thead><tr><th>${t.cUser}</th><th>${t.cFrom}</th><th>${t.cTo}</th><th>${t.cDate}</th></tr></thead>
          <tbody></tbody>
        </table></div>
      </section>

      <section>
        <h2>${t.loginsTable}</h2>
        <div style="overflow-x:auto"><table id="loginsTable">
          <thead><tr><th>${t.cUser}</th><th>${t.cIp}</th><th>${t.cVersion}</th><th>${t.cDate}</th></tr></thead>
          <tbody></tbody>
        </table></div>
      </section>
    </div>
  </div>

  <section>
    <h2>${t.auditTable}</h2>
    <div style="overflow-x:auto"><table id="auditTable">
      <thead><tr><th>${t.cActor}</th><th>${t.cAction}</th><th>${t.cTarget}</th><th>${t.cDate}</th></tr></thead>
      <tbody></tbody>
    </table></div>
  </section>

  <section>
    <h2>${t.system}</h2>
    <div id="system"></div>
  </section>

  <script>
    const T = ${JSON.stringify(t)};
    const LANG = ${JSON.stringify(fr ? "fr-FR" : "en-GB")};
    let ME = null;

    const esc = (value) => String(value === null || value === undefined || value === "" ? "—" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const fmtDate = (value) => {
      if (!value) return "—";
      const d = new Date(String(value).replace(" ", "T"));
      if (isNaN(d.getTime())) return esc(value);
      return d.toLocaleString(LANG, { dateStyle: "short", timeStyle: "short" });
    };

    const fmtDuration = (seconds) => {
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (d > 0) return d + "d " + h + "h";
      if (h > 0) return h + "h " + m + "m";
      return m + "m";
    };

    const fmtBytes = (bytes) => {
      if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + " MB";
      if (bytes > 1024) return (bytes / 1024).toFixed(1) + " KB";
      return bytes + " B";
    };

    const j = async (url, options) => {
      const res = await fetch(url, options);
      if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('unauthorized'); }
      if (!res.ok) throw new Error('request failed');
      return res.json();
    };

    const emptyRow = (cols) => '<tr><td colspan="' + cols + '" class="empty">' + T.none + '</td></tr>';

    const card = (label, value, sub) =>
      '<div class="stat"><div class="label">' + esc(label) + '</div><div class="value">' +
      esc(value) + '</div>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div>';

    const renderCards = (ov) => {
      ME = ov.me;
      const release = ov.release ? ov.release.version : "—";
      document.getElementById('cards').innerHTML =
        card(T.users, ov.users.total) +
        card(T.approved, ov.users.approved) +
        card(T.pending, ov.users.pending) +
        card(T.active7, ov.users.active7d) +
        card(T.active30, ov.users.active30d) +
        card(T.logins7, ov.logins7d) +
        card(T.updates7, ov.updates.last7d) +
        card(T.release, release, ov.adoption.base ? T.adoption + " : " + ov.adoption.pct + "%" : "") +
        card(T.notified, ov.notifiedVersion || "—");
      renderVersions(ov);
      renderSystem(ov);
    };

    const renderVersions = (ov) => {
      const el = document.getElementById('versions');
      if (!ov.versions.length) { el.innerHTML = '<div class="empty">' + T.none + '</div>'; return; }
      el.innerHTML = ov.versions.map((row) =>
        '<span class="chip">' + esc(row.version) + ' · ' + row.count + '</span>'
      ).join('');
    };

    const renderSystem = (ov) => {
      const s = ov.system;
      document.getElementById('system').innerHTML =
        '<div class="grid" style="margin-bottom:0">' +
        card(T.uptime, fmtDuration(s.uptimeSeconds)) +
        card(T.dbSize, fmtBytes(s.dbBytes)) +
        '</div><div style="margin-top:12px">' +
        s.tables.map((row) => '<span class="chip">' + esc(row.name) + ' · ' + row.count + '</span>').join('') +
        '</div>';
    };

    const renderUsers = (rows) => {
      const tbody = document.querySelector('#usersTable tbody');
      if (!rows.length) { tbody.innerHTML = emptyRow(8); return; }
      tbody.innerHTML = rows.map((u) => {
        const badges = (u.is_admin == 1 ? '<span class="badge ok">' + T.badgeAdmin + '</span>' : '') +
          (u.isApproved == 1 ? '<span class="badge neutral">' + T.badgeApproved + '</span>'
                             : '<span class="badge warn">' + T.badgePending + '</span>');
        const actions = [];
        if (u.isApproved != 1) actions.push(btn(u.id, 'approve', T.approve, ''));
        else actions.push(btn(u.id, 'revoke', T.revoke, 'danger'));
        if (u.is_admin == 1 && u.id !== ME.id) actions.push(btn(u.id, 'demote', T.demote, 'ghost'));
        return '<tr>' +
          '<td title="' + esc(u.username) + '"><strong>' + esc(u.username) + '</strong><br>' + badges + '</td>' +
          '<td title="' + esc(u.email) + '">' + esc(u.email) + '</td>' +
          '<td>' + esc(u.role) + '</td>' +
          '<td>' + (u.app_version ? esc(u.app_version) : '<span class="muted">' + T.badgeNone + '</span>') + '</td>' +
          '<td>' + fmtDate(u.last_login_at) + '</td>' +
          '<td>' + fmtDate(u.last_seen_at) + '</td>' +
          '<td>' + fmtDate(u.created_at) + '</td>' +
          '<td><div class="actions">' + actions.join('') + '</div></td>' +
        '</tr>';
      }).join('');
    };

    const btn = (id, action, label, variant) =>
      '<button class="btn small ' + variant + '" data-id="' + id + '" data-action="' + action + '">' + esc(label) + '</button>';

    const CONFIRMS = {
      approve: T.confirmApprove, revoke: T.confirmRevoke, demote: T.confirmDemote
    };

    document.querySelector('#usersTable').addEventListener('click', async (e) => {
      const target = e.target.closest('button[data-action]');
      if (!target) return;
      if (!window.confirm(CONFIRMS[target.dataset.action])) return;
      try {
        await j('/admin/api/users/' + target.dataset.id + '/' + target.dataset.action, { method: 'POST' });
        await load();
      } catch (err) {
        window.alert(T.errorLoad);
      }
    });

    const renderUpdates = (rows) => {
      const tbody = document.querySelector('#updatesTable tbody');
      if (!rows.length) { tbody.innerHTML = emptyRow(4); return; }
      tbody.innerHTML = rows.map((r) =>
        '<tr><td><strong>' + esc(r.username) + '</strong></td><td>' + esc(r.from_version || '—') +
        '</td><td>' + esc(r.to_version) + '</td><td>' + fmtDate(r.created_at) + '</td></tr>'
      ).join('');
    };

    const renderLogins = (rows) => {
      const tbody = document.querySelector('#loginsTable tbody');
      if (!rows.length) { tbody.innerHTML = emptyRow(4); return; }
      tbody.innerHTML = rows.map((r) =>
        '<tr><td><strong>' + esc(r.username) + '</strong></td><td>' + esc(r.ip || '—') +
        '</td><td>' + esc(r.app_version || '—') + '</td><td>' + fmtDate(r.created_at) + '</td></tr>'
      ).join('');
    };

    const renderAudit = (rows) => {
      const tbody = document.querySelector('#auditTable tbody');
      if (!rows.length) { tbody.innerHTML = emptyRow(4); return; }
      tbody.innerHTML = rows.map((r) =>
        '<tr><td>' + esc(r.actor || '—') + '</td><td><code>' + esc(r.action) +
        '</code></td><td>' + esc(r.target || '—') + '</td><td>' + fmtDate(r.created_at) + '</td></tr>'
      ).join('');
    };

    const setStatus = (text) => {
      document.getElementById('status').textContent = text;
    };

    const load = async () => {
      try {
        const [ov, us, ac] = await Promise.all([
          j('/admin/api/overview'),
          j('/admin/api/users'),
          j('/admin/api/activity')
        ]);
        renderCards(ov);
        renderUsers(us);
        renderUpdates(ac.updates);
        renderLogins(ac.logins);
        renderAudit(ac.audit);
        setStatus(new Date().toLocaleTimeString(LANG));
      } catch (err) {
        if (err.message !== 'unauthorized') setStatus(T.errorLoad);
      }
    };

    document.getElementById('refreshBtn').addEventListener('click', load);

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try { await j('/admin/logout', { method: 'POST' }); } catch (err) {}
      window.location.href = '/admin/login';
    });

    document.getElementById('checkReleaseBtn').addEventListener('click', async () => {
      if (!window.confirm(T.confirmCheck)) return;
      try {
        await j('/admin/api/check-release', { method: 'POST' });
        await load();
      } catch (err) {
        window.alert(T.errorLoad);
      }
    });

    load();
    setInterval(load, 60000);
  </script>
</body>
</html>`;
};

export default router;
