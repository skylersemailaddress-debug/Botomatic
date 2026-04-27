export type CloudProvider = "google_drive" | "dropbox" | "onedrive_sharepoint" | "https_download" | "unknown";

export type CloudLinkIntakeResult = {
  provider: CloudProvider;
  normalizedUrl: string;
  authRequired: boolean;
  authStatus: "not_required" | "required" | "provided" | "missing";
  metadataOnly: boolean;
  requiresLargeDownloadApproval: boolean;
  estimatedSizeBytes: number | null;
  reason: string;
};

export function classifyCloudProvider(input: string): CloudProvider {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "unknown";
  }

  const host = url.hostname.toLowerCase();
  if (host.includes("drive.google.com") || host.includes("docs.google.com")) return "google_drive";
  if (host.includes("dropbox.com")) return "dropbox";
  if (host.includes("onedrive.live.com") || host.includes("sharepoint.com")) return "onedrive_sharepoint";
  if (url.protocol === "https:") return "https_download";
  return "unknown";
}

export function validateCloudLink(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Invalid cloud link URL.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Cloud link must use HTTPS.");
  }
  return url;
}

export function intakeCloudLink(params: {
  sourceUrl: string;
  hasConnectorCredentials: boolean;
  estimatedSizeBytes?: number | null;
  largeDownloadApproval?: boolean;
}): CloudLinkIntakeResult {
  const url = validateCloudLink(params.sourceUrl);
  const provider = classifyCloudProvider(url.toString());
  const authRequired = provider === "google_drive" || provider === "dropbox" || provider === "onedrive_sharepoint";

  const authStatus: "not_required" | "required" | "provided" | "missing" = authRequired
    ? (params.hasConnectorCredentials ? "provided" : "missing")
    : "not_required";

  const largeThresholdBytes = 100 * 1024 * 1024;
  const requiresLargeDownloadApproval = Number(params.estimatedSizeBytes || 0) >= largeThresholdBytes;

  if (authRequired && !params.hasConnectorCredentials) {
    return {
      provider,
      normalizedUrl: url.toString(),
      authRequired,
      authStatus,
      metadataOnly: true,
      requiresLargeDownloadApproval,
      estimatedSizeBytes: params.estimatedSizeBytes || null,
      reason: "Connector access is required before cloud content can be fetched.",
    };
  }

  if (requiresLargeDownloadApproval && !params.largeDownloadApproval) {
    return {
      provider,
      normalizedUrl: url.toString(),
      authRequired,
      authStatus,
      metadataOnly: true,
      requiresLargeDownloadApproval,
      estimatedSizeBytes: params.estimatedSizeBytes || null,
      reason: "Large cloud downloads require explicit user approval before fetch.",
    };
  }

  return {
    provider,
    normalizedUrl: url.toString(),
    authRequired,
    authStatus,
    metadataOnly: !params.hasConnectorCredentials,
    requiresLargeDownloadApproval,
    estimatedSizeBytes: params.estimatedSizeBytes || null,
    reason: params.hasConnectorCredentials ? "Cloud link is ready for connector-backed fetch." : "Cloud link registered as metadata-only.",
  };
}
