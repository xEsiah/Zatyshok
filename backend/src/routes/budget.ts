import { Router, Request, Response } from "express";
import auth from "../middlewares/auth.js";
import db from "../config/db.js";

const router = Router();

router.get("/categories", auth, async (req: Request, res: Response) => {
  try {
    const type = req.query.type || "expense";
    const [rows]: any = await db.query(
      "SELECT id, name, type FROM budget_categories WHERE user_id = ? AND type = ? ORDER BY name ASC",
      [req.user.id, type],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error fetching categories" });
  }
});

router.post("/categories", auth, async (req: Request, res: Response) => {
  const { name, type = "expense" } = req.body;
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Category name is required" });
  }
  const trimmedName = name.trim();

  try {
    const [existingCategories]: any = await db.query(
      "SELECT id FROM budget_categories WHERE user_id = ? AND name = ? AND type = ?",
      [req.user.id, trimmedName, type],
    );

    if (existingCategories.length > 0) {
      return res
        .status(409)
        .json({ error: "Category with this name already exists" });
    }

    await db.execute(
      "INSERT INTO budget_categories (name, user_id, type) VALUES (?, ?, ?)",
      [trimmedName, req.user.id, type],
    );
    res.status(201).json({ message: "Category added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error adding category" });
  }
});

router.get("/expenses", auth, async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : null;
  const type = req.query.type;
  let query =
    "SELECT id, amount, description, category_id, date, type FROM transactions WHERE user_id = ?";
  const params: any[] = [req.user.id];

  if (type) {
    query += " AND type = ?";
    params.push(type as string);
  }

  query += " ORDER BY date DESC, created_at DESC";

  if (limit && limit > 0) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  try {
    const [rows]: any = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error fetching expenses" });
  }
});

router.post("/expenses", auth, async (req: Request, res: Response) => {
  const { amount, description, category_id, date, type = "expense" } = req.body;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: "Valid amount is required" });
  }

  const parsedCategoryId = parseInt(category_id);
  if (isNaN(parsedCategoryId)) {
    return res.status(400).json({ error: "Category is required" });
  }

  const trimmedDescription = description ? String(description).trim() : "";
  if (trimmedDescription === "") {
    return res.status(400).json({ error: "Description is required" });
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Valid date is required" });
  }

  if (!amount || !category_id || !date) {
    return res
      .status(400)
      .json({ error: "Amount, category and date are required" });
  }
  try {
    await db.execute(
      "INSERT INTO transactions (amount, description, category_id, user_id, date, type) VALUES (?, ?, ?, ?, ?, ?)",
      [amount, description, category_id, req.user.id, date, type],
    );
    res.status(201).json({ message: "Expense added successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error adding expense" });
  }
});

export default router;
