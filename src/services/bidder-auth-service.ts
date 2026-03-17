import { Request, Response } from "express";

const BIDDER_COOKIE_NAME = "eaamRegistration";
const COOKIE_MAX_AGE_SECONDS = 172800;

export interface BidderCookiePayload {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

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

const parseBidderCookie = (value: string | null): BidderCookiePayload | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (!parsed?.firstName || !parsed?.lastName || !parsed?.email) {
      return null;
    }

    return parsed as BidderCookiePayload;
  } catch {
    return null;
  }
};

export const hasBidderRegistration = (req: Request): boolean => {
  const rawCookieValue = readCookieValue(req.headers.cookie, BIDDER_COOKIE_NAME);
  return Boolean(parseBidderCookie(rawCookieValue));
};

export const getBidderRegistration = (req: Request): BidderCookiePayload | null => {
  const rawCookieValue = readCookieValue(req.headers.cookie, BIDDER_COOKIE_NAME);
  return parseBidderCookie(rawCookieValue);
};

export const setBidderRegistrationCookie = (
  res: Response,
  payload: Omit<BidderCookiePayload, "createdAt"> | BidderCookiePayload
): void => {
  const cookiePayload: BidderCookiePayload = {
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    createdAt: "createdAt" in payload ? payload.createdAt : new Date().toISOString()
  };

  res.setHeader(
    "Set-Cookie",
    `${BIDDER_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(cookiePayload))}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`
  );
};
