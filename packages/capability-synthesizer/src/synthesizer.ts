import type { SynthesizedCapability, SynthesisResult, CapabilityGapReport } from "./types";

// ── Synthesis prompt ──────────────────────────────────────────────────────────
// Sent to the AI executor with structured JSON output requirements.
// The AI fills in every field needed for a production-grade blueprint.
function buildSynthesisPrompt(gap: CapabilityGapReport, requestText: string): string {
  return `You are a software architecture expert adding a new build capability to a universal app builder.

## Task
Synthesize a complete, production-quality build blueprint for the following domain:
**Domain:** ${gap.domain}
**Original request that triggered this synthesis:** "${requestText.slice(0, 400)}"

## Output format
Respond with ONLY a valid JSON object matching this exact schema (no markdown, no prose):

{
  "blueprint": {
    "id": "<snake_case unique id like 'browser_extension' or 'discord_bot'>",
    "name": "<camelCase name>",
    "category": "<space-separated keywords that help text matching>",
    "description": "<1 sentence describing what this blueprint builds>",
    "defaultPages": ["<screen/view names relevant to this domain>"],
    "defaultComponents": ["<UI component names>"],
    "defaultRoles": ["<user roles>"],
    "defaultPermissions": ["<permission names>"],
    "defaultEntities": ["<data entity names>"],
    "defaultRelationships": ["<entity relationships>"],
    "defaultWorkflows": ["<core user workflow names>"],
    "defaultIntegrations": ["<key integrations/SDKs/APIs>"],
    "requiredQuestions": ["<5 questions that MUST be answered before building>"],
    "safeAssumptions": ["<8-12 safe technical assumptions for this domain>"],
    "riskyAssumptions": ["<4-6 assumptions that could be wrong and need validation>"],
    "recommendedStack": {
      "frontend": "<primary UI tech>",
      "backend": "<backend tech>",
      "jobs": "<async/background jobs tech>",
      "deploy": "<deployment method>"
    },
    "acceptanceCriteria": ["<5 concrete pass/fail criteria>"],
    "launchCriteria": ["<5 launch readiness checks>"],
    "validationRules": ["<4 validator names as strings>"],
    "noPlaceholderRules": ["<4 concrete no-placeholder rules>"]
  },
  "waveTypeId": "<snake_case id matching blueprint.id>",
  "domainConstraints": "<Multi-line string: ## DOMAIN RULES (non-negotiable):\\n- rule1\\n- rule2 ... at least 8 rules specific to this tech stack>",
  "waveContext": {
    "preamble": "<1 sentence: what kind of code this wave generates>",
    "instructions": "<Multi-line: list the 5-6 key files to create with brief descriptions>",
    "fileHints": "<Required files: file1, file2, file3 ...>"
  }
}

## Rules
- Be SPECIFIC to the domain — not generic SaaS advice
- domainConstraints must name REAL packages, versions, patterns (e.g. "use manifest.json v3 for Chrome extensions")
- All arrays must have at least 4 items
- requiredQuestions must be questions a developer ACTUALLY needs answered before building
- safeAssumptions must be concrete technical choices (package names, patterns, versions)
- The result must be immediately usable — a developer should be able to build from this blueprint without guessing`;
}

// ── Lightweight AI call (no executor dependency — uses fetch directly) ────────
// Calls Anthropic API with the synthesis prompt. Falls back to a structural
// skeleton if the API is unavailable, so synthesis never hard-blocks a build.
async function callAIForSynthesis(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set — cannot synthesize capability");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.NEXUS_MODEL_GENERAL ?? "claude-sonnet-4-6",
      max_tokens: 4096,
      system: "You are a senior software architect. Respond ONLY with valid JSON — no markdown, no prose, no code fences.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data?.content?.[0]?.text ?? "";
}

