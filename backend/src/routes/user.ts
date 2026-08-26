import { Request, Response, Router } from "express";
import db from "../config/db.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import auth from "../middlewares/auth.js";
import bcrypt from "bcrypt";
import { transporter } from "./auth.js";
import emailTemplates from "../config/emailTemplates.json";

const router = Router();
const saltRounds = 10;

const validatePassword = (password: string): string | null => {
  if (password.length < 16) {
    return "Le mot de passe doit contenir au moins 16 caractères.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Le mot de passe doit contenir au moins une lettre majuscule.";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Le mot de passe doit contenir au moins un caractère spécial.";
  }
  return null;
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/profiles/");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.get("/me", auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const [userRows]: any = await db.query(
      "SELECT username, email, profile_picture FROM users WHERE id = ?",
      [userId],
    );
    const user = userRows[0];

    const [moods]: any = await db.query(
      "SELECT COUNT(*) as count FROM mood_entries WHERE user_id = ?",
      [userId],
    );
    const [goals]: any = await db.query(
      "SELECT COUNT(*) as count FROM calendar_entries WHERE user_id = ? AND category = 'goal'",
      [userId],
    );
    const [events]: any = await db.query(
      "SELECT COUNT(*) as count FROM calendar_entries WHERE user_id = ? AND category = 'event'",
      [userId],
    );
    const [notes]: any = await db.query(
      "SELECT COUNT(*) as count FROM calendar_entries WHERE user_id = ? AND category = 'note'",
      [userId],
    );

    res.json({
      username: user.username,
      email: user.email,
      profilePicture: user.profile_picture,
      stats: {
        moods: moods[0].count,
        goals: goals[0].count,
        events: events[0].count,
        notes: notes[0].count,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération du profil" });
  }
});

