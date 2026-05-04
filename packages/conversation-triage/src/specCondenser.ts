import type { ClarifiedSpec, TriageAnalysis, TriageResponse, TriageQuestion } from "./types";

// ─── Out-of-scope extraction ──────────────────────────────────────────────────

const OUT_OF_SCOPE_PATTERNS: Array<RegExp> = [
  /(?:^|[\s,;])not\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /(?:^|[\s,;])no\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /without\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /except\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /don'?t need\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /no need for\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /won'?t\s+(?:need|have|include|support)\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /exclude[sd]?\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
  /skip(?:ping)?\s+([\w\s-]{2,40?})(?=[.,;!?]|$)/gi,
];

// Short words that are not real "out of scope" items (common false positives)
const SKIP_PHRASES = new Set([
  "a",
  "an",
  "the",
  "it",
  "this",
  "that",
  "to",
  "be",
  "is",
  "are",
  "was",
  "were",
  "sure",
  "yet",
  "done",
  "need",
  "want",
  "have",
  "do",
  "know",
  "think",
  "sure about",
  "sure yet",
  "sure if",
]);

function extractOutOfScope(text: string): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  const lower = text.toLowerCase();

  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lower)) !== null) {
      const raw = (match[1] || "").replace(/[.,;!?\s]+$/, "").trim();
      if (
        raw.length >= 3 &&
        !seen.has(raw) &&
        !SKIP_PHRASES.has(raw)
      ) {
        seen.add(raw);
        results.push(raw);
      }
    }
  }

  return results;
}

// ─── Tech preference extraction from answers ──────────────────────────────────

function extractTechPreferences(text: string): string[] {
  const tech: string[] = [];
  const lower = text.toLowerCase();

  // Keywords that need word-boundary matching to avoid false positives
  // (e.g. "go" matching "good", "vue" matching "revenue", "ruby" matching "ruby red")
  const techKeywords: Array<{ kw: string; wordBoundary: boolean }> = [
    { kw: "next.js", wordBoundary: false },
    { kw: "nextjs", wordBoundary: true },
    { kw: "react", wordBoundary: true },
    { kw: "vue", wordBoundary: true },
    { kw: "angular", wordBoundary: true },
    { kw: "svelte", wordBoundary: true },
    { kw: "remix", wordBoundary: true },
    { kw: "node.js", wordBoundary: false },
    { kw: "nodejs", wordBoundary: true },
    { kw: "express", wordBoundary: true },
    { kw: "fastify", wordBoundary: true },
    { kw: "koa", wordBoundary: true },
    { kw: "hapi", wordBoundary: true },
    { kw: "python", wordBoundary: true },
    { kw: "django", wordBoundary: true },
    { kw: "flask", wordBoundary: true },
    { kw: "fastapi", wordBoundary: true },
    { kw: "ruby", wordBoundary: true },
    { kw: "rails", wordBoundary: true },
    { kw: "golang", wordBoundary: true },
    { kw: "supabase", wordBoundary: true },
    { kw: "firebase", wordBoundary: true },
    { kw: "appwrite", wordBoundary: true },
    { kw: "pocketbase", wordBoundary: true },
    { kw: "postgres", wordBoundary: true },
    { kw: "postgresql", wordBoundary: true },
    { kw: "mysql", wordBoundary: true },
    { kw: "sqlite", wordBoundary: true },
    { kw: "mongodb", wordBoundary: true },
    { kw: "redis", wordBoundary: true },
    { kw: "typescript", wordBoundary: true },
    { kw: "javascript", wordBoundary: true },
    { kw: "tailwind", wordBoundary: true },
    { kw: "bootstrap", wordBoundary: true },
    { kw: "chakra", wordBoundary: true },
    { kw: "vercel", wordBoundary: true },
    { kw: "netlify", wordBoundary: true },
    { kw: "aws", wordBoundary: true },
    { kw: "gcp", wordBoundary: true },
    { kw: "azure", wordBoundary: true },
    { kw: "react native", wordBoundary: false },
    { kw: "expo", wordBoundary: true },
    { kw: "flutter", wordBoundary: true },
    { kw: "electron", wordBoundary: true },
    { kw: "tauri", wordBoundary: true },
  ];

  for (const { kw, wordBoundary } of techKeywords) {
    const matches = wordBoundary
      ? new RegExp(`\\b${kw.replace(".", "\\.")}\\b`).test(lower)
      : lower.includes(kw);
    if (matches) {
      tech.push(kw);
    }
  }

  return tech;
}

// ─── Core purpose builder ─────────────────────────────────────────────────────

function buildCorePurpose(
  rawInput: string,
  analysis: TriageAnalysis,
  targetUsers: string
): string {
  const domain = analysis.detectedDomain;
  const features = analysis.clearIntents.slice(0, 3);

  if (features.length >= 2) {
    return `allow ${targetUsers || "users"} to ${features.slice(0, 2).join(" and ")}`;
  }

  if (analysis.detectedFeatures.length >= 1) {
    return `provide ${analysis.detectedFeatures.slice(0, 2).join(" and ")} functionality`;
  }

  // Fallback: domain-based
  const domainPurposes: Record<string, string> = {
    "SaaS web app": "manage workflows and collaborate across teams",
    "Mobile app": "accomplish key tasks on mobile devices",
    "Game": "deliver an engaging gameplay experience",
    "Browser extension": "enhance the browser experience",
    "Discord bot": "automate and enhance Discord server interactions",
    "Desktop app": "provide a native desktop experience",
    "Developer tool / API": "provide developer tooling and programmatic access",
    "E-commerce": "enable buying and selling of products",
    "AI/ML application": "deliver AI-powered features and insights",
    "Web application": "deliver core functionality via the web",
  };

  return domainPurposes[domain] || "solve the core user problem";
}

