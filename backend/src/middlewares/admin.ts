import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { UserPayload } from "../types/index.js";

const ADMIN_COOKIE = "zatyshok_admin";
const PENDING_2FA_COOKIE = "zatyshok_admin_2fa";
const ADMIN_SESSION_HOURS = 12;
const PENDING_2FA_MINUTES = 10;
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export const clientKey = (req: Request): string => {
  return (
    (req.headers["cf-connecting-ip"] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    "unknown"
  );
};

export const isLoginBlocked = (key: string): boolean => {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
};

export const recordLoginFailure = (key: string): void => {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  entry.count += 1;
};

export const clearLoginFailures = (key: string): void => {
  loginAttempts.delete(key);
};

export const parseCookies = (req: Request): Record<string, string> => {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
};

const appendCookie = (res: Response, cookie: string): void => {
  res.append("Set-Cookie", cookie);
};

export const setAdminCookie = (res: Response, token: string): void => {
  const host = (res.req.headers.host || "").split(":")[0];
  const secure = host !== "localhost" && host !== "127.0.0.1";
  const maxAge = ADMIN_SESSION_HOURS * 3600;
  appendCookie(
    res,
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge};${secure ? " Secure;" : ""}`,
  );
};

export const clearAdminCookie = (res: Response): void => {
  appendCookie(res, `${ADMIN_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;`);
};

export const setPending2faCookie = (res: Response, token: string): void => {
  const host = (res.req.headers.host || "").split(":")[0];
  const secure = host !== "localhost" && host !== "127.0.0.1";
  const maxAge = PENDING_2FA_MINUTES * 60;
  appendCookie(
    res,
    `${PENDING_2FA_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge};${secure ? " Secure;" : ""}`,
  );
};

export const clearPending2faCookie = (res: Response): void => {
  appendCookie(res, `${PENDING_2FA_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0;`);
};

export const getPending2faId = (req: Request): number | null => {
  const token = parseCookies(req)[PENDING_2FA_COOKIE];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      purpose?: string;
    };
    return decoded.purpose === "2fa" ? decoded.id : null;
  } catch {
    return null;
  }
};

export const getAdminUser = async (req: Request): Promise<UserPayload | null> => {
  const token = parseCookies(req)[ADMIN_COOKIE];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      purpose?: string;
    };
    if (decoded.purpose !== "admin") return null;
    const [rows]: any = await db.execute("SELECT * FROM users WHERE id = ?", [
      decoded.id,
    ]);
    const user = rows[0];
    if (!user || user.is_admin !== 1 || user.isApproved !== 1) return null;
    return user as UserPayload;
  } catch {
    return null;
  }
};

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = await getAdminUser(req);
  if (!user) {
    return res.status(401).json({ error: "Admin session required." });
  }
  req.user = user;
  next();
};
