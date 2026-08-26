import { Request, Response, Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../config/db.js";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { getForgotPasswordEmailTemplate } from "./user.js";
import path from "path";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

const commonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');
  body { font-family: 'Quicksand', sans-serif; background-color: #faf7f2; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #4e342e; }
  .card { background: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 8px 8px 16px #e0d8cf, -8px -8px 16px #ffffff; text-align: center; max-width: 400px; width: 90%; }
  img.logo { width: 64px; height: 64px; border-radius: 16px; margin-bottom: 20px; box-shadow: 4px 4px 8px #e0d8cf, -4px -4px 8px #ffffff; }
  h1 { color: #8d7d77; margin-bottom: 10px; font-size: 1.8rem; font-weight: 700; }
  p { opacity: 0.8; line-height: 1.5; font-weight: 500; }
  .btn { margin-top: 25px; display: inline-block; padding: 12px 24px; background: #8d7d77; color: white; text-decoration: none; border-radius: 12px; font-weight: 700; box-shadow: 4px 4px 8px #e0d8cf, -4px -4px 8px #ffffff; transition: transform 0.2s, filter 0.2s; }
  .btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
`;

router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;
  const userRole = role || "default";
  const approvalToken = crypto.randomBytes(32).toString("hex");

  if (!username || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const [existing]: any = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, email],
    );
    if (existing.length > 0) {
      const field = existing[0].username === username ? "Username" : "Email";
      return res.status(400).json({ error: `${field} already taken` });
    }

    const hash = await bcrypt.hash(password, saltRounds);

    await db.execute(
      "INSERT INTO users (username, email, password, isApproved, role, approval_token, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, email, hash, 0, userRole, approvalToken, "uploads/icon.png"],
    );

    const confirmLink = `${process.env.API_URL}/approve/${approvalToken}`;
    const isFr = req.headers["accept-language"]?.startsWith("fr");

    const mailContent = isFr
      ? {
          subject: "Bienvenue ! Valide ton compte Zatyshok",
          title: `Bienvenue ${username} !`,
          text: "Merci de t'être inscrit. Clique sur le bouton ci-dessous pour activer ton compte :",
          button: "Confirmer mon compte",
          altText: "Si le bouton ne fonctionne pas, copie ce lien :",
        }
      : {
          subject: "Welcome! Verify your Zatyshok account",
          title: `Welcome ${username}!`,
          text: "Thank you for signing up. Click the button below to activate your account:",
          button: "Confirm my account",
          altText: "If the button doesn't work, copy this link:",
        };

    await transporter.sendMail({
      from: `"Zatyshok" <${process.env.SMTP_USER}>`,
      to: email,
      subject: mailContent.subject,
      html: `
        <div style="font-family: 'Quicksand', sans-serif; background-color: #faf7f2; color: #4e342e; padding: 40px; text-align: center; border-radius: 20px;">
          <img src="cid:logo-app" alt="Zatyshok Logo" width="64" height="64" style="margin-bottom: 20px; border-radius: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
          <h1 style="color: #8d7d77; margin-bottom: 10px;">${mailContent.title}</h1>
          <p style="font-size: 16px; margin-bottom: 30px; font-weight: 500;">${mailContent.text}</p>
          <a href="${confirmLink}" style="padding: 12px 25px; background-color: #8d7d77; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block;">
            ${mailContent.button}
          </a>
          <p style="margin-top: 25px; font-size: 13px; opacity: 0.7;">
            ${mailContent.altText} <br>
            <a href="${confirmLink}" style="color: #8d7d77;">${confirmLink}</a>
          </p>
          <p style="margin-top: 30px; font-size: 12px; opacity: 0.6;">© 2026 - Co Hai Se • Zatyshok • Automated Transmission</p>
        </div>
      `,
      attachments: [
        {
          filename: "icon.png",
          path: path.resolve("uploads/icon.png"),
          cid: "logo-app",
        },
      ],
    });

    const responseMessage = isFr
      ? "Compte créé ! Vérifie tes emails pour confirmer ton inscription."
      : "Account created! Please check your email to confirm your registration.";

    res.json({ message: responseMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const [users]: any = await db.query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username],
    );

    if (users.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    if (user.isApproved !== 1) {
      return res.status(403).json({
        error: "Account pending approval",
        isPending: true,
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: "30d",
    });

    res.json({
      token,
      username: user.username,
      userId: user.id,
      profilePicture: user.profile_picture,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login error" });
  }
});

const getApprovalHtml = (isFrench: boolean) => {
  const content = isFrench
    ? {
        title: "Compte Approuvé !",
        message: "Ton compte Zatyshok est maintenant actif.",
        sub: "Tu peux fermer cette page et te connecter sur l'application.",
        btn: "Ouvrir l'App",
      }
    : {
        title: "Account Approved!",
        message: "Your Zatyshok account is now active.",
        sub: "You can close this window and log in to the application.",
        btn: "Open App",
      };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zatyshok</title>
      <link rel="icon" type="image/png" href="/uploads/icon.png">
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="card">
        <img src="/uploads/icon.png" alt="Zatyshok Logo" class="logo" />
        <h1>${content.title}</h1>
        <p>${content.message}</p>
        <p><small>${content.sub}</small></p>
        <a href="zatyshok://" class="btn">${content.btn}</a>
      </div>
      <script>
        if (window.location.hostname === 'localhost') {
          setTimeout(() => {
            window.location.href = "http://localhost:5173?approved=true";
          }, 3000);
        }
      </script>
    </body>
    </html>
  `;
};

router.get("/approve/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const [users]: any = await db.query(
      "SELECT id FROM users WHERE approval_token = ?",
      [token],
    );

    if (users.length === 0) {
      const isFr = req.headers["accept-language"]?.startsWith("fr");
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zatyshok</title>
          <link rel="icon" type="image/png" href="/uploads/icon.png">
          <style>${commonStyles}</style>
        </head>
        <body>
          <div class="card">
            <img src="/uploads/icon.png" alt="Zatyshok Logo" class="logo" />
            <h1>${isFr ? "Lien invalide" : "Invalid link"}</h1>
            <p>${isFr ? "Il semble que ce lien ait déjà été utilisé. Essaie de te connecter sur l'application." : "It seems this link has already been used. Please try logging in to the app."}</p>
            <a href="zatyshok://" class="btn">${isFr ? "Ouvrir Zatyshok" : "Open Zatyshok"}</a>
          </div>
        </body>
        </html>
      `);
    }

    await db.execute(
      "UPDATE users SET isApproved = 1, approval_token = NULL WHERE id = ?",
      [users[0].id],
    );
    const isFr = req.headers["accept-language"]?.startsWith("fr");
    res.send(getApprovalHtml(!!isFr));
  } catch (err) {
    res.status(500).send("Erreur lors de la validation");
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const [users]: any = await db.query(
      "SELECT id, username, role FROM users WHERE email = ?",
      [email],
    );
    if (users.length === 0)
      return res.status(404).json({ error: "Email non trouvé" });

    const user = users[0];
    const token = crypto.randomBytes(3).toString("hex").toUpperCase();
    const expiry = new Date(Date.now() + 3600000);

    await db.execute(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [token, expiry, user.id],
    );

    const emailData = getForgotPasswordEmailTemplate(
      user.role,
      user.username,
      token,
    );

    await transporter.sendMail({
      from: `"Zatyshok" <${process.env.SMTP_USER}>`,
      to: email,
      subject: emailData.subject,
      html: emailData.html,
      attachments: [
        {
          filename: "icon.png",
          path: "./uploads/icon.png",
          cid: "logo-app",
        },
      ],
    });

    res.json({ message: "Email de récupération envoyé !" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'email" });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  try {
    const [users]: any = await db.query(
      "SELECT id FROM users WHERE email = ? AND reset_token = ? AND reset_token_expiry > NOW()",
      [email, token],
    );

    if (users.length === 0)
      return res.status(400).json({ error: "Code invalide ou expiré" });

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const hash = await bcrypt.hash(newPassword, saltRounds);
    await db.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [hash, users[0].id],
    );

    res.json({ message: "Mot de passe mis à jour avec succès !" });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la réinitialisation" });
  }
});

router.get("/open-app", (req: Request, res: Response) => {
  const isFr = req.headers["accept-language"]?.startsWith("fr");
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zatyshok</title>
      <link rel="icon" type="image/png" href="/uploads/icon.png">
      <style>${commonStyles}</style>
    </head>
    <body>
      <div class="card">
        <img src="/uploads/icon.png" alt="Zatyshok Logo" class="logo" />
        <h1>${isFr ? "Ouverture de Zatyshok..." : "Opening Zatyshok..."}</h1>
        <p>${isFr ? "Ton application devrait s'ouvrir automatiquement." : "Your application should open automatically."}</p>
        <a href="zatyshok://" class="btn">${isFr ? "Cliquer ici si rien ne se passe" : "Click here if nothing happens"}</a>
      </div>
      <script>
        window.location.href = "zatyshok://";
      </script>
    </body>
    </html>
  `);
});

export default router;
