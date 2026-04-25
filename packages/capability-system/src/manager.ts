import { CapabilityManifest } from "./types";

export type CapabilityRegistry = {
  installed: CapabilityManifest[];
};

export function createCapabilityRegistry(): CapabilityRegistry {
  return { installed: [] };
}

export function installCapability(registry: CapabilityRegistry, manifest: CapabilityManifest): CapabilityRegistry {
  return { installed: [...registry.installed.filter((m) => m.id !== manifest.id), manifest] };
}

export function removeCapability(registry: CapabilityRegistry, id: string): CapabilityRegistry {
  return { installed: registry.installed.filter((m) => m.id !== id) };
}
