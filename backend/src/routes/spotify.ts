import { Router, Request, Response } from "express";
import SpotifyWebApi from "spotify-web-api-node";
import auth from "../middlewares/auth.js";
import crypto from "crypto";
import db from "../config/db.js";

const router = Router();
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: "https://api-zatyshok.esiah.dev/spotify/callback",
});

const spotifyScopes: string[] = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
];

router.get("/login", auth, async (req: Request, res: Response) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");

    await db.execute("UPDATE users SET spotify_state = ? WHERE id = ?", [
      state,
      req.user.id,
    ]);

    const authorizeURL = spotifyApi.createAuthorizeURL(spotifyScopes, state);
    res.redirect(authorizeURL);
  } catch (err) {
    res.status(500).send("Erreur lors de l'initialisation Spotify");
  }
});

router.get("/callback", async (req: Request, res: Response) => {
  const { error, code, state } = req.query as {
    error?: string;
    code?: string;
    state?: string;
  };
  if (error) return res.send(`Erreur: ${error}`);
  if (!code) return res.send("Erreur: Code manquant");

  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const access_token = data.body["access_token"];
    const refresh_token = data.body["refresh_token"];

    const [users]: any = await db.query(
      "SELECT id, username FROM users WHERE spotify_state = ?",
      [state],
    );

    if (users.length === 0) {
      return res
        .status(403)
        .send("Lien expiré ou tentative de corruption de session.");
    }

    await db.execute(
      "UPDATE users SET spotify_access_token = ?, spotify_refresh_token = ?, spotify_state = NULL WHERE id = ?",
      [access_token, refresh_token, users[0].id],
    );

    res.send(
      `Connexion Spotify réussie pour ${users[0].username} ! Tu peux fermer cette page et retourner sur l'application.`,
    );
  } catch (err) {
    res.send(`Erreur lors de la récupération des tokens: ${err}`);
  }
});

// --- FONCTION DE RAFRAÎCHISSEMENT DU TOKEN TEMPORAIRE ---
async function executeSpotify(
  req: Request,
  action: (api: SpotifyWebApi) => Promise<any>,
) {
  if (!req.user.spotify_access_token || !req.user.spotify_refresh_token) {
    return Promise.reject({ statusCode: 403, message: "Spotify non lié." });
  }

  const userSpotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  userSpotifyApi.setAccessToken(req.user.spotify_access_token);
  userSpotifyApi.setRefreshToken(req.user.spotify_refresh_token);

  try {
    return await action(userSpotifyApi);
  } catch (err: any) {
    if (err.statusCode === 401) {
      try {
        const data = await userSpotifyApi.refreshAccessToken();
        const newAccess = data.body["access_token"];

        await db.query(
          "UPDATE users SET spotify_access_token = ? WHERE id = ?",
          [newAccess, req.user.id],
        );

        userSpotifyApi.setAccessToken(newAccess);
        return await action(userSpotifyApi);
      } catch (refreshErr) {
        throw refreshErr;
      }
    }
    throw err;
  }
}

// --- CONTRÔLES SPOTIFY INTELLIGENTS ---
router.get("/current", auth, async (req: Request, res: Response) => {
  try {
    if (!req.user.spotify_access_token) {
      return res.json({
        isPlaying: false,
        message: "Aucun compte Spotify lié.",
      });
    }

    const data = await executeSpotify(req, (api) =>
      api.getMyCurrentPlayingTrack(),
    );

    if (data && data.body && data.body.item) {
      const item = data.body.item as SpotifyApi.TrackObjectFull;
      res.json({
        isPlaying: data.body.is_playing,
        title: item.name,
        artist: item.artists.map((a) => a.name).join(", "),
        albumImageUrl: item.album.images[0]?.url,
      });
    } else {
      res.json({ isPlaying: false, message: "Aucune musique en cours." });
    }
  } catch (err: any) {
    if (err.statusCode === 403) {
      return res.json({ isPlaying: false, message: "Spotify non lié." });
    }
    console.error("[SPOTIFY ERROR CURRENT]", err.message || err);
    res.status(500).json({ error: "Erreur Spotify" });
  }
});

router.put("/pause", auth, async (req: Request, res: Response) => {
  try {
    await executeSpotify(req, (api) => api.pause());
    res.json({ success: true });
  } catch (err: any) {
    if (err.statusCode === 403)
      return res.status(403).json({ error: "Non lié" });
    res.status(500).json({ error: "Erreur Pause" });
  }
});

router.put("/play", auth, async (req: Request, res: Response) => {
  try {
    await executeSpotify(req, (api) => api.play());
    res.json({ success: true });
  } catch (err: any) {
    if (err.statusCode === 403)
      return res.status(403).json({ error: "Non lié" });
    res.status(500).json({ error: "Erreur Play" });
  }
});

router.put("/next", auth, async (req: Request, res: Response) => {
  try {
    await executeSpotify(req, (api) => api.skipToNext());
    res.json({ success: true });
  } catch (err: any) {
    if (err.statusCode === 403)
      return res.status(403).json({ error: "Non lié" });
    res.status(500).json({ error: "Skip error" });
  }
});

router.put("/previous", auth, async (req: Request, res: Response) => {
  try {
    await executeSpotify(req, (api) => api.skipToPrevious());
    res.json({ success: true });
  } catch (err: any) {
    if (err.statusCode === 403)
      return res.status(403).json({ error: "Non lié" });
    res.status(500).json({ error: "Prev error" });
  }
});

export default router;
