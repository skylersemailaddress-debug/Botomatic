/**
 * Credentialed Deployment Readiness — Schemas and Types
 *
 * Defines the machine-readable shapes for:
 *  - credential requirement manifests per domain
 *  - deployment approval gate model
 *  - provider adapter interface
 *  - secret handling policy
 *  - dry-run vs live deployment separation
 *
 * NO secrets are stored here. All credential fields describe what is needed,
 * not what is present.
 */

// ---------------------------------------------------------------------------
// Credential requirement classification
// ---------------------------------------------------------------------------

export type CredentialClass =
  | "api_key"
  | "oauth_token"
  | "service_account"
  | "signing_cert"
  | "ssh_key"
  | "webhook_secret"
  | "environment_variable"
  | "platform_account";

export type CredentialSensitivity = "secret" | "config" | "public";

export type CredentialRequirement = {
  /** Machine-readable identifier for the credential, e.g. VERCEL_TOKEN */
  name: string;
  /** Human-readable description of what this credential grants */
  description: string;
  /** Credential type classification */
  credentialClass: CredentialClass;
  /** Secret/config/public sensitivity */
  sensitivity: CredentialSensitivity;
  /** Whether deployment is blocked without this credential */
  required: boolean;
  /** Where this credential is obtained (no actual values) */
  obtainedFrom: string;
  /** Whether this credential must never be committed to source control */
  mustNotBeCommitted: boolean;
};

// ---------------------------------------------------------------------------
// Deployment approval gate model
// ---------------------------------------------------------------------------

export type ApprovalGateStatus =
  | "not_requested"
  | "pending_user_approval"
  | "approved_by_user"
  | "blocked_no_credentials"
  | "blocked_default";

export type ApprovalGate = {
  /** Current status of the deployment approval gate */
  status: ApprovalGateStatus;
  /** Whether live deployment is blocked by default (must be true in this proof) */
  liveDeploymentBlockedByDefault: boolean;
  /** Explicit reason live deployment is not executed */
  blockedReason: string;
  /** What a user must supply to unblock — no actual values */
  requiredUserActions: string[];
  /** Whether the approval was simulated or real — must not be "real" in proof */
  approvalSimulated: true;
};

// ---------------------------------------------------------------------------
// Deployment target provider adapter interface
// ---------------------------------------------------------------------------

export type ProviderAdapterId =
  | "vercel"
  | "supabase"
  | "github"
  | "app_store_connect"
  | "play_console"
  | "bot_platform"
  | "game_distribution"
  | "container_registry"
  | "static_hosting"
  | "agent_runtime"
  | "git_hosting";

export type ProviderAdapter = {
  /** Provider identifier */
  provider: ProviderAdapterId;
  /** Human-readable deployment target description */
  deploymentTarget: string;
  /** CLI/API command that would be executed — not executed in proof */
  commandTemplate: string;
  /** Environment variables the command reads from — names only, no values */
  requiredEnvVarNames: string[];
  /** Whether this provider adapter would perform a real deployment if credentials were present */
  executesLiveDeployment: boolean;
  /** Preflight check that can run without credentials (structural only) */
  preflightCheck: string;
  /** Whether the preflight check was executed */
  preflightExecuted: boolean;
  /** Preflight check result */
  preflightStatus: "passed" | "skipped" | "failed";
  /** Reason preflight was skipped, if applicable */
  preflightSkipReason: string | null;
};

// ---------------------------------------------------------------------------
// Secret handling policy check result
// ---------------------------------------------------------------------------

export type SecretPolicyCheck = {
  /** Check identifier */
  checkId: string;
  /** Human-readable description */
  description: string;
  /** Whether the check passed */
  passed: boolean;
  /** Details */
  detail: string;
};

// ---------------------------------------------------------------------------
// Per-domain credential manifest
// ---------------------------------------------------------------------------

export type DomainCredentialManifest = {
  domainId: string;
  deploymentTarget: string;
  credentialRequirements: CredentialRequirement[];
  approvalGate: ApprovalGate;
  providerAdapters: ProviderAdapter[];
  secretPolicyChecks: SecretPolicyCheck[];
  /** Whether all required credentials are declared (not whether they are present) */
  credentialManifestComplete: boolean;
  /** Whether live deployment is blocked for this domain */
  liveDeploymentBlocked: boolean;
  /** Overall manifest status */
  manifestStatus: "ready_for_approved_credentialed_deployment" | "failed";
  /** Explicit caveat for this domain */
  caveat: string;
};

// ---------------------------------------------------------------------------
// Schema validators (structural)
// ---------------------------------------------------------------------------

export function validateCredentialRequirement(c: unknown): c is CredentialRequirement {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.name === "string" && o.name.length > 0 &&
    typeof o.description === "string" && o.description.length > 0 &&
    typeof o.credentialClass === "string" &&
    typeof o.sensitivity === "string" &&
    typeof o.required === "boolean" &&
    typeof o.obtainedFrom === "string" && o.obtainedFrom.length > 0 &&
    typeof o.mustNotBeCommitted === "boolean"
  );
}

export function validateApprovalGate(g: unknown): g is ApprovalGate {
  if (typeof g !== "object" || g === null) return false;
  const o = g as Record<string, unknown>;
  return (
    typeof o.status === "string" &&
    o.liveDeploymentBlockedByDefault === true &&
    typeof o.blockedReason === "string" && o.blockedReason.length > 0 &&
    Array.isArray(o.requiredUserActions) &&
    o.approvalSimulated === true
  );
}

export function validateProviderAdapter(p: unknown): p is ProviderAdapter {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.provider === "string" &&
    typeof o.deploymentTarget === "string" &&
    typeof o.commandTemplate === "string" &&
    Array.isArray(o.requiredEnvVarNames) &&
    typeof o.executesLiveDeployment === "boolean" &&
    typeof o.preflightCheck === "string" &&
    typeof o.preflightExecuted === "boolean" &&
    ["passed", "skipped", "failed"].includes(String(o.preflightStatus))
  );
}

export function validateDomainCredentialManifest(m: unknown): m is DomainCredentialManifest {
  if (typeof m !== "object" || m === null) return false;
  const o = m as Record<string, unknown>;
  if (typeof o.domainId !== "string" || !o.domainId) return false;
  if (typeof o.deploymentTarget !== "string" || !o.deploymentTarget) return false;
  if (!Array.isArray(o.credentialRequirements)) return false;
  if (!o.credentialRequirements.every(validateCredentialRequirement)) return false;
  if (!validateApprovalGate(o.approvalGate)) return false;
  if (!Array.isArray(o.providerAdapters)) return false;
  if (!o.providerAdapters.every(validateProviderAdapter)) return false;
  if (!Array.isArray(o.secretPolicyChecks)) return false;
  if (o.credentialManifestComplete !== true) return false;
  if (o.liveDeploymentBlocked !== true) return false;
  if (o.manifestStatus !== "ready_for_approved_credentialed_deployment") return false;
  if (typeof o.caveat !== "string" || !o.caveat) return false;
  return true;
}
