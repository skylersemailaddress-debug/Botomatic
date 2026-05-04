import type { TriageAnalysis, TriageQuestion } from "./types";

// ─── Clear intent keywords ────────────────────────────────────────────────────

const CLEAR_INTENT_KEYWORDS: string[] = [
  "sign up",
  "sign in",
  "log in",
  "login",
  "logout",
  "log out",
  "register",
  "dashboard",
  "payment",
  "payments",
  "checkout",
  "billing",
  "subscription",
  "search",
  "upload",
  "notification",
  "notifications",
  "admin",
  "profile",
  "analytics",
  "report",
  "reports",
  "settings",
  "messaging",
  "chat",
  "comments",
  "reviews",
  "ratings",
  "onboarding",
  "invite",
  "share",
  "export",
  "import",
  "calendar",
  "scheduling",
  "booking",
  "team",
  "teams",
  "project",
  "projects",
  "task",
  "tasks",
  "file",
  "files",
  "folder",
  "folders",
  "email",
  "authentication",
  "authorization",
  "permissions",
  "roles",
  "audit log",
  "two-factor",
  "2fa",
  "map",
  "maps",
  "location",
  "geolocation",
  "cart",
  "wishlist",
  "order",
  "orders",
  "invoice",
  "invoices",
  "user management",
  "api",
  "webhook",
  "integration",
  "integrations",
  "dark mode",
  "theme",
  "ai",
  "ml",
];

// ─── Vague language markers ───────────────────────────────────────────────────

const VAGUE_MARKERS: RegExp[] = [
  /maybe\s+(.*?)(?=[.,;!?]|$)/gi,
  /probably\s+(.*?)(?=[.,;!?]|$)/gi,
  /i think\s+(.*?)(?=[.,;!?]|$)/gi,
  /kind of\s+(.*?)(?=[.,;!?]|$)/gi,
  /sort of\s+(.*?)(?=[.,;!?]|$)/gi,
  /something like\s+(.*?)(?=[.,;!?]|$)/gi,
  /or maybe\s+(.*?)(?=[.,;!?]|$)/gi,
  /i'm not sure\s+(.*?)(?=[.,;!?]|$)/gi,
  /im not sure\s+(.*?)(?=[.,;!?]|$)/gi,
  /not sure\s+(.*?)(?=[.,;!?]|$)/gi,
  /could be\s+(.*?)(?=[.,;!?]|$)/gi,
  /might\s+(.*?)(?=[.,;!?]|$)/gi,
  /possibly\s+(.*?)(?=[.,;!?]|$)/gi,
  /i guess\s+(.*?)(?=[.,;!?]|$)/gi,
  /i think maybe\s+(.*?)(?=[.,;!?]|$)/gi,
  /would be nice\s+(.*?)(?=[.,;!?]|$)/gi,
  /like maybe\s+(.*?)(?=[.,;!?]|$)/gi,
];

// ─── Domain keyword scoring ───────────────────────────────────────────────────

const DOMAIN_SIGNALS: Array<{ domain: string; keywords: string[] }> = [
  {
    domain: "SaaS web app",
    keywords: ["saas", "dashboard", "subscription", "billing", "team", "workspace", "tenant", "plan", "tier"],
  },
  {
    domain: "Mobile app",
    keywords: ["mobile", "ios", "android", "app store", "react native", "flutter", "expo", "play store", "native app"],
  },
  {
    domain: "Game",
    keywords: ["game", "unity", "unreal", "godot", "player", "level", "score", "multiplayer", "leaderboard", "sprite", "physics"],
  },
  {
    domain: "Browser extension",
    keywords: ["chrome", "firefox", "extension", "browser", "popup", "manifest", "content script", "background script"],
  },
  {
    domain: "Discord bot",
    keywords: ["discord", "bot", "slash command", "server", "guild", "channel", "webhook", "discord.js"],
  },
  {
    domain: "Desktop app",
    keywords: ["desktop", "electron", "tauri", "windows", "mac app", "macos", "linux app", "system tray", "native window"],
  },
  {
    domain: "Developer tool / API",
    keywords: ["api", "sdk", "library", "npm package", "developer tool", "cli", "open source", "developer", "package", "module", "endpoint"],
  },
  {
    domain: "E-commerce",
    keywords: ["ecommerce", "e-commerce", "shop", "store", "cart", "checkout", "product listing", "inventory", "fulfillment", "merchant"],
  },
  {
    domain: "AI/ML application",
    keywords: ["ai", "ml", "machine learning", "model", "training", "inference", "llm", "gpt", "neural", "prediction", "classifier", "embedding"],
  },
];

// ─── Feature extraction helpers ──────────────────────────────────────────────

