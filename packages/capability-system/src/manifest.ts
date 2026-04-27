import { CapabilityManifest } from "./types";

export function validateCapabilityManifest(manifest: CapabilityManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id) errors.push("manifest id missing");
  if (!manifest.name) errors.push("manifest name missing");
  if (!manifest.version) errors.push("manifest version missing");
  if (!manifest.requiredValidators.length) errors.push("requiredValidators missing");
  return errors;
}
