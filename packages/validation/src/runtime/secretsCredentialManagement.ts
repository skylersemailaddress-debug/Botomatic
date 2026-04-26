import crypto from "crypto";

export type DeploymentEnvironment = "dev" | "staging" | "prod";

export type ProviderId =
  | "vercel"
  | "supabase"
  | "github"
  | "openai"
  | "anthropic"
  | "stripe"
  | "twilio"
  | "sendgrid"
  | "roblox"
  | "steam"
  | "generic_http_api";

export type SecretReferenceStatus = "metadata_only" | "disabled";

export type SecretReferenceSource = "local_metadata_backend" | "external_secret_manager" | "provider_env_sync";

export type SecretReference = {
  secretReferenceId: string;
  providerId: ProviderId;
  environment: DeploymentEnvironment;
  keyName: string;
  displayName: string;
  requiredFor: string[];
  status: SecretReferenceStatus;
  fingerprint: string;
  lastUpdatedAt: string;
  lastRotatedAt: string;
  rotationPolicyDays: number;
  source: SecretReferenceSource;
  secretUri: string;
  secretValueStored: false;
};

export type ValidationMode = "metadata_only_non_executing" | "external_manager_required";

export type CredentialProfile = {
  providerId: ProviderId;
  displayName: string;
  requiredKeys: string[];
  optionalKeys: string[];
  validationMode: ValidationMode;
  rotationPolicyDays: number;
  environmentsSupported: DeploymentEnvironment[];
  deploymentPaths: string[];
};

export type SecretReferenceInput = {
  providerId: ProviderId;
  environment: DeploymentEnvironment;
  keyName: string;
  displayName: string;
  requiredFor: string[];
  value: string;
  rotationPolicyDays?: number;
  source?: SecretReferenceSource;
};

export type SecretUpdateInput = {
  displayName?: string;
  requiredFor?: string[];
  rotationPolicyDays?: number;
};

export type SecretAuditEventType =
  | "secret_reference_created"
  | "secret_reference_updated"
  | "secret_rotated"
  | "secret_disabled"
  | "secret_deleted"
  | "preflight_checked";

export type SecretAuditEvent = {
  eventId: string;
  type: SecretAuditEventType;
  secretReferenceId?: string;
  providerId?: ProviderId;
  environment?: DeploymentEnvironment;
  keyName?: string;
  occurredAt: string;
  redacted: true;
  detail: string;
};

export type DeploymentSecretPreflight = {
  status: "ready" | "blocked_missing_required_secrets";
  environment: DeploymentEnvironment;
  requiredSecretCount: number;
  configuredSecretCount: number;
  missingSecretCount: number;
  rotationDueCount: number;
  blockedByMissingSecrets: boolean;
  explicitApprovalRequired: true;
  liveDeploymentBlockedByDefault: true;
  noPlaintextSecretValuesStored: true;
  configuredSecrets: Array<{
    providerId: ProviderId;
    keyName: string;
    secretUri: string;
    fingerprint: string;
    status: SecretReferenceStatus;
  }>;
  missingRequiredSecrets: Array<{
    providerId: ProviderId;
    keyName: string;
    environment: DeploymentEnvironment;
  }>;
};

export type SecretReferenceStore = {
  list(): SecretReference[];
  upsert(secretReference: SecretReference): void;
  delete(secretReferenceId: string): void;
  get(secretReferenceId: string): SecretReference | null;
};

export type ExternalSecretManagerAdapter = {
  adapterId: string;
  storeSecret(input: { providerId: ProviderId; environment: DeploymentEnvironment; keyName: string; value: string }): Promise<{ secretUri: string; fingerprint: string }>;
  rotateSecret(input: { secretUri: string; value: string }): Promise<{ fingerprint: string }>;
};

export type ProviderEnvSyncAdapter = {
  adapterId: string;
  syncSecretReference(input: { providerId: ProviderId; environment: DeploymentEnvironment; keyName: string; secretUri: string }): Promise<{ synced: boolean; reason?: string }>;
};