const ACTION_VERBS: string[] = [
  "with",
  "and",
  "including",
  "includes",
  "have",
  "has",
  "add",
  "adding",
  "need",
  "needs",
  "want",
  "wants",
  "show",
  "shows",
  "display",
  "displays",
  "allow",
  "allows",
  "support",
  "supports",
  "enable",
  "enables",
  "provide",
  "provides",
  "build",
  "create",
  "make",
  "feature",
  "features",
];

// ─── Out-of-scope markers ─────────────────────────────────────────────────────

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /(?:^|\s)not\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /(?:^|\s)no\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /without\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /except\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /don't need\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /dont need\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /no need for\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /won't\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /wont\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
  /exclude\s+([\w\s]+?)(?=[.,;!?]|$)/gi,
];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function normalise(text: string): string {
  return text.toLowerCase().replace(/['']/g, "'");
}

function countFeatures(text: string): number {
  // rough heuristic: count comma-separated items + "and X" clusters
  const commas = (text.match(/,/g) || []).length;
  const ands = (text.match(/\band\b/gi) || []).length;
  return commas + ands + 1;
}

function trimCapture(s: string): string {
  return s.trim().replace(/[.,;!?]+$/, "").trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function triageInput(rawText: string): TriageAnalysis {
  const lower = normalise(rawText);

  // ── 1. Clear intent detection ──────────────────────────────────────────────
  const clearIntents: string[] = [];
  for (const kw of CLEAR_INTENT_KEYWORDS) {
    if (lower.includes(kw)) {
      clearIntents.push(kw);
    }
  }

  // ── 2. Vague language detection ────────────────────────────────────────────
  const vagueAreas: string[] = [];
  for (const pattern of VAGUE_MARKERS) {
    let match: RegExpExecArray | null;
    // reset lastIndex since we reuse regexes with /g flag
    pattern.lastIndex = 0;
    while ((match = pattern.exec(lower)) !== null) {
      const capture = trimCapture(match[1] || "");
      if (capture.length > 2 && !vagueAreas.includes(capture)) {
        vagueAreas.push(capture);
      }
    }
  }

  // ── 3. Contradiction detection ─────────────────────────────────────────────
  const contradictions: string[] = [];

  const hasMobile = /\b(mobile|ios|android|react native|flutter)\b/.test(lower);
  const hasWeb = /\b(web app|website|webapp|browser-based|web-based)\b/.test(lower);
  const hasDesktop = /\b(desktop|electron|tauri|mac app|windows app)\b/.test(lower);
  const platformCount = [hasMobile, hasWeb, hasDesktop].filter(Boolean).length;
  if (platformCount >= 2) {
    contradictions.push("Multiple platforms mentioned — pick one primary");
  }

  const hasRealtime = /\b(real[-\s]?time|live updates?|websocket|streaming)\b/.test(lower);
  const hasNoBackend = /\b(no backend|without backend|no server|client.only|static only)\b/.test(lower);
  if (hasRealtime && hasNoBackend) {
    contradictions.push("Real-time features require a backend");
  }

  const hasFree = /\b(free|open.source|no cost|freeware)\b/.test(lower);
  const hasPaid = /\b(subscription|paid|premium|pricing|plan|tier|monetize|revenue)\b/.test(lower);
  if (hasFree && hasPaid) {
    contradictions.push("Conflicting business model signals");
  }

  const hasSimple = /\b(simple|minimal|basic|lightweight|small)\b/.test(lower);
  if (hasSimple && countFeatures(rawText) >= 10) {
    contradictions.push("Scope seems larger than 'simple'");
  }

  // ── 4. Domain detection ────────────────────────────────────────────────────
  let topDomain = "Web application";
  let topScore = 0;

  for (const { domain, keywords } of DOMAIN_SIGNALS) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.includes(" ") ? 2 : 1; // multi-word keywords score higher
      }
    }
    if (score > topScore) {
      topScore = score;
      topDomain = domain;
    }
  }

  // Fallback: if "saas" signals tie with something else, prefer SaaS for dashboard+subscription combos
  if (
    topDomain === "Web application" &&
    lower.includes("dashboard") &&
    (lower.includes("subscription") || lower.includes("billing"))
  ) {
    topDomain = "SaaS web app";
  }

  const detectedDomain = topDomain;

  // ── 5. Feature extraction ──────────────────────────────────────────────────
  const detectedFeatures: string[] = [];

  // Extract multi-word noun phrases after action verbs / connectors
  // Pattern: (with|and|including|etc.) [adjective*] noun [noun]
  const featurePattern =
    /\b(?:with|and|including|includes|need|needs|want|wants|have|has|add|feature|features|show|provide)\s+((?:(?!(?:with|and|including|but|however|also|that|this|it|they|we|i|the|a|an)\b)[\w-]+\s*){1,5})/gi;

  let fm: RegExpExecArray | null;
  featurePattern.lastIndex = 0;
  const seen = new Set<string>();
  while ((fm = featurePattern.exec(rawText)) !== null) {
    const phrase = trimCapture(fm[1]).toLowerCase();
    // filter out stop words and very short captures
    if (
      phrase.length > 3 &&
      !seen.has(phrase) &&
      !/^(a|an|the|that|this|it|they|we|i|is|are|be|to|for|of|in|on|at|by)\s*$/.test(phrase)
    ) {
      seen.add(phrase);
      detectedFeatures.push(phrase);
    }
  }

  // also include clear intents as features (they are concrete nouns/actions)
  for (const ci of clearIntents) {
    if (!seen.has(ci)) {
      seen.add(ci);
      detectedFeatures.push(ci);
    }
  }

  // ── 6. Question generation ─────────────────────────────────────────────────
  const questions: TriageQuestion[] = [];

  // Platform clarity
  const platformClear =
    hasMobile || hasDesktop || hasWeb || platformCount >= 1 ||
    /\b(chrome extension|browser extension|discord bot|cli tool|npm package)\b/.test(lower);

  if (!platformClear) {
    questions.push({
      id: "q_platform",
      question: "What platform should this run on?",
      why: "No platform was clearly mentioned in your input.",
      category: "platform",
      suggestedAnswers: [
        "Web app (browser)",
        "iOS app",
        "Android app",
        "Both iOS and Android",
        "Desktop (Windows/Mac/Linux)",
        "Browser extension",
        "CLI / developer tool",
      ],
    });
  }

  // Target users
  const mentionsUsers =
    /\b(users?|customers?|clients?|consumers?|developers?|businesses?|teams?|admins?|students?|employees?|audience)\b/.test(
      lower
    );
  if (!mentionsUsers) {
    questions.push({
      id: "q_users",
      question: "Who are the primary users of this product?",
      why: "The intended audience wasn't mentioned.",
      category: "users",
      suggestedAnswers: [
        "Consumers / general public",
        "Small businesses",
        "Enterprises / large teams",
        "Developers / technical users",
        "Internal team only",
      ],
    });
  }

  // Core feature / day-1 clarity
  const coreFeatureVague =
    vagueAreas.length > 2 ||
    (clearIntents.length === 0 && detectedFeatures.length < 2);
  if (coreFeatureVague) {
    questions.push({
      id: "q_core_feature",
      question: "What is the ONE thing users must be able to do on day 1?",
      why: "The most essential feature isn't clearly defined yet.",
      category: "scope",
    });
  }

  // Monetization / business model
  const monetizationClear =
    hasFree ||
    hasPaid ||
    /\b(marketplace|ads|advertising|freemium|open.source|enterprise|b2b|b2c)\b/.test(lower);
  const looksLikeProduct =
    detectedDomain !== "Developer tool / API" &&
    detectedDomain !== "Discord bot";
  if (!monetizationClear && looksLikeProduct) {
    questions.push({
      id: "q_monetization",
      question: "How will this product make money?",
      why: "No business model was mentioned.",
      category: "business",
      suggestedAnswers: [
        "SaaS subscription (monthly/annual)",
        "One-time purchase",
        "Free / open source",
        "Ads",
        "Marketplace / commission",
        "Not sure yet",
      ],
    });
  }

  // Tech preferences (only ask for SaaS or web apps)
  const techMentioned =
    /\b(next\.?js|react|vue|angular|svelte|node|python|django|rails|supabase|firebase|postgres|mysql|mongodb|typescript|javascript)\b/.test(
      lower
    );
  if (!techMentioned && (detectedDomain === "SaaS web app" || detectedDomain === "Web application")) {
    questions.push({
      id: "q_tech",
      question: "Do you have any technology preferences?",
      why: "No tech stack was mentioned, which affects architecture decisions.",
      category: "tech",
      suggestedAnswers: [
        "Next.js + Supabase",
        "Next.js + PostgreSQL",
        "React + Node.js",
        "Vue.js + Firebase",
        "No preference — recommend something",
      ],
    });
  }

  // Scope / MVP
  const featureCount = detectedFeatures.length + clearIntents.length;
  const scopeBroad = featureCount >= 8 || (vagueAreas.length >= 3 && featureCount >= 5);
  if (scopeBroad && !questions.some((q) => q.id === "q_core_feature")) {
    questions.push({
      id: "q_mvp",
      question: "What 3 features are non-negotiable for your MVP launch?",
      why: "The scope appears very broad — narrowing this will make the build faster.",
      category: "scope",
    });
  }

  // Trim to 3–5 questions
  const targetedQuestions = questions.slice(0, 5);
  // Ensure minimum 3 if we have room
  // (we may have fewer than 3 for very clear inputs — that's fine by spec "pick only what's unclear")

  // ── 7. Suggested title ────────────────────────────────────────────────────
  const suggestedTitle = buildTitle(rawText, detectedDomain, detectedFeatures, clearIntents);

  // ── 8. Confidence scoring ─────────────────────────────────────────────────
  const domainDetected = topScore > 0;
  const usersKnown = mentionsUsers;
  const featuresClear = clearIntents.length >= 2;
  const noContradictions = contradictions.length === 0;

  let confidence: "high" | "medium" | "low";
  if (domainDetected && usersKnown && featuresClear && noContradictions && vagueAreas.length <= 1) {
    confidence = "high";
  } else if (contradictions.length >= 2 || (!domainDetected && vagueAreas.length >= 3)) {
    confidence = "low";
  } else {
    confidence = "medium";
  }

  return {
    clearIntents,
    vagueAreas,
    contradictions,
    detectedDomain,
    detectedFeatures,
    targetedQuestions,
    confidence,
    suggestedTitle,
  };
}

