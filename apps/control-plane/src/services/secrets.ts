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

const SECRET_REFS_KEY = "botomatic.secretReferences.v1";
const SECRET_EVENTS_KEY = "botomatic.secretAuditEvents.v1";

const CREDENTIAL_PROFILES: CredentialProfile[] = [
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

function nowIso(): string {
  return new Date().toISOString();
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }
  const raw = window.sessionStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!canUseStorage()) {
    return;
  }
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function createLocalMetadataStore(): SecretReferenceStore {
  return {
    list() {
      return readJson<SecretReference[]>(SECRET_REFS_KEY, []);
    },
    upsert(secretReference) {
      const all = readJson<SecretReference[]>(SECRET_REFS_KEY, []);
      const index = all.findIndex((item) => item.secretReferenceId === secretReference.secretReferenceId);
      if (index >= 0) {
        all[index] = secretReference;
      } else {
        all.push(secretReference);
      }
      writeJson(SECRET_REFS_KEY, all);
    },
    delete(secretReferenceId) {
      const all = readJson<SecretReference[]>(SECRET_REFS_KEY, []);
      writeJson(
        SECRET_REFS_KEY,
        all.filter((item) => item.secretReferenceId !== secretReferenceId)
      );
    },
    get(secretReferenceId) {
      const all = readJson<SecretReference[]>(SECRET_REFS_KEY, []);
      return all.find((item) => item.secretReferenceId === secretReferenceId) ?? null;
    },
  };
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function createSecretUri(providerId: ProviderId, environment: DeploymentEnvironment, keyName: string): string {
  return `secret://${providerId}/${environment}/${keyName}`;
}

function normalize(value: string): string {
  return value.trim();
}

function redactedFingerprint(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return `fp_${hash.toString(16).padStart(8, "0")}`;
}

function matchesHeuristic(keyName: string, value: string): boolean {
  const k = keyName.toLowerCase();
  const v = value.trim();
  if (v.length < 8) {
    return false;
  }
  if (k.includes("url")) {
    return /^https?:\/\//i.test(v);
  }
  if (k.includes("id") || k.includes("ref")) {
    return v.length >= 4;
  }
  if (k.includes("token") || k.includes("key") || k.includes("secret") || k.includes("password")) {
    return /[A-Za-z0-9_\-]{8,}/.test(v);
  }
  return true;
}

function requireValueAtInputTime(value: string) {
  if (!normalize(value)) {
    throw new Error("Secret value is required at input time.");
  }
}

function ensureKnownKey(providerId: ProviderId, keyName: string): void {
  const profile = CREDENTIAL_PROFILES.find((item) => item.providerId === providerId);
  if (!profile) {
    throw new Error(`Unknown provider profile: ${providerId}`);
  }
  const known = [...profile.requiredKeys, ...profile.optionalKeys];
  if (!known.includes(keyName)) {
    throw new Error(`Key ${keyName} is not declared in provider profile ${providerId}.`);
  }
}

function appendAuditEvent(event: SecretAuditEvent): void {
  const events = readJson<SecretAuditEvent[]>(SECRET_EVENTS_KEY, []);
  events.unshift(event);
  writeJson(SECRET_EVENTS_KEY, events.slice(0, 300));
}

function isRotationDue(reference: SecretReference): boolean {
  if (reference.status === "disabled") {
    return false;
  }
  const lastRotatedAt = Date.parse(reference.lastRotatedAt);
  if (Number.isNaN(lastRotatedAt)) {
    return true;
  }
  const dueAt = lastRotatedAt + reference.rotationPolicyDays * 24 * 60 * 60 * 1000;
  return Date.now() >= dueAt;
}

const metadataStore = createLocalMetadataStore();

export function listCredentialProfiles(): CredentialProfile[] {
  return CREDENTIAL_PROFILES;
}

export function listSecretReferences(): SecretReference[] {
  return metadataStore.list();
}

export function listSecretAuditEvents(): SecretAuditEvent[] {
  return readJson<SecretAuditEvent[]>(SECRET_EVENTS_KEY, []);
}

export function addSecretReference(input: SecretReferenceInput): SecretReference {
  requireValueAtInputTime(input.value);
  ensureKnownKey(input.providerId, input.keyName);
  if (!matchesHeuristic(input.keyName, input.value)) {
    throw new Error(`Input format heuristic failed for key ${input.keyName}.`);
  }

  const timestamp = nowIso();
  const reference: SecretReference = {
    secretReferenceId: createId("secret_ref"),
    providerId: input.providerId,
    environment: input.environment,
    keyName: input.keyName,
    displayName: input.displayName || input.keyName,
    requiredFor: input.requiredFor,
    status: "metadata_only",
    fingerprint: redactedFingerprint(input.value),
    lastUpdatedAt: timestamp,
    lastRotatedAt: timestamp,
    rotationPolicyDays: input.rotationPolicyDays ?? (CREDENTIAL_PROFILES.find((item) => item.providerId === input.providerId)?.rotationPolicyDays || 90),
    source: input.source ?? "local_metadata_backend",
    secretUri: createSecretUri(input.providerId, input.environment, input.keyName),
    secretValueStored: false,
  };

  metadataStore.upsert(reference);

  appendAuditEvent({
    eventId: createId("audit"),
    type: "secret_reference_created",
    secretReferenceId: reference.secretReferenceId,
    providerId: reference.providerId,
    environment: reference.environment,
    keyName: reference.keyName,
    occurredAt: timestamp,
    redacted: true,
    detail: "Secret reference created with metadata-only storage. Secret value discarded after fingerprinting.",
  });

  return reference;
}

export function updateSecretReference(secretReferenceId: string, update: SecretUpdateInput): SecretReference {
  const existing = metadataStore.get(secretReferenceId);
  if (!existing) {
    throw new Error("Secret reference not found.");
  }

  const next: SecretReference = {
    ...existing,
    displayName: update.displayName ?? existing.displayName,
    requiredFor: update.requiredFor ?? existing.requiredFor,
    rotationPolicyDays: update.rotationPolicyDays ?? existing.rotationPolicyDays,
    lastUpdatedAt: nowIso(),
  };

  metadataStore.upsert(next);
  appendAuditEvent({
    eventId: createId("audit"),
    type: "secret_reference_updated",
    secretReferenceId: next.secretReferenceId,
    providerId: next.providerId,
    environment: next.environment,
    keyName: next.keyName,
    occurredAt: next.lastUpdatedAt,
    redacted: true,
    detail: "Secret reference metadata updated. No secret value persisted.",
  });
  return next;
}

export function rotateSecretReference(secretReferenceId: string, value: string): SecretReference {
  const existing = metadataStore.get(secretReferenceId);
  if (!existing) {
    throw new Error("Secret reference not found.");
  }

  requireValueAtInputTime(value);
  if (!matchesHeuristic(existing.keyName, value)) {
    throw new Error(`Input format heuristic failed for key ${existing.keyName}.`);
  }

  const timestamp = nowIso();
  const next: SecretReference = {
    ...existing,
    fingerprint: redactedFingerprint(value),
    status: "metadata_only",
    lastRotatedAt: timestamp,
    lastUpdatedAt: timestamp,
    secretValueStored: false,
  };

  metadataStore.upsert(next);
  appendAuditEvent({
    eventId: createId("audit"),
    type: "secret_rotated",
    secretReferenceId: next.secretReferenceId,
    providerId: next.providerId,
    environment: next.environment,
    keyName: next.keyName,
    occurredAt: timestamp,
    redacted: true,
    detail: "Secret rotated in metadata-only mode. New fingerprint stored, value discarded.",
  });
  return next;
}

export function disableSecretReference(secretReferenceId: string): SecretReference {
  const existing = metadataStore.get(secretReferenceId);
  if (!existing) {
    throw new Error("Secret reference not found.");
  }

  const next: SecretReference = {
    ...existing,
    status: "disabled",
    lastUpdatedAt: nowIso(),
  };
  metadataStore.upsert(next);

  appendAuditEvent({
    eventId: createId("audit"),
    type: "secret_disabled",
    secretReferenceId: next.secretReferenceId,
    providerId: next.providerId,
    environment: next.environment,
    keyName: next.keyName,
    occurredAt: next.lastUpdatedAt,
    redacted: true,
    detail: "Secret reference disabled.",
  });

  return next;
}

export function deleteSecretReference(secretReferenceId: string): void {
  const existing = metadataStore.get(secretReferenceId);
  metadataStore.delete(secretReferenceId);
  appendAuditEvent({
    eventId: createId("audit"),
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

export function listMissingRequiredSecrets(environment: DeploymentEnvironment): Array<{ providerId: ProviderId; keyName: string; environment: DeploymentEnvironment }> {
  const refs = metadataStore
    .list()
    .filter((item) => item.environment === environment && item.status !== "disabled");
  const missing: Array<{ providerId: ProviderId; keyName: string; environment: DeploymentEnvironment }> = [];

  for (const profile of CREDENTIAL_PROFILES) {
    if (!profile.environmentsSupported.includes(environment)) {
      continue;
    }

    for (const keyName of profile.requiredKeys) {
      const present = refs.some((item) => item.providerId === profile.providerId && item.keyName === keyName);
      if (!present) {
        missing.push({
          providerId: profile.providerId,
          keyName,
          environment,
        });
      }
    }
  }

  return missing;
}

export function buildDeploymentSecretPreflight(environment: DeploymentEnvironment): DeploymentSecretPreflight {
  const references = metadataStore
    .list()
    .filter((item) => item.environment === environment && item.status !== "disabled");
  const missing = listMissingRequiredSecrets(environment);
  const rotationDueCount = references.filter(isRotationDue).length;

  const result: DeploymentSecretPreflight = {
    status: missing.length === 0 ? "ready" : "blocked_missing_required_secrets",
    environment,
    requiredSecretCount: CREDENTIAL_PROFILES
      .filter((profile) => profile.environmentsSupported.includes(environment))
      .reduce((sum, profile) => sum + profile.requiredKeys.length, 0),
    configuredSecretCount: references.length,
    missingSecretCount: missing.length,
    rotationDueCount,
    blockedByMissingSecrets: missing.length > 0,
    explicitApprovalRequired: true,
    liveDeploymentBlockedByDefault: true,
    noPlaintextSecretValuesStored: true,
    configuredSecrets: references.map((item) => ({
      providerId: item.providerId,
      keyName: item.keyName,
      secretUri: item.secretUri,
      fingerprint: item.fingerprint,
      status: item.status,
    })),
    missingRequiredSecrets: missing,
  };

  appendAuditEvent({
    eventId: createId("audit"),
    type: "preflight_checked",
    environment,
    occurredAt: nowIso(),
    redacted: true,
    detail: `Deployment preflight generated for ${environment} with ${missing.length} missing required secret references.`,
  });

  return result;
}
