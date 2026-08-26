import { Request, Response, Router } from "express";
import auth from "../middlewares/auth.js";
import db from "../config/db.js";

const router = Router();

router.get("/", auth, async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 15;
  const offset = (page - 1) * limit;

  try {
    const [rows]: any = await db.query(
      "SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC LIMIT ? OFFSET ?",
      [req.user.id, limit, offset],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/", auth, async (req: Request, res: Response) => {
  const { mood, note, date } = req.body;
  try {
    const sql = `
      INSERT INTO mood_entries (date, mood, note, user_id) 
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE mood = VALUES(mood), note = VALUES(note), created_at = NOW()
    `;
    await db.execute(sql, [date, mood, note, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Mood save error" });
  }
});

export default router;
