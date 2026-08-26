import { Request } from "express";

export interface UserPayload {
  id: number;
  username: string;
  email: string;
  profile_picture: string | null;
  role: "him" | "her" | "art" | "default" | "artFR";
  isApproved: number;
  spotify_access_token?: string;
  spotify_refresh_token?: string;
  created_at?: string;
}

declare global {
  namespace Express {
    interface Request {
      user: UserPayload;
    }
  }
}

export {};
