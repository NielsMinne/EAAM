import { Request, Response } from "express";
import dotenv from "dotenv";
dotenv.config();

const ADMIN_COOKIE_NAME = "eaamAdminAuth";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "eaam-admin";

const readCookieValue = (cookieHeader: string | undefined, cookieName: string): string | null => {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === cookieName) {
      return rawValue.join("=");
    }
  }

  return null;
};

export const hasAdminAuth = (req: Request): boolean => {
  const value = readCookieValue(req.headers.cookie, ADMIN_COOKIE_NAME);
  return value === "1";
};

export const isValidAdminPassword = (password: string): boolean => password === ADMIN_PASSWORD;

export const setAdminAuthCookie = (res: Response): void => {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=1; Max-Age=28800; Path=/; SameSite=Lax; HttpOnly`
  );
};
