import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import calendarRoutes from "./routes/calendar.js";
import moodRoutes from "./routes/moods.js";
import weatherRoutes from "./routes/weather.js";
import spotifyRoutes from "./routes/spotify.js";
import budgetRoutes from "./routes/budget.js";
import userRoutes from "./routes/user.js";
import {
  setupReleaseMonitoring,
  getLatestReleaseInfo,
  checkAndNotifyNewRelease,
} from "./services/releaseService.js";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        [
          "http://localhost:5173",
          "http://localhost:5174",
          "https://api-zatyshok.esiah.dev",
        ].includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Bloqué par CORS"));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-app-token",
      "x-app-version",
    ],
  }),
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (process.env.NODE_ENV !== "production") {
  app.get("/dev/check-release", async (req, res) => {
    await checkAndNotifyNewRelease();
    res.json({
      message: "Vérification manuelle lancée.",
    });
  });
}

app.use("/", authRoutes);
app.use("/user", userRoutes);
app.use("/calendar", calendarRoutes);
app.use("/moods", moodRoutes);
app.use("/weather", weatherRoutes);
app.use("/spotify", spotifyRoutes);
app.use("/budget", budgetRoutes);

const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  const release = await getLatestReleaseInfo();
  const downloadUrl =
    release?.url || "https://github.com/xEsiah/zatyshok-frontend/releases";
  const version = release?.version || "latest";

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Zatyshok API</title>
      <link rel="icon" type="image/png" href="/uploads/icon.png">
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; background-color: #faf7f2; color: #4e342e; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; max-width: 450px; }
        h1 { color: #8d7d77; margin-bottom: 10px; font-weight: 600; }
        p { opacity: 0.8; line-height: 1.6; margin-bottom: 25px; }
        .btn { background: #8d7d77; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; display: inline-block; transition: transform 0.2s; }
        .btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Welcome on Zatyshok API</h1>
        <p>This is the backend server. To enjoy the full experience, feel free to download our desktop application.</p>
        <a href="${downloadUrl}" class="btn">Download App (${version})</a>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Serveur started on port: ${PORT}`);
  setupReleaseMonitoring();
});
