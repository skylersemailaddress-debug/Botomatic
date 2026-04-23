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

export function mapClaimsToRole(claims: Record<string, any>): VerifiedIdentity["role"] {
  const roleClaim = claims["https://botomatic.dev/role"] || claims.role;
  if (roleClaim === "admin") return "admin";
  if (roleClaim === "reviewer") return "reviewer";
  return "operator";
}

export async function verifyOidcBearerToken(token: string, provider: OidcProviderConfig): Promise<VerifiedIdentity> {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid OIDC token format");
  }

  const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));

  if (payload.iss && payload.iss !== provider.issuerUrl) {
    throw new Error("OIDC issuer mismatch");
  }

  if (provider.audience && payload.aud && payload.aud !== provider.audience) {
    throw new Error("OIDC audience mismatch");
  }

  return {
    userId: payload.sub || payload.email || "unknown",
    email: payload.email,
    role: mapClaimsToRole(payload),
    issuer: payload.iss || provider.issuerUrl,
  };
}