// ─── Title builder ────────────────────────────────────────────────────────────

function buildTitle(
  rawText: string,
  domain: string,
  features: string[],
  clearIntents: string[]
): string {
  const lower = normalise(rawText);

  // Domain-specific suffixes
  const domainSuffix: Record<string, string> = {
    "SaaS web app": "Platform",
    "Mobile app": "App",
    "Game": "Game",
    "Browser extension": "Extension",
    "Discord bot": "Bot",
    "Desktop app": "App",
    "Developer tool / API": "Tool",
    "E-commerce": "Store",
    "AI/ML application": "AI",
    "Web application": "App",
  };

  // Try to extract a meaningful noun from the first sentence
  const firstSentence = rawText.split(/[.!?]/)[0] || rawText;
  const words = firstSentence.split(/\s+/);

  // Look for capitalized proper nouns or concrete nouns near the start
  const domainKeywords: Record<string, string> = {
    task: "Task",
    project: "Project",
    team: "Team",
    food: "Food",
    delivery: "Delivery",
    shop: "Shop",
    store: "Store",
    recipe: "Recipe",
    fitness: "Fitness",
    health: "Health",
    finance: "Finance",
    budget: "Budget",
    travel: "Travel",
    booking: "Booking",
    event: "Event",
    ticket: "Ticket",
    note: "Note",
    blog: "Blog",
    photo: "Photo",
    video: "Video",
    music: "Music",
    chat: "Chat",
    message: "Message",
    job: "Job",
    resume: "Resume",
    portfolio: "Portfolio",
    course: "Course",
    education: "Education",
    learning: "Learning",
    crm: "CRM",
    invoice: "Invoice",
    survey: "Survey",
    form: "Form",
    analytics: "Analytics",
    report: "Report",
    dashboard: "Dashboard",
    map: "Map",
    tab: "Tab",
    link: "Link",
    bookmark: "Bookmark",
    password: "Password",
    habit: "Habit",
    tracker: "Tracker",
  };

  let noun = "";
  for (const word of words) {
    const w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (domainKeywords[w]) {
      noun = domainKeywords[w];
      break;
    }
  }

  // Also check features for a noun
  if (!noun) {
    for (const feature of [...features, ...clearIntents]) {
      const fw = feature.split(" ")[0].toLowerCase().replace(/[^a-z]/g, "");
      if (domainKeywords[fw]) {
        noun = domainKeywords[fw];
        break;
      }
    }
  }

  // Special domain-driven titles
  if (!noun) {
    if (lower.includes("tab") && domain === "Browser extension") return "Tab Organizer";
    if (lower.includes("discord") || domain === "Discord bot") return "Discord Bot";
    if (lower.includes("ai") || lower.includes("ml")) {
      const subject = features[0] || clearIntents[0] || "";
      if (subject) {
        const capitalised = subject
          .split(" ")
          .slice(0, 2)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        return `AI ${capitalised}`;
      }
      return "AI Platform";
    }
  }

  const suffix = domainSuffix[domain] || "App";

  if (noun && noun.toLowerCase() !== suffix.toLowerCase()) {
    return `${noun} ${suffix}`;
  }

  // Fallback: use first feature
  const firstFeature = (features[0] || clearIntents[0] || "").split(" ").slice(0, 2);
  if (firstFeature.length > 0) {
    const capitalised = firstFeature
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `${capitalised} ${suffix}`;
  }

  return `New ${suffix}`;
}
