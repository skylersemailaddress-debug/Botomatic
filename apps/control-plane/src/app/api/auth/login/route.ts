import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SESSION_COOKIE = "botomatic_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getUiSecret(): string {
  return (process.env.BOTOMATIC_UI_PASSWORD || process.env.API_AUTH_TOKEN || "").trim();
}

function makeSessionToken(secret: string): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = String(body.password ?? "").trim();
  const secret = getUiSecret();

  if (!secret) {
    return NextResponse.json({ error: "UI password not configured — set BOTOMATIC_UI_PASSWORD" }, { status: 503 });
  }

  const passwordBuf = Buffer.from(password);
  const secretBuf = Buffer.from(secret);
  const match =
    passwordBuf.length === secretBuf.length &&
    crypto.timingSafeEqual(passwordBuf, secretBuf);

  if (!match) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = makeSessionToken(secret);
  const next = String(body.next ?? "/").replace(/^\/\/+/, "/");

  const response = NextResponse.json({ ok: true, redirect: next });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    path: "/",
  });
  return response;
}

export async function DELETE(_req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
