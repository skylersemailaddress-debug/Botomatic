import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeBaseUrl(value: string | undefined): string {
  const raw = (value || "").trim();
  if (!raw) return "http://127.0.0.1:3001";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function getProxyBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.BOTOMATIC_API_PROXY_BASE_URL ||
      process.env.BOTOMATIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.BOTOMATIC_API_URL,
  );
}

export async function GET() {
  try {
    const upstream = await fetch(`${getProxyBaseUrl()}/health`, { redirect: "manual" });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", service: "control-plane", error: String(error?.message || error) },
      { status: 503 },
    );
  }
}
