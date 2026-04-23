import crypto from "crypto";

export type OidcProviderConfig = {
  issuerUrl: string;
  clientId: string;
  audience?: string;
};

export type VerifiedIdentity = {
  userId: string;
  email?: string;
  role: "operator" | "reviewer" | "admin";
  issuer: string;
};

type JwkKey = {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
};

const jwksCache = new Map<string, { fetchedAt: number; keys: JwkKey[] }>();
const JWKS_TTL_MS = 5 * 60 * 1000;

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64");
}

function decodeJwtPart<T = any>(value: string): T {
  return JSON.parse(base64UrlToBuffer(value).toString("utf8"));
}

export function mapClaimsToRole(claims: Record<string, any>): VerifiedIdentity["role"] {
  const primaryRoleClaim = claims["https://botomatic.dev/role"];
  if (primaryRoleClaim === "admin") return "admin";
  if (primaryRoleClaim === "reviewer") return "reviewer";
  if (primaryRoleClaim === "operator") return "operator";
  if (typeof primaryRoleClaim !== "undefined") return "operator";

  const fallbackRoleClaim = claims.role;
  if (fallbackRoleClaim === "admin") return "admin";
  if (fallbackRoleClaim === "reviewer") return "reviewer";
  if (fallbackRoleClaim === "operator") return "operator";
  return "operator";
}

function getJwksUrl(provider: OidcProviderConfig): string {
  return `${provider.issuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`;
}

async function fetchJwks(provider: OidcProviderConfig): Promise<JwkKey[]> {
  const url = getJwksUrl(provider);
  const cached = jwksCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const json = (await response.json()) as { keys?: JwkKey[] };
  const keys = Array.isArray(json.keys) ? json.keys : [];
  jwksCache.set(url, { fetchedAt: Date.now(), keys });
  return keys;
}

function jwkToPublicKey(jwk: JwkKey): crypto.KeyObject {
  if (jwk.kty !== "RSA" || !jwk.n || !jwk.e) {
    throw new Error("Unsupported JWK key type");
  }

  return crypto.createPublicKey({
    key: {
      kty: "RSA",
      n: jwk.n,
      e: jwk.e,
    },
    format: "jwk",
  });
}

function verifyJwtSignature(token: string, jwk: JwkKey): Record<string, any> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const publicKey = jwkToPublicKey(jwk);
  const signature = base64UrlToBuffer(encodedSignature);
  const valid = verifier.verify(publicKey, signature);
  if (!valid) {
    throw new Error("OIDC signature verification failed");
  }

  return decodeJwtPart<Record<string, any>>(encodedPayload);
}

function validateClaims(payload: Record<string, any>, provider: OidcProviderConfig) {
  if (payload.iss && payload.iss !== provider.issuerUrl) {
    throw new Error("OIDC issuer mismatch");
  }

  if (provider.audience) {
    const aud = payload.aud;
    const matches = Array.isArray(aud) ? aud.includes(provider.audience) : aud === provider.audience;
    if (!matches) {
      throw new Error("OIDC audience mismatch");
    }
  }

  if (payload.exp && Date.now() >= Number(payload.exp) * 1000) {
    throw new Error("OIDC token expired");
  }
}

export async function verifyOidcBearerToken(token: string, provider: OidcProviderConfig): Promise<VerifiedIdentity> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid OIDC token format");
  }

  const header = decodeJwtPart<Record<string, any>>(parts[0]);
  const kid = header.kid;
  if (!kid) {
    throw new Error("OIDC token missing kid");
  }

  const keys = await fetchJwks(provider);
  const jwk = keys.find((key) => key.kid === kid);
  if (!jwk) {
    throw new Error("OIDC signing key not found");
  }

  const payload = verifyJwtSignature(token, jwk);
  validateClaims(payload, provider);

  return {
    userId: payload.sub || payload.email || "unknown",
    email: payload.email,
    role: mapClaimsToRole(payload),
    issuer: payload.iss || provider.issuerUrl,
  };
}