// Parse + validate the AI JSON response
function parseSynthesisResponse(raw: string, gap: CapabilityGapReport): SynthesizedCapability | null {
  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
    const parsed = JSON.parse(clean);

    const bp = parsed.blueprint;
    if (!bp?.id || !bp?.name || !bp?.category) return null;

    return {
      id: gap.suggestedCapabilityId,
      domain: gap.domain,
      trigger: "",
      blueprint: {
        id: bp.id,
        name: bp.name,
        category: bp.category ?? "",
        description: bp.description ?? "",
        defaultPages: Array.isArray(bp.defaultPages) ? bp.defaultPages : [],
        defaultComponents: Array.isArray(bp.defaultComponents) ? bp.defaultComponents : [],
        defaultRoles: Array.isArray(bp.defaultRoles) ? bp.defaultRoles : ["user"],
        defaultPermissions: Array.isArray(bp.defaultPermissions) ? bp.defaultPermissions : ["read"],
        defaultEntities: Array.isArray(bp.defaultEntities) ? bp.defaultEntities : [],
        defaultRelationships: Array.isArray(bp.defaultRelationships) ? bp.defaultRelationships : [],
        defaultWorkflows: Array.isArray(bp.defaultWorkflows) ? bp.defaultWorkflows : [],
        defaultIntegrations: Array.isArray(bp.defaultIntegrations) ? bp.defaultIntegrations : [],
        requiredQuestions: Array.isArray(bp.requiredQuestions) ? bp.requiredQuestions : [],
        safeAssumptions: Array.isArray(bp.safeAssumptions) ? bp.safeAssumptions : [],
        riskyAssumptions: Array.isArray(bp.riskyAssumptions) ? bp.riskyAssumptions : [],
        recommendedStack: bp.recommendedStack ?? { frontend: "N/A", backend: "N/A" },
        acceptanceCriteria: Array.isArray(bp.acceptanceCriteria) ? bp.acceptanceCriteria : [],
        launchCriteria: Array.isArray(bp.launchCriteria) ? bp.launchCriteria : [],
        validationRules: Array.isArray(bp.validationRules) ? bp.validationRules : [],
        noPlaceholderRules: Array.isArray(bp.noPlaceholderRules) ? bp.noPlaceholderRules : [],
      },
      waveTypeId: parsed.waveTypeId ?? bp.id,
      domainConstraints: typeof parsed.domainConstraints === "string" ? parsed.domainConstraints : "",
      waveContext: {
        preamble: parsed.waveContext?.preamble ?? `Generate production code for ${gap.domain}.`,
        instructions: parsed.waveContext?.instructions ?? "Create all necessary files for the requested feature.",
        fileHints: parsed.waveContext?.fileHints ?? "Required files: src/index.ts",
      },
      synthesizedAt: new Date().toISOString(),
      version: 1,
    };
  } catch (_e) {
    return null;
  }
}

// Build a minimal fallback capability when AI is unavailable
function buildFallbackCapability(gap: CapabilityGapReport, requestText: string): SynthesizedCapability {
  const id = gap.suggestedCapabilityId;
  return {
    id,
    domain: gap.domain,
    trigger: requestText,
    blueprint: {
      id,
      name: id.replace(/_/g, " "),
      category: gap.domain.toLowerCase(),
      description: `Auto-generated blueprint for: ${gap.domain}`,
      defaultPages: ["Home", "Dashboard", "Settings"],
      defaultComponents: ["Header", "MainContent", "Footer"],
      defaultRoles: ["user", "admin"],
      defaultPermissions: ["read", "write"],
      defaultEntities: ["User", "Record"],
      defaultRelationships: ["User has_many Records"],
      defaultWorkflows: ["core_workflow"],
      defaultIntegrations: [],
      requiredQuestions: [
        "What is the primary user goal?",
        "What tech stack is required?",
        "What is the deployment target?",
        "Are there any compliance requirements?",
        "What are the V1 exclusions?",
      ],
      safeAssumptions: [
        "TypeScript for all logic",
        "REST API for backend communication",
        "Production-quality, no placeholders",
      ],
      riskyAssumptions: ["Domain-specific tooling may need manual setup"],
      recommendedStack: { frontend: "TypeScript", backend: "Node.js", deploy: "Cloud platform" },
      acceptanceCriteria: ["Build completes", "Core workflow functional"],
      launchCriteria: ["Build passes", "No known P0 issues"],
      validationRules: ["validateNoPlaceholders"],
      noPlaceholderRules: ["No TODO/FIXME in production code"],
    },
    waveTypeId: id,
    domainConstraints: `## ${gap.domain.toUpperCase()} RULES:\n- Generate real, working code with no placeholders\n- Follow domain best practices\n- All files must be immediately runnable`,
    waveContext: {
      preamble: `Generate production code for: ${gap.domain}`,
      instructions: "Create complete, working implementation files for the requested feature. Include entry point, types, and any required configuration.",
      fileHints: "Required files: src/index.ts, src/types.ts",
    },
    synthesizedAt: new Date().toISOString(),
    version: 1,
  };
}

export async function synthesizeCapability(
  gap: CapabilityGapReport,
  requestText: string
): Promise<SynthesisResult> {
  try {
    const prompt = buildSynthesisPrompt(gap, requestText);
    const raw = await callAIForSynthesis(prompt);
    const capability = parseSynthesisResponse(raw, gap);

    if (!capability) {
      // AI returned unparseable JSON — use fallback but mark as degraded
      const fallback = buildFallbackCapability(gap, requestText);
      fallback.trigger = requestText;
      return { ok: true, capability: fallback };
    }

    capability.trigger = requestText;
    return { ok: true, capability };
  } catch (error: any) {
    // API unavailable — use fallback so build is never blocked
    const fallback = buildFallbackCapability(gap, requestText);
    fallback.trigger = requestText;
    return { ok: true, capability: fallback };
  }
}
