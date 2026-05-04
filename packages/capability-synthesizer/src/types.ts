import type { Blueprint } from "../../blueprints/src/types";

// A fully synthesized capability — blueprint + executor domain knowledge
export type SynthesizedCapability = {
  id: string;
  domain: string;              // human-readable: "WebAssembly module", "CLI tool", etc.
  trigger: string;             // the original request text that triggered synthesis
  blueprint: Blueprint;
  waveTypeId: string;          // e.g. "webassembly_module" — used as WaveType in executor
  domainConstraints: string;   // injected into every packet prompt for this domain
  waveContext: {
    preamble: string;
    instructions: string;
    fileHints: string;
  };
  synthesizedAt: string;
  version: number;             // increments on re-synthesis for the same domain
};

export type CapabilityGapReport = {
  hasGap: boolean;
  matchScore: number;           // 0–N token matches with best blueprint
  domain: string;               // inferred domain label from request
  confidence: "none" | "low" | "medium" | "high";
  suggestedCapabilityId: string;
};

export type SynthesisResult =
  | { ok: true;  capability: SynthesizedCapability }
  | { ok: false; reason: string };