// ─── Summary builder ──────────────────────────────────────────────────────────

function buildSummary(
  domain: string,
  targetUsers: string,
  corePurpose: string,
  keyFeatures: string[]
): string {
  const featureList =
    keyFeatures.length > 0
      ? `. Key features: ${keyFeatures.slice(0, 5).join(", ")}.`
      : ".";

  return `A ${domain} for ${targetUsers || "users"} that ${corePurpose}${featureList}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function condenseToSpec(
  rawInput: string,
  analysis: TriageAnalysis,
  responses: TriageResponse[]
): ClarifiedSpec {
  // Map question IDs → question objects for quick lookup
  const questionMap = new Map<string, TriageQuestion>(
    analysis.targetedQuestions.map((q) => [q.id, q])
  );

  // ── Initialise fields from analysis ─────────────────────────────────────
  let platform = analysis.detectedDomain === "Mobile app"
    ? "Mobile (iOS/Android)"
    : analysis.detectedDomain === "Browser extension"
    ? "Browser extension"
    : analysis.detectedDomain === "Desktop app"
    ? "Desktop"
    : analysis.detectedDomain === "Discord bot"
    ? "Discord"
    : "Web";

  let targetUsers = "";
  let techPreferences: string[] = extractTechPreferences(rawInput);
  let businessModel = "";
  const keyFeatures: string[] = [...analysis.clearIntents];

  // Incorporate vague areas that appear clarified by the context
  for (const vague of analysis.vagueAreas) {
    if (!keyFeatures.includes(vague) && vague.length > 3) {
      keyFeatures.push(vague);
    }
  }

  // ── Process triage responses ────────────────────────────────────────────
  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) continue;

    const answer = response.answer.trim();

    switch (question.category) {
      case "platform":
        platform = answer;
        break;

      case "users":
        targetUsers = answer;
        break;

      case "tech": {
        const fromAnswer = extractTechPreferences(answer);
        for (const t of fromAnswer) {
          if (!techPreferences.includes(t)) {
            techPreferences.push(t);
          }
        }
        // If extractTechPreferences found nothing but the user wrote something, keep it verbatim
        if (fromAnswer.length === 0 && answer.length > 2) {
          techPreferences.push(answer);
        }
        break;
      }

      case "business":
        businessModel = answer;
        break;

      case "scope":
        // scope answers either clarify features or narrow scope
        if (
          answer.toLowerCase().startsWith("not ") ||
          answer.toLowerCase().startsWith("no ") ||
          answer.toLowerCase().includes("out of scope") ||
          answer.toLowerCase().includes("don't need")
        ) {
          // handled by outOfScope extraction below
        } else {
          // split comma-separated feature lists
          const parts = answer.split(/[,;]/).map((p) => p.trim()).filter((p) => p.length > 2);
          for (const part of parts) {
            if (!keyFeatures.includes(part.toLowerCase())) {
              keyFeatures.push(part.toLowerCase());
            }
          }
        }
        break;
    }
  }

  // Derive target users from raw input if not in responses
  if (!targetUsers) {
    const userMatch = rawInput.match(
      /\b(consumers?|customers?|small businesses?|enterprises?|developers?|teams?|students?|employees?|internal team|general public)\b/i
    );
    if (userMatch) {
      targetUsers = userMatch[0];
    } else {
      targetUsers = "end users";
    }
  }

  // Derive business model from raw input if not in responses
  if (!businessModel) {
    const lower = rawInput.toLowerCase();
    if (/\b(subscription|monthly|annual|saas)\b/.test(lower)) {
      businessModel = "SaaS subscription";
    } else if (/\bfree\b/.test(lower) && !/\bfreemium\b/.test(lower)) {
      businessModel = "Free";
    } else if (/\bfreemium\b/.test(lower)) {
      businessModel = "Freemium";
    } else if (/\b(one.time|lifetime|pay once)\b/.test(lower)) {
      businessModel = "One-time purchase";
    } else if (/\b(marketplace|commission)\b/.test(lower)) {
      businessModel = "Marketplace / commission";
    } else {
      businessModel = "TBD";
    }
  }

  // ── Out of scope ────────────────────────────────────────────────────────
  // Combine raw input + all response answers for out-of-scope extraction
  const fullText = [rawInput, ...responses.map((r) => r.answer)].join(" ");
  const outOfScope = extractOutOfScope(fullText);

  // ── Core purpose ────────────────────────────────────────────────────────
  const corePurpose = buildCorePurpose(rawInput, analysis, targetUsers);

  // ── Summary ─────────────────────────────────────────────────────────────
  const summary = buildSummary(
    analysis.detectedDomain,
    targetUsers,
    corePurpose,
    keyFeatures
  );

  // ── Title ───────────────────────────────────────────────────────────────
  const title = analysis.suggestedTitle || "New App";

  return {
    title,
    summary,
    corePurpose,
    targetUsers,
    keyFeatures: [...new Set(keyFeatures)], // deduplicate
    platform,
    techPreferences,
    businessModel,
    outOfScope,
    rawInput,
    triageResponses: responses,
  };
}
