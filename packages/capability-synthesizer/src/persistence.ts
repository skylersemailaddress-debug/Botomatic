import fs from "fs";
import path from "path";
import type { SynthesizedCapability } from "./types";

// Persisted to the repo root so synthesized capabilities survive process restarts
// and are committed to git alongside the rest of the codebase.
const CAPS_FILE = path.resolve(process.cwd(), "synthesized_capabilities.json");

export function loadPersistedCapabilities(): SynthesizedCapability[] {
  try {
    if (!fs.existsSync(CAPS_FILE)) return [];
    const raw = fs.readFileSync(CAPS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function persistCapability(capability: SynthesizedCapability): void {
  const existing = loadPersistedCapabilities();
  const idx = existing.findIndex(c => c.id === capability.id);
  if (idx >= 0) {
    existing[idx] = { ...capability, version: (existing[idx].version ?? 0) + 1 };
  } else {
    existing.push(capability);
  }
  try {
    fs.writeFileSync(CAPS_FILE, JSON.stringify(existing, null, 2), "utf8");
  } catch (_e) {
    // Filesystem may be read-only in some deploy environments — tolerate
  }
}

export function deletePersistedCapability(id: string): void {
  const existing = loadPersistedCapabilities().filter(c => c.id !== id);
  try {
    fs.writeFileSync(CAPS_FILE, JSON.stringify(existing, null, 2), "utf8");
  } catch (_e) {}
}