export const CREDENTIAL_PROFILES: CredentialProfile[] = [
  {
    providerId: "vercel",
    displayName: "Vercel",
    requiredKeys: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    optionalKeys: ["VERCEL_TEAM_ID"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 90,
    environmentsSupported: ["dev", "staging", "prod"],
    deploymentPaths: ["web_saas_app", "marketing_website"],
  },
  {
    providerId: "supabase",
    displayName: "Supabase",
    requiredKeys: ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_REF", "SUPABASE_DB_PASSWORD"],
    optionalKeys: ["SUPABASE_SERVICE_ROLE_KEY"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 90,
    environmentsSupported: ["dev", "staging", "prod"],
    deploymentPaths: ["api_service", "web_saas_app"],
  },
  {
    providerId: "github",
    displayName: "GitHub",
    requiredKeys: ["GITHUB_TOKEN"],
    optionalKeys: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 120,
    environmentsSupported: ["dev", "staging", "prod"],
    deploymentPaths: ["dirty_repo_completion", "marketing_website"],
  },
  {
    providerId: "openai",
    displayName: "OpenAI",
    requiredKeys: ["OPENAI_API_KEY"],
    optionalKeys: ["OPENAI_ORG_ID", "OPENAI_PROJECT_ID"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 60,
    environmentsSupported: ["dev", "staging", "prod"],
    deploymentPaths: ["ai_agent"],
  },
  {
    providerId: "anthropic",
    displayName: "Anthropic",
    requiredKeys: ["ANTHROPIC_API_KEY"],
    optionalKeys: [],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 60,
    environmentsSupported: ["dev", "staging", "prod"],
    deploymentPaths: ["ai_agent"],
  },
  {
    providerId: "stripe",
    displayName: "Stripe",
    requiredKeys: ["STRIPE_SECRET_KEY"],
    optionalKeys: ["STRIPE_WEBHOOK_SECRET"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 90,
    environmentsSupported: ["staging", "prod"],
    deploymentPaths: ["web_saas_app", "api_service"],
  },
  {
    providerId: "twilio",
    displayName: "Twilio",
    requiredKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
    optionalKeys: ["TWILIO_MESSAGING_SERVICE_SID"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 90,
    environmentsSupported: ["staging", "prod"],
    deploymentPaths: ["bot", "api_service"],
  },
  {
    providerId: "sendgrid",
    displayName: "SendGrid",
    requiredKeys: ["SENDGRID_API_KEY"],
    optionalKeys: ["SENDGRID_FROM_EMAIL"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 90,
    environmentsSupported: ["staging", "prod"],
    deploymentPaths: ["web_saas_app", "marketing_website"],
  },
  {
    providerId: "roblox",
    displayName: "Roblox",
    requiredKeys: ["ROBLOX_OPEN_CLOUD_API_KEY"],
    optionalKeys: ["ROBLOX_UNIVERSE_ID"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 120,
    environmentsSupported: ["staging", "prod"],
    deploymentPaths: ["game"],
  },
  {
    providerId: "steam",
    displayName: "Steam",
    requiredKeys: ["STEAMWORKS_PUBLISH_KEY"],
    optionalKeys: ["STEAM_APP_ID"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 120,
    environmentsSupported: ["staging", "prod"],
    deploymentPaths: ["game"],
  },
  {
    providerId: "generic_http_api",
    displayName: "Generic HTTP API",
    requiredKeys: ["HTTP_API_KEY"],
    optionalKeys: ["HTTP_API_BASE_URL", "HTTP_API_BEARER_TOKEN"],
    validationMode: "metadata_only_non_executing",
    rotationPolicyDays: 90,
    environmentsSupported: ["dev", "staging", "prod"],
    deploymentPaths: ["api_service", "bot", "ai_agent"],
  },
];

export function createInMemorySecretStore(initial: SecretReference[] = []): SecretReferenceStore {
  const refs = [...initial];
  return {
    list() {
      return [...refs];
    },
    upsert(secretReference: SecretReference) {
      const index = refs.findIndex((item) => item.secretReferenceId === secretReference.secretReferenceId);
      if (index >= 0) {
        refs[index] = secretReference;
      } else {
        refs.push(secretReference);
      }
    },
    delete(secretReferenceId: string) {
      const index = refs.findIndex((item) => item.secretReferenceId === secretReferenceId);
      if (index >= 0) {
        refs.splice(index, 1);
      }
    },
    get(secretReferenceId: string) {
      return refs.find((item) => item.secretReferenceId === secretReferenceId) ?? null;
    },
  };
}

export function listCredentialProfiles(): CredentialProfile[] {
  return CREDENTIAL_PROFILES;
}

export function buildSecretUri(providerId: ProviderId, environment: DeploymentEnvironment, keyName: string): string {
  return `secret://${providerId}/${environment}/${keyName}`;
}

export function generateFingerprint(value: string): string {
  return `fp_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

export function validateSecretInput(keyName: string, value: string): { valid: boolean; reason?: string } {
  if (!value.trim()) {
    return { valid: false, reason: "value_missing" };
  }

  if (value.trim().length < 8) {
    return { valid: false, reason: "value_too_short" };
  }

  const key = keyName.toLowerCase();
  const trimmed = value.trim();

  if (key.includes("url") && !/^https?:\/\//i.test(trimmed)) {
    return { valid: false, reason: "url_format_invalid" };
  }

  if ((key.includes("key") || key.includes("token") || key.includes("secret") || key.includes("password")) && !/[A-Za-z0-9_\-]{8,}/.test(trimmed)) {
    return { valid: false, reason: "token_heuristic_failed" };
  }

  return { valid: true };
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function isKnownProfileKey(providerId: ProviderId, keyName: string): boolean {
  const profile = CREDENTIAL_PROFILES.find((item) => item.providerId === providerId);
  if (!profile) return false;
  return [...profile.requiredKeys, ...profile.optionalKeys].includes(keyName);
}

export function addSecretReference(
  store: SecretReferenceStore,
  auditEvents: SecretAuditEvent[],
  input: SecretReferenceInput
): SecretReference {
  if (!isKnownProfileKey(input.providerId, input.keyName)) {
    throw new Error(`unknown_profile_key:${input.providerId}/${input.keyName}`);
  }

  const validation = validateSecretInput(input.keyName, input.value);
  if (!validation.valid) {
    throw new Error(`invalid_secret_input:${validation.reason}`);
  }

  const ts = nowIso();
  const profile = CREDENTIAL_PROFILES.find((item) => item.providerId === input.providerId);
  const ref: SecretReference = {
    secretReferenceId: newId("secret_ref"),
    providerId: input.providerId,
    environment: input.environment,
    keyName: input.keyName,
    displayName: input.displayName || input.keyName,
    requiredFor: input.requiredFor,
    status: "metadata_only",
    fingerprint: generateFingerprint(input.value),
    lastUpdatedAt: ts,
    lastRotatedAt: ts,
    rotationPolicyDays: input.rotationPolicyDays ?? profile?.rotationPolicyDays ?? 90,
    source: input.source ?? "local_metadata_backend",
    secretUri: buildSecretUri(input.providerId, input.environment, input.keyName),
    secretValueStored: false,
  };

  store.upsert(ref);

  auditEvents.push({
    eventId: newId("audit"),
    type: "secret_reference_created",
    secretReferenceId: ref.secretReferenceId,
    providerId: ref.providerId,
    environment: ref.environment,
    keyName: ref.keyName,
    occurredAt: ts,
    redacted: true,
    detail: "Secret reference created with metadata-only storage and redacted audit record.",
  });

  return ref;
}

export function updateSecretReference(
  store: SecretReferenceStore,
  auditEvents: SecretAuditEvent[],
  secretReferenceId: string,
  input: SecretUpdateInput
): SecretReference {
  const existing = store.get(secretReferenceId);
  if (!existing) {
    throw new Error("secret_reference_missing");
  }

  const updated: SecretReference = {
    ...existing,
    displayName: input.displayName ?? existing.displayName,
    requiredFor: input.requiredFor ?? existing.requiredFor,
    rotationPolicyDays: input.rotationPolicyDays ?? existing.rotationPolicyDays,
    lastUpdatedAt: nowIso(),
  };
  store.upsert(updated);

  auditEvents.push({
    eventId: newId("audit"),
    type: "secret_reference_updated",
    secretReferenceId: updated.secretReferenceId,
    providerId: updated.providerId,
    environment: updated.environment,
    keyName: updated.keyName,
    occurredAt: updated.lastUpdatedAt,
    redacted: true,
    detail: "Secret reference metadata updated. Secret value remains discarded.",
  });

  return updated;
}

export function rotateSecretReference(
  store: SecretReferenceStore,
  auditEvents: SecretAuditEvent[],
  secretReferenceId: string,
  value: string
): SecretReference {
  const existing = store.get(secretReferenceId);
  if (!existing) {
    throw new Error("secret_reference_missing");
  }

  const validation = validateSecretInput(existing.keyName, value);
  if (!validation.valid) {
    throw new Error(`invalid_secret_input:${validation.reason}`);
  }

  const ts = nowIso();
  const updated: SecretReference = {
    ...existing,
    fingerprint: generateFingerprint(value),
    status: "metadata_only",
    lastUpdatedAt: ts,
    lastRotatedAt: ts,
    secretValueStored: false,
  };
  store.upsert(updated);

  auditEvents.push({
    eventId: newId("audit"),
    type: "secret_rotated",
    secretReferenceId: updated.secretReferenceId,
    providerId: updated.providerId,
    environment: updated.environment,
    keyName: updated.keyName,
    occurredAt: ts,
    redacted: true,
    detail: "Secret reference rotated with fingerprint refresh and no plaintext storage.",
  });

  return updated;
}

export function disableSecretReference(
  store: SecretReferenceStore,
  auditEvents: SecretAuditEvent[],
  secretReferenceId: string
): SecretReference {
  const existing = store.get(secretReferenceId);
  if (!existing) {
    throw new Error("secret_reference_missing");
  }

  const updated: SecretReference = {
    ...existing,
    status: "disabled",
    lastUpdatedAt: nowIso(),
  };
  store.upsert(updated);

  auditEvents.push({
    eventId: newId("audit"),
    type: "secret_disabled",
    secretReferenceId: updated.secretReferenceId,
    providerId: updated.providerId,
    environment: updated.environment,
    keyName: updated.keyName,
    occurredAt: updated.lastUpdatedAt,
    redacted: true,
    detail: "Secret reference disabled.",
  });

  return updated;
}

export function deleteSecretReference(
  store: SecretReferenceStore,
  auditEvents: SecretAuditEvent[],
  secretReferenceId: string
): void {
  const existing = store.get(secretReferenceId);
  store.delete(secretReferenceId);

  auditEvents.push({
    eventId: newId("audit"),
    type: "secret_deleted",
    secretReferenceId,
    providerId: existing?.providerId,
    environment: existing?.environment,
    keyName: existing?.keyName,
    occurredAt: nowIso(),
    redacted: true,
    detail: "Secret reference deleted.",
  });
}

function rotationDue(ref: SecretReference): boolean {
  if (ref.status === "disabled") {
    return false;
  }
  const rotated = Date.parse(ref.lastRotatedAt);
  if (Number.isNaN(rotated)) {
    return true;
  }
  const dueAt = rotated + ref.rotationPolicyDays * 24 * 60 * 60 * 1000;
  return Date.now() >= dueAt;
}

export function listMissingRequiredSecrets(store: SecretReferenceStore, environment: DeploymentEnvironment): Array<{ providerId: ProviderId; keyName: string; environment: DeploymentEnvironment }> {
  const refs = store.list().filter((item) => item.environment === environment && item.status !== "disabled");
  const missing: Array<{ providerId: ProviderId; keyName: string; environment: DeploymentEnvironment }> = [];

  for (const profile of CREDENTIAL_PROFILES) {
    if (!profile.environmentsSupported.includes(environment)) {
      continue;
    }

    for (const keyName of profile.requiredKeys) {
      const present = refs.some((item) => item.providerId === profile.providerId && item.keyName === keyName);
      if (!present) {
        missing.push({ providerId: profile.providerId, keyName, environment });
      }
    }
  }

  return missing;
}

export function buildDeploymentSecretPreflight(
  store: SecretReferenceStore,
  auditEvents: SecretAuditEvent[],
  environment: DeploymentEnvironment
): DeploymentSecretPreflight {
  const refs = store.list().filter((item) => item.environment === environment && item.status !== "disabled");
  const missing = listMissingRequiredSecrets(store, environment);

  const preflight: DeploymentSecretPreflight = {
    status: missing.length === 0 ? "ready" : "blocked_missing_required_secrets",
    environment,
    requiredSecretCount: CREDENTIAL_PROFILES
      .filter((item) => item.environmentsSupported.includes(environment))
      .reduce((sum, profile) => sum + profile.requiredKeys.length, 0),
    configuredSecretCount: refs.length,
    missingSecretCount: missing.length,
    rotationDueCount: refs.filter(rotationDue).length,
    blockedByMissingSecrets: missing.length > 0,
    explicitApprovalRequired: true,
    liveDeploymentBlockedByDefault: true,
    noPlaintextSecretValuesStored: true,
    configuredSecrets: refs.map((item) => ({
      providerId: item.providerId,
      keyName: item.keyName,
      secretUri: item.secretUri,
      fingerprint: item.fingerprint,
      status: item.status,
    })),
    missingRequiredSecrets: missing,
  };

  auditEvents.push({
    eventId: newId("audit"),
    type: "preflight_checked",
    environment,
    occurredAt: nowIso(),
    redacted: true,
    detail: `Deployment preflight checked for ${environment} (${preflight.missingSecretCount} missing required secret references).`,
  });

  return preflight;
}
