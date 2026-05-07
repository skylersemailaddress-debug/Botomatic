import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders, blockCrossSiteMutation } from "./server/security";

const SESSION_COOKIE = "botomatic_session";

function getUiSecret(): string {
  return (process.env.BOTOMATIC_UI_PASSWORD || process.env.API_AUTH_TOKEN || "").trim();
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function isValidSession(token: string, secret: string): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(payload, secret);
  if (expected !== sig) return false;
  try {
    // payload is base64url (no padding, - and _ instead of + and /).
    // atob() requires standard base64 — convert before parsing.
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded));
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow: login page, auth API, static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  const secret = getUiSecret();
  // If no password is configured (e.g. local dev without env), allow all access.
  if (!secret) return applySecurityHeaders(NextResponse.next());

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const csrfBlocked = blockCrossSiteMutation(req);
  if (csrfBlocked) return csrfBlocked;

  if (await isValidSession(sessionToken, secret)) return applySecurityHeaders(NextResponse.next());

  const loginUrl = new URL("/login", req.url);
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
  return applySecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