router.patch("/update-info", auth, async (req: Request, res: Response) => {
  const { username, email } = req.body;
  const userId = req.user.id;
  const oldEmail = req.user.email;

  try {
    const [existing]: any = await db.query(
      "SELECT id, username FROM users WHERE (username = ? OR email = ?) AND id != ?",
      [username, email, userId],
    );

    if (existing.length > 0) {
      const field = existing[0].username === username ? "Username" : "Email";
      return res.status(400).json({ error: `${field} already taken` });
    }

    await db.execute("UPDATE users SET username = ?, email = ? WHERE id = ?", [
      username,
      email,
      userId,
    ]);

    if (email !== oldEmail) {
      await transporter.sendMail({
        from: `"Zatyshok" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Changement d'adresse e-mail",
        text: `Bonjour ${username}, ton adresse e-mail sur Zatyshok a bien été mise à jour.`,
        html: `
          <div style="font-family: 'Quicksand', sans-serif; background-color: #faf7f2; color: #4e342e; padding: 40px; text-align: center; border-radius: 20px;">
            <img src="cid:logo-app" alt="Zatyshok Logo" width="64" height="64" style="margin-bottom: 20px; border-radius: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
            <h1 style="color: #8d7d77; margin-bottom: 10px;">Modification effectuée</h1>
            <p>Bonjour <b>${username}</b>,</p>
            <p>Ton adresse e-mail a été modifiée avec succès. Ton nouvel identifiant de connexion est : <b>${email}</b></p>
            <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">© 2026 - Co Hai Se • Zatyshok • Automated Transmission</p>
          </div>`,
        attachments: [
          {
            filename: "icon.png",
            path: "./uploads/icon.png",
            cid: "logo-app",
          },
        ],
      });
    }

    res.json({ message: "Profil mis à jour" });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

router.put("/role", auth, async (req: Request, res: Response) => {
  const { role } = req.body;
  const allowedRoles = [
    "default",
    "music",
    "musicFR",
    "art",
    "artFR",
    "him",
    "her",
  ];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    await db.execute("UPDATE users SET role = ? WHERE id = ?", [
      role,
      req.user.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Role update error" });
  }
});

router.post(
  "/upload-profile",
  auth,
  upload.single("image"),
  async (req: any, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const userId = req.user.id;
    const newImageUrl = `uploads/profiles/${req.file.filename}`;

    try {
      const [rows]: any = await db.query(
        "SELECT profile_picture FROM users WHERE id = ?",
        [userId],
      );
      const oldPath = rows[0]?.profile_picture;

      await db.execute("UPDATE users SET profile_picture = ? WHERE id = ?", [
        newImageUrl,
        userId,
      ]);

      if (
        oldPath &&
        oldPath.includes("profile-") &&
        !oldPath.includes("default.png")
      ) {
        const fullPath = path.resolve(oldPath);
        if (existsSync(fullPath)) {
          await fs
            .unlink(fullPath)
            .catch((err) => console.error("Délétion ratée:", err));
        }
      }

      res.json({ imageUrl: newImageUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
    }
  },
);

export const getReleaseEmailTemplate = (
  role: string,
  username: string,
  version: string,
  releaseUrl: string,
) => {
  const templates: any = emailTemplates.release;
  const theme = templates[role] || templates.default;

  const subject = theme.subject.replace("{{version}}", version);
  const msg = theme.msg.replace("{{version}}", version);

  const isFrench = role === "artFR" || role === "musicFR";
  const launchUrl = `${process.env.API_URL || "https://api-zatyshok.esiah.dev"}/open-app`;
  const fallbackText = isFrench
    ? `Si le bouton ne fonctionne pas, <a href="${releaseUrl}" style="color: ${theme.color}; text-decoration: underline;">cliquez ici pour voir les notes de version</a>.`
    : `If the button doesn't work, <a href="${releaseUrl}" style="color: ${theme.color}; text-decoration: underline;">click here to see the release notes</a>.`;

  return {
    subject,
    html: `
      <div style="font-family: sans-serif; background-color: ${theme.bg}; color: ${theme.text}; padding: 40px; text-align: center; border-radius: 20px;">
        <img src="cid:logo-app" alt="Zatyshok Logo" width="64" height="64" style="margin-bottom: 20px; border-radius: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        <div style="font-size: 40px; margin-bottom: 20px;">${theme.emoji}</div>
        <h1 style="color: ${theme.color}; margin-bottom: 10px;">${theme.title}</h1>
        <p>${isFrench ? "Bonjour" : "Hello"} <b>${username}</b>,</p>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 30px;">${msg}</p>
        <a href="${launchUrl}" style="background-color: ${theme.color}; color: ${role === "him" ? "#000" : "#fff"}; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
          ${theme.btn}
        </a>
        <p style="margin-top: 25px; font-size: 13px; opacity: 0.7;">${fallbackText}</p>
        <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">© 2026 - Co Hai Se • Zatyshok • Automated Transmission</p>
      </div>`,
  };
};

const getPasswordEmailTemplate = (role: string, username: string) => {
  const templates: any = emailTemplates.password;
  const theme = templates[role] || templates.default;

  return {
    subject: theme.subject,
    html: `
      <div style="font-family: sans-serif; background-color: ${theme.bg}; color: ${theme.text}; padding: 40px; text-align: center; border-radius: 20px;">
        <img src="cid:logo-app" alt="Zatyshok Logo" width="64" height="64" style="margin-bottom: 20px; border-radius: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        <div style="font-size: 40px; margin-bottom: 20px;">${theme.emoji}</div>
        <h1 style="color: ${theme.color};">${theme.title}</h1>
        <p>Bonjour <b>${username}</b>,</p>
        <p>${theme.msg}</p>
        <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">© 2026 - Co Hai Se • Zatyshok • Automated Transmission</p>
      </div>`,
  };
};

export const getForgotPasswordEmailTemplate = (
  role: string,
  username: string,
  token: string,
) => {
  const templates: any = emailTemplates.forgotPassword;
  const theme = templates[role] || templates.default;

  return {
    subject: theme.subject,
    html: `
      <div style="font-family: sans-serif; background-color: ${theme.bg}; color: ${theme.text}; padding: 40px; text-align: center; border-radius: 20px;">
        <img src="cid:logo-app" alt="Zatyshok Logo" width="64" height="64" style="margin-bottom: 20px; border-radius: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
        <div style="font-size: 40px; margin-bottom: 20px;">${theme.emoji}</div>
        <h1 style="color: ${theme.color}; margin-bottom: 10px;">${theme.title}</h1>
        <p>Bonjour <b>${username}</b>,</p>
        <p style="font-size: 16px; margin-bottom: 30px;">${theme.msg}</p>
        <div style="padding: 15px 30px; background-color: ${theme.color}; color: ${theme.bg}; font-size: 28px; font-weight: bold; border-radius: 8px; display: inline-block; letter-spacing: 4px;">
          ${token}
        </div>
        <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">© 2026 - Co Hai Se • Zatyshok • Automated Transmission</p>
      </div>`,
  };
};

router.patch("/update-password", auth, async (req: Request, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const [users]: any = await db.query(
      "SELECT password FROM users WHERE id = ?",
      [userId],
    );
    const user = users[0];

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match)
      return res.status(401).json({ error: "Ancien mot de passe incorrect" });

    if (oldPassword === newPassword) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit être différent de l'ancien",
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const hash = await bcrypt.hash(newPassword, saltRounds);
    await db.execute("UPDATE users SET password = ? WHERE id = ?", [
      hash,
      userId,
    ]);

    const { subject, html } = getPasswordEmailTemplate(
      req.user.role,
      req.user.username,
    );
    await transporter
      .sendMail({
        from: `"Zatyshok" <${process.env.SMTP_USER}>`,
        to: req.user.email,
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
      .catch((err) => console.error("Mail error:", err));

    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour du mot de passe" });
  }
});

export default router;
