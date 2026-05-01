import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { sanitizeProjectId } from "./executionStore";

export type GeneratedAppArtifact = {
  projectId: string;
  prompt: string;
  appName: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  generatedAt: string;
  checksum: string;
};

const DATA_ROOT = path.resolve(process.cwd(), "data/generated-apps");
const nowIso = () => new Date().toISOString();
const ensureRoot = () => fs.mkdirSync(DATA_ROOT, { recursive: true });
const filePath = (projectId: string) => path.join(DATA_ROOT, `${sanitizeProjectId(projectId)}.json`);
const checksum = (value: unknown) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function deriveApp(prompt: string, projectId: string): Omit<GeneratedAppArtifact, "checksum"> {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();
  const isHotel = /hotel|booking|luxury|room|stay|resort/.test(lower);
  const isSaas = /saas|dashboard|analytics|crm|admin/.test(lower);
  const appName = isHotel ? "LUXORA" : isSaas ? "NEXUS DASH" : sanitizeProjectId(projectId).replace(/[_-]/g, " ").toUpperCase();
  const heroTitle = isHotel ? "Your Escape Awaits" : isSaas ? "Your Command Center" : "Your App Is Taking Shape";
  const heroSubtitle = isHotel ? "Experience a refined booking flow for memorable stays." : isSaas ? "Track work, data, and decisions from one operating dashboard." : clean || "Generated from your project prompt.";
  return {
    projectId: sanitizeProjectId(projectId),
    prompt: clean,
    appName,
    heroTitle,
    heroSubtitle,
    primaryCta: isHotel ? "Book Your Stay" : "Get Started",
    secondaryCta: isHotel ? "Explore Rooms" : "View Details",
    generatedAt: nowIso(),
  };
}

export function loadGeneratedApp(projectId: string): GeneratedAppArtifact | null {
  ensureRoot();
  const fp = filePath(projectId);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf8"));
  } catch {
    return null;
  }
}

export function generateApp(projectId: string, prompt: string): GeneratedAppArtifact {
  ensureRoot();
  if (!prompt.trim()) throw new Error("Prompt is required to generate an app artifact");
  const base = deriveApp(prompt, projectId);
  const artifact = { ...base, checksum: checksum(base) };
  fs.writeFileSync(filePath(projectId), JSON.stringify(artifact, null, 2));
  return artifact;
}
