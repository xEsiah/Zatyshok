import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { UserPayload } from "../types/index.js";

const MIN_SUPPORTED_VERSION = "1.1.0";

const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const appToken = req.headers["x-app-token"];
  const clientVersion = req.headers["x-app-version"] as string;
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!appToken || appToken !== process.env.API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized application." });
  }

  if (!clientVersion || clientVersion < MIN_SUPPORTED_VERSION) {
    return res.status(426).json({ error: "Version obsolete." });
  }

  if (!token) return res.status(401).json({ error: "Missing session." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
    };

    const [rows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [
      decoded.id,
    ]);

    if (rows.length === 0) {
      return res
        .status(403)
        .json({ error: "User not found or session expired." });
    }

    req.user = rows[0] as UserPayload;
    next();
  } catch (err) {
    console.error("[AUTH ERROR]", err);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

export default authenticateToken;
