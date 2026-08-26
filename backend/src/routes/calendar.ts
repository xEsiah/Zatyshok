import { Router, Request, Response } from "express";
import auth from "../middlewares/auth.js";
import db from "../config/db.js";

const router = Router();

router.get("/", auth, async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(
      "SELECT * FROM calendar_entries WHERE user_id = ? ORDER BY date ASC",
      [req.user.id],
    );

    const expandedEntries: any[] = [];
    const today = new Date();

    rows.forEach((entry: any) => {
      let dateStr = entry.date;
      if (entry.date instanceof Date) {
        const pad = (n: number) => n.toString().padStart(2, "0");
        dateStr = `${entry.date.getFullYear()}-${pad(entry.date.getMonth() + 1)}-${pad(entry.date.getDate())}`;
      } else if (typeof entry.date === "string") {
        dateStr = entry.date.split("T")[0];
      }

      const baseEntry = { ...entry, date: dateStr };
      expandedEntries.push(baseEntry);

      if (baseEntry.is_recurring && baseEntry.recurrence_rule) {
        let currentDate = new Date(baseEntry.date);
        const rule = baseEntry.recurrence_rule;

        const limitDate = new Date();
        if (rule === "daily") limitDate.setMonth(limitDate.getMonth() + 2);
        else if (rule === "weekly")
          limitDate.setMonth(limitDate.getMonth() + 6);
        else if (rule === "monthly")
          limitDate.setFullYear(limitDate.getFullYear() + 2);
        else if (rule === "yearly")
          limitDate.setFullYear(limitDate.getFullYear() + 5);

        while (true) {
          if (rule === "daily") {
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          } else if (rule === "weekly") {
            currentDate.setUTCDate(currentDate.getUTCDate() + 7);
          } else if (rule === "monthly") {
            currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
          } else if (rule === "yearly") {
            currentDate.setUTCFullYear(currentDate.getUTCFullYear() + 1);
          } else {
            break;
          }

          if (currentDate > limitDate) break;

          expandedEntries.push({
            ...baseEntry,
            id: `${baseEntry.id}-${currentDate.toISOString().split("T")[0]}`,
            date: currentDate.toISOString().split("T")[0],
          });
        }
      }
    });

    res.json(expandedEntries);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/", auth, async (req: Request, res: Response) => {
  const {
    text,
    date,
    moment,
    category,
    entry_type = "text",
    media_url = null,
    is_recurring = 0,
    recurrence_rule = null,
  } = req.body;
  try {
    await db.execute(
      "INSERT INTO calendar_entries (text, date, moment, category, entry_type, media_url, is_recurring, recurrence_rule, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        text,
        date,
        moment,
        category,
        entry_type,
        media_url,
        is_recurring,
        recurrence_rule,
        req.user.id,
      ],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.patch("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    text,
    date,
    moment,
    category,
    entry_type,
    media_url,
    is_recurring,
    recurrence_rule,
  } = req.body;
  try {
    const [existing]: any = await db.query(
      "SELECT * FROM calendar_entries WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Ressource non trouvée" });
    }

    const current = existing[0];

    await db.execute(
      "UPDATE calendar_entries SET text = ?, date = ?, moment = ?, category = ?, entry_type = ?, media_url = ?, is_recurring = ?, recurrence_rule = ? WHERE id = ? AND user_id = ?",
      [
        text !== undefined ? text : current.text,
        date !== undefined ? date : current.date,
        moment !== undefined ? moment : current.moment,
        category !== undefined ? category : current.category,
        entry_type !== undefined ? entry_type : current.entry_type,
        media_url !== undefined ? media_url : current.media_url,
        is_recurring !== undefined ? is_recurring : current.is_recurring,
        recurrence_rule !== undefined
          ? recurrence_rule
          : current.recurrence_rule,
        id,
        req.user.id,
      ],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result]: any = await db.execute(
      "DELETE FROM calendar_entries WHERE id = ? AND user_id = ?",
      [id, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Ressource non trouvée ou non autorisée" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
