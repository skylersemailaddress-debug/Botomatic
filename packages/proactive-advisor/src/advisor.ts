import type {
  ProactiveAdvisory,
  ProactiveBlocker,
  SmartDefault,
  Contradiction,
  CreativeMode,
} from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function uid(prefix: string, n: number): string {
  return `${prefix}_${n}`;
}

function textContains(text: string, ...terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Blockers
// ---------------------------------------------------------------------------

function detectBlockers(
  spec: any,
  blueprint: any | null,
  requestText: string
): ProactiveBlocker[] {
  const blockers: ProactiveBlocker[] = [];
  let n = 0;

  // Gather a single combined text corpus for searching
  const specText = [
    spec.description ?? "",
    ...(Array.isArray(spec.openQuestions) ? spec.openQuestions.map((q: any) => (typeof q === "string" ? q : q.question ?? "")) : []),
    ...(Array.isArray(spec.risks) ? spec.risks : []),
    ...(Array.isArray(spec.constraints) ? spec.constraints : []),
    ...(Array.isArray(spec.integrations) ? spec.integrations : []),
    ...(Array.isArray(spec.pages) ? spec.pages : []),
    ...(Array.isArray(spec.components) ? spec.components : []),
    spec.authModel ?? "",
    spec.businessModel ?? "",
  ].join(" ");

  const allText = (specText + " " + requestText).toLowerCase();

  // --- No auth defined + user/team/account present ---
  const hasUserConcept = textContains(allText, "user", "team", "account");
  const hasAuth =
    textContains(allText, "auth", "login", "signin", "sign in", "oauth", "jwt", "session") ||
    (spec.authModel && spec.authModel.trim() !== "");

  if (hasUserConcept && !hasAuth) {
    blockers.push({
      id: uid("blocker", ++n),
      severity: "P0",
      title: "No authentication defined",
      description:
        "User-facing apps need auth before any other user feature can be built safely.",
      suggestedFix:
        "Define an auth model — NextAuth.js with email magic link is the recommended default.",
      packetsThatWillFail: ["auth_implementation", "user_management"],
    });
  }

  // --- Payment/billing/checkout but no payment provider ---
  const hasPaymentFeature = textContains(
    allText,
    "payment",
    "billing",
    "checkout",
    "subscribe",
    "subscription",
    "stripe",
    "paddle",
    "lemon squeezy"
  );
  const hasPaymentProvider = textContains(allText, "stripe", "paddle", "lemon squeezy", "braintree", "paypal");
  const hasPaymentsField =
    Array.isArray(spec.payments) && spec.payments.length > 0;

  if ((hasPaymentFeature || hasPaymentsField) && !hasPaymentProvider) {
    blockers.push({
      id: uid("blocker", ++n),
      severity: "P0",
      title: "Payment provider not specified",
      description:
        "The spec mentions payment/billing features but no payment processor is named.",
      suggestedFix:
        "Stripe is the standard default. Add 'Stripe' to your integrations or payments list.",
    });
  }

  // --- Database / data features but no DB specified ---
  const hasDataFeature = textContains(
    allText,
    "database",
    "data",
    "store",
    "save",
    "record",
    "entity",
    "table",
    "model"
  );
  const hasDbSpecified = textContains(
    allText,
    "postgres",
    "postgresql",
    "mysql",
    "sqlite",
    "mongodb",
    "supabase",
    "firebase",
    "planetscale",
    "neon",
    "turso",
    "prisma",
    "drizzle"
  );
  const hasDataEntities =
    Array.isArray(spec.dataEntities) && spec.dataEntities.length > 0;

  if ((hasDataFeature || hasDataEntities) && !hasDbSpecified) {
    blockers.push({
      id: uid("blocker", ++n),
      severity: "P1",
      title: "No database specified",
      description:
        "The spec references data storage but no database technology is mentioned.",
      suggestedFix:
        "PostgreSQL via Supabase is recommended — add 'Supabase (PostgreSQL)' to your integrations.",
    });
  }

  // --- openQuestions with mustAsk=true ---
  const openQuestions: any[] = Array.isArray(spec.openQuestions)
    ? spec.openQuestions
    : [];
  const mustAskItems = openQuestions.filter(
    (q: any) => typeof q === "object" && q !== null && q.mustAsk === true
  );
  if (mustAskItems.length > 0) {
    blockers.push({
      id: uid("blocker", ++n),
      severity: "P1",
      title: `${mustAskItems.length} required question${mustAskItems.length > 1 ? "s" : ""} unanswered`,
      description: `${mustAskItems.length} required question${mustAskItems.length > 1 ? "s" : ""} unanswered — build will likely fail validation.`,
      suggestedFix:
        "Answer all mustAsk questions before proceeding to the build phase.",
    });
  }

  // --- Deploy/launch goal but no deployment target ---
  const hasDeployGoal = textContains(
    allText,
    "deploy",
    "launch",
    "publish",
    "release",
    "ship"
  );
  const hasDeployTarget =
    textContains(
      allText,
      "vercel",
      "netlify",
      "railway",
      "fly.io",
      "aws",
      "gcp",
      "azure",
      "heroku",
      "render",
      "expo",
      "app store",
      "play store",
      "docker"
    ) || (spec.deploymentTarget && spec.deploymentTarget.trim() !== "");

  if (hasDeployGoal && !hasDeployTarget) {
    blockers.push({
      id: uid("blocker", ++n),
      severity: "P1",
      title: "No deployment target specified",
      description:
        "The spec mentions deployment or launch goals but no hosting target is defined.",
      suggestedFix:
        "Specify a deployment target: Vercel (web) or Expo (mobile) are the recommended defaults.",
    });
  }

  // --- readinessScore < 60 ---
  if (typeof spec.readinessScore === "number" && spec.readinessScore < 60) {
    blockers.push({
      id: uid("blocker", ++n),
      severity: "P0",
      title: `Spec readiness too low (${spec.readinessScore}%)`,
      description: `Spec readiness score is ${spec.readinessScore}% — below the 60% threshold required to begin building.`,
      suggestedFix:
        "Answer open questions and fill in critical fields to bring readiness above 60%.",
    });
  }

  // --- Blueprint riskyAssumptions ---
  if (
    blueprint &&
    Array.isArray(blueprint.riskyAssumptions) &&
    blueprint.riskyAssumptions.length > 0
  ) {
    for (const assumption of blueprint.riskyAssumptions) {
      const label =
        typeof assumption === "string"
          ? assumption
          : (assumption.description ?? assumption.title ?? JSON.stringify(assumption));
      blockers.push({
        id: uid("blocker", ++n),
        severity: "P2",
        title: "Risky assumption in blueprint",
        description: label,
        suggestedFix:
          "Review this assumption and either confirm it or replace it with an explicit decision.",
      });
    }
  }

  return blockers;
}

// ---------------------------------------------------------------------------
// Smart Defaults
// ---------------------------------------------------------------------------

function detectSmartDefaults(
  blueprint: any | null,
  requestText: string
): SmartDefault[] {
  const suggestions: SmartDefault[] = [];
  let n = 0;

  const blueprintId: string = (blueprint?.id ?? "").toLowerCase();
  const text = (requestText + " " + blueprintId).toLowerCase();

  const isSaaS =
    textContains(blueprintId, "saas", "dashboard", "web") ||
    textContains(text, "saas", "dashboard", "web app", "next.js", "nextjs");

  const isMobile =
    textContains(blueprintId, "react_native", "mobile", "rn_") ||
    textContains(text, "react native", "mobile app", "ios", "android");

  const isFlutter =
    textContains(blueprintId, "flutter") || textContains(text, "flutter");

  const isElectron =
    textContains(blueprintId, "electron") || textContains(text, "electron", "desktop app");

  const isDiscordBot =
    textContains(blueprintId, "discord") || textContains(text, "discord bot", "discord server");

  const isChromeExtension =
    textContains(blueprintId, "chrome", "extension") ||
    textContains(text, "chrome extension", "browser extension");

  const isGame =
    textContains(blueprintId, "unity", "game") ||
    textContains(text, "unity", "game", "multiplayer");

  if (isSaaS) {
    suggestions.push({
      id: uid("default", ++n),
      area: "Authentication",
      suggestion: "Use NextAuth.js with GitHub + email magic link",
      reason: "NextAuth.js is the battle-tested default for Next.js SaaS apps; supports OAuth and passwordless out of the box.",
      changeCommand: "use Clerk instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Database",
      suggestion: "Use Prisma + PostgreSQL (Supabase)",
      reason: "Prisma provides type-safe queries and Supabase offers managed Postgres with realtime and auth built in.",
      changeCommand: "use PlanetScale instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Deployment",
      suggestion: "Deploy to Vercel",
      reason: "Vercel is the zero-config deployment platform purpose-built for Next.js.",
      changeCommand: "deploy to Railway instead",
      applied: false,
    });
  } else if (isMobile) {
    suggestions.push({
      id: uid("default", ++n),
      area: "Navigation",
      suggestion: "Use React Navigation v6",
      reason: "React Navigation v6 is the community standard for routing in React Native apps.",
      changeCommand: "use Expo Router instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "State Management",
      suggestion: "Use Zustand",
      reason: "Zustand is lightweight, boilerplate-free, and works seamlessly with React Native.",
      changeCommand: "use Redux Toolkit instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Backend",
      suggestion: "Use Supabase",
      reason: "Supabase provides auth, database, and storage with a generous free tier — ideal for mobile backends.",
      changeCommand: "use Firebase instead",
      applied: false,
    });
  } else if (isFlutter) {
    suggestions.push({
      id: uid("default", ++n),
      area: "State Management",
      suggestion: "Use Riverpod 2.x",
      reason: "Riverpod 2.x is the modern, compile-safe state solution for Flutter with excellent DX.",
      changeCommand: "use Bloc instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Backend",
      suggestion: "Use Firebase or Supabase",
      reason: "Both provide Flutter SDKs; Firebase for Google ecosystem, Supabase for open-source PostgreSQL.",
      changeCommand: "use a custom backend instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Publishing",
      suggestion: "Use Fastlane for automated publishing",
      reason: "Fastlane automates screenshots, code signing, and app store submission for iOS and Android.",
      changeCommand: "use GitHub Actions manually instead",
      applied: false,
    });
  } else if (isElectron) {
    suggestions.push({
      id: uid("default", ++n),
      area: "IPC Architecture",
      suggestion: "Use contextBridge + preload script for IPC",
      reason: "contextBridge is the secure, modern Electron IPC pattern — avoids exposing Node APIs to renderer.",
      changeCommand: "use nodeIntegration instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Packaging",
      suggestion: "Use electron-builder for packaging",
      reason: "electron-builder supports cross-platform packaging, installers, and code signing out of the box.",
      changeCommand: "use electron-forge instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Auto-Update",
      suggestion: "Use electron-updater for auto-updates",
      reason: "electron-updater pairs with electron-builder and supports differential updates with minimal setup.",
      changeCommand: "use a custom update mechanism instead",
      applied: false,
    });
  } else if (isDiscordBot) {
    suggestions.push({
      id: uid("default", ++n),
      area: "Library",
      suggestion: "Use discord.js v14",
      reason: "discord.js v14 is the most widely used Discord library with full API coverage and active maintenance.",
      changeCommand: "use Eris instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Hosting",
      suggestion: "Host on Railway or Fly.io",
      reason: "Both platforms support always-on Node.js processes at low cost, which is what Discord bots require.",
      changeCommand: "host on a VPS instead",
      applied: false,
    });
  } else if (isChromeExtension) {
    suggestions.push({
      id: uid("default", ++n),
      area: "Manifest",
      suggestion: "Use Manifest v3 (required)",
      reason: "Manifest v2 is deprecated and blocked in Chrome. MV3 is required for new extensions.",
      changeCommand: "this is required, no alternative",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Bundler",
      suggestion: "Use Vite with CRXJS plugin",
      reason: "CRXJS adds HMR and automatic manifest handling to Vite, dramatically improving extension DX.",
      changeCommand: "use webpack instead",
      applied: false,
    });
  } else if (isGame) {
    suggestions.push({
      id: uid("default", ++n),
      area: "Input System",
      suggestion: "Use Unity's New Input System",
      reason: "The legacy Input Manager is deprecated. The New Input System supports multi-device and rebinding natively.",
      changeCommand: "use the legacy Input Manager instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Networking",
      suggestion: "Use Netcode for GameObjects (NGO)",
      reason: "NGO is Unity's first-party multiplayer solution, integrated with Relay and Lobby services.",
      changeCommand: "use Mirror or Fish-Net instead",
      applied: false,
    });
  } else {
    // Default catch-all suggestions
    suggestions.push({
      id: uid("default", ++n),
      area: "Language",
      suggestion: "Enable TypeScript strict mode",
      reason: "Strict mode catches null-safety bugs and improves refactoring confidence across the codebase.",
      changeCommand: "use JavaScript instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "Code Quality",
      suggestion: "Use ESLint + Prettier",
      reason: "Consistent formatting and linting catches bugs early and reduces review friction.",
      changeCommand: "use Biome instead",
      applied: false,
    });
    suggestions.push({
      id: uid("default", ++n),
      area: "CI/CD",
      suggestion: "Use GitHub Actions CI",
      reason: "GitHub Actions is free for open-source and tightly integrated — runs lint and tests on every PR.",
      changeCommand: "use CircleCI instead",
      applied: false,
    });
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Contradictions
// ---------------------------------------------------------------------------

function detectContradictions(requestText: string): Contradiction[] {
  const contradictions: Contradiction[] = [];
  let n = 0;
  const text = requestText.toLowerCase();

  // Three platforms at once
  const hasMobile = textContains(text, "mobile");
  const hasWeb = textContains(text, "web");
  const hasDesktop = textContains(text, "desktop");
  if (hasMobile && hasWeb && hasDesktop) {
    contradictions.push({
      id: uid("contradiction", ++n),
      field1: "platform: mobile + web",
      field2: "platform: desktop",
      description:
        "Three platforms at once — building mobile, web, and desktop simultaneously multiplies complexity and timeline.",
      resolution:
        "Pick a primary platform and ship the others in v2. Web is usually the fastest to validate.",
    });
  }

  // Simple/basic + 8+ features
  const isSimple = textContains(text, "simple", "basic");
  // Rough feature count: count common feature keywords
  const featureKeywords = [
    "auth", "authentication", "login",
    "payment", "billing", "checkout",
    "dashboard",
    "notification",
    "real-time", "realtime",
    "chat",
    "search",
    "analytics",
    "admin",
    "upload", "file",
    "api",
    "map",
    "social",
    "comments",
    "ratings",
    "scheduling",
    "calendar",
    "email",
    "export",
    "import",
    "roles",
    "permissions",
  ];
  const matchedFeatures = featureKeywords.filter((kw) => text.includes(kw));
  if (isSimple && matchedFeatures.length >= 8) {
    contradictions.push({
      id: uid("contradiction", ++n),
      field1: "scope: simple/basic",
      field2: `features: ${matchedFeatures.length}+ distinct features`,
      description: `Scope vs. simplicity conflict — ${matchedFeatures.length}+ features is not 'simple'. Expectation vs. reality mismatch will cause delays.`,
      resolution:
        "Either remove 'simple/basic' from the description, or reduce the feature list to a focused MVP (≤4 features).",
    });
  }

  // Real-time + static site
  const hasRealtime = textContains(text, "real-time", "realtime", "live update", "websocket", "socket");
  const hasStaticSite = textContains(text, "static site", "static website", "jamstack", "static export");
  if (hasRealtime && hasStaticSite) {
    contradictions.push({
      id: uid("contradiction", ++n),
      field1: "feature: real-time",
      field2: "architecture: static site",
      description:
        "Real-time data (WebSockets, live updates) requires a persistent server connection — a static site cannot provide this.",
      resolution:
        "Choose a dynamic deployment (Vercel Functions, Supabase Realtime) or remove the real-time requirement.",
    });
  }

  // Free + subscription in same sentence
  // Check proximity: look for both in the same sentence
  const sentences = text.split(/[.!?]/);
  for (const sentence of sentences) {
    const hasFree = textContains(sentence, "free");
    const hasPaid = textContains(sentence, "subscription", "paid", "premium", "charge");
    if (hasFree && hasPaid) {
      contradictions.push({
        id: uid("contradiction", ++n),
        field1: "pricing: free",
        field2: "pricing: subscription/paid",
        description:
          "Business model conflict: the same sentence mentions both 'free' and a paid subscription model.",
        resolution:
          "Clarify: freemium (free tier + paid upgrade), free during beta, or fully paid — pick one mental model.",
      });
      break; // only flag once
    }
  }

  // No backend + backend-requiring features
  const hasNoBackend = textContains(text, "no backend", "without backend", "serverless only", "frontend only");
  const backendRequiringFeatures = ["database", "auth", "real-time", "realtime", "api", "websocket"];
  const foundBackendFeatures = backendRequiringFeatures.filter((f) => text.includes(f));
  if (hasNoBackend && foundBackendFeatures.length > 0) {
    contradictions.push({
      id: uid("contradiction", ++n),
      field1: "architecture: no backend",
      field2: `features: ${foundBackendFeatures.join(", ")}`,
      description: `These features (${foundBackendFeatures.join(", ")}) require a backend — they cannot be built without server-side infrastructure.`,
      resolution:
        "Use a BaaS (Backend-as-a-Service) like Supabase or Firebase, or remove the no-backend constraint.",
    });
  }

  return contradictions;
}

// ---------------------------------------------------------------------------
// Creative Modes
// ---------------------------------------------------------------------------

function generateCreativeModes(requestText: string): CreativeMode[] {
  // We generate deterministic interpretations based on the request text.
  // For very short/vague requests we offer 3 creative angles.
  const text = requestText.toLowerCase();

  // Restaurant
  if (textContains(text, "restaurant")) {
    return [
      {
        id: "creative_1",
        title: "Restaurant Customer App",
        description: "Mobile app for customers to browse the menu, order, and track delivery.",
        platform: "Mobile (React Native)",
        estimatedComplexity: "medium",
      },
      {
        id: "creative_2",
        title: "Restaurant Management Dashboard",
        description: "Web dashboard for staff to manage orders, inventory, and reservations.",
        platform: "Web (Next.js)",
        estimatedComplexity: "complex",
      },
      {
        id: "creative_3",
        title: "Restaurant Menu & Booking",
        description: "Simple website with menu display and online table reservations.",
        platform: "Web (Next.js)",
        estimatedComplexity: "simple",
      },
    ];
  }

  // Fitness / health
  if (textContains(text, "fitness", "workout", "gym", "health", "exercise")) {
    return [
      {
        id: "creative_1",
        title: "Personal Fitness Tracker",
        description: "Mobile app to log workouts, track progress, and visualize fitness goals.",
        platform: "Mobile (React Native)",
        estimatedComplexity: "medium",
      },
      {
        id: "creative_2",
        title: "Gym Management Platform",
        description: "Web dashboard for gym owners to manage memberships, classes, and trainers.",
        platform: "Web (Next.js)",
        estimatedComplexity: "complex",
      },
      {
        id: "creative_3",
        title: "Workout Program Builder",
        description: "Simple web tool to create, share, and follow structured workout programs.",
        platform: "Web (Next.js)",
        estimatedComplexity: "simple",
      },
    ];
  }

  // E-commerce / shop / store
  if (textContains(text, "shop", "store", "ecommerce", "e-commerce", "sell", "marketplace")) {
    return [
      {
        id: "creative_1",
        title: "Consumer Shopping App",
        description: "Mobile storefront where customers browse products, add to cart, and checkout.",
        platform: "Mobile (React Native)",
        estimatedComplexity: "complex",
      },
      {
        id: "creative_2",
        title: "Seller Dashboard",
        description: "Web dashboard for merchants to manage listings, orders, and payouts.",
        platform: "Web (Next.js)",
        estimatedComplexity: "complex",
      },
      {
        id: "creative_3",
        title: "Simple Product Catalogue",
        description: "Static marketing site displaying products with a buy-now link to Stripe.",
        platform: "Web (Next.js)",
        estimatedComplexity: "simple",
      },
    ];
  }

  // Education / learning
  if (textContains(text, "education", "learn", "course", "school", "student", "tutor")) {
    return [
      {
        id: "creative_1",
        title: "Student Learning App",
        description: "Mobile app for students to access lessons, quizzes, and track their progress.",
        platform: "Mobile (React Native)",
        estimatedComplexity: "medium",
      },
      {
        id: "creative_2",
        title: "Course Creation Platform",
        description: "Web app where educators publish courses, videos, and assignments.",
        platform: "Web (Next.js)",
        estimatedComplexity: "complex",
      },
      {
        id: "creative_3",
        title: "Flashcard Study Tool",
        description: "Simple web tool for spaced-repetition flashcard study sessions.",
        platform: "Web (Next.js)",
        estimatedComplexity: "simple",
      },
    ];
  }

  // Generic fallback — three universal angles
  const topic = requestText.trim().replace(/^build (an? |a )?app (for )?/i, "").slice(0, 40) || "your idea";
  return [
    {
      id: "creative_1",
      title: `${capitalise(topic)} Consumer App`,
      description: `Mobile app for end users to interact with ${topic} on the go.`,
      platform: "Mobile (React Native)",
      estimatedComplexity: "medium",
    },
    {
      id: "creative_2",
      title: `${capitalise(topic)} Management Platform`,
      description: `Full-featured web platform to manage, analyse, and operate ${topic} at scale.`,
      platform: "Web (Next.js)",
      estimatedComplexity: "complex",
    },
    {
      id: "creative_3",
      title: `${capitalise(topic)} Landing & Booking`,
      description: `Minimal website to present ${topic} and capture leads or bookings.`,
      platform: "Web (Next.js)",
      estimatedComplexity: "simple",
    },
  ];
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Readiness verdict + summary
// ---------------------------------------------------------------------------

function computeVerdict(
  blockers: ProactiveBlocker[],
  contradictions: Contradiction[]
): ProactiveAdvisory["readinessVerdict"] {
  if (blockers.some((b) => b.severity === "P0")) return "blocked";
  if (blockers.some((b) => b.severity === "P1") || contradictions.length > 0)
    return "needs_clarification";
  return "ready";
}

function computeSummary(
  verdict: ProactiveAdvisory["readinessVerdict"],
  blockers: ProactiveBlocker[],
  contradictions: Contradiction[]
): string {
  if (verdict === "blocked") {
    const p0Count = blockers.filter((b) => b.severity === "P0").length;
    return `${p0Count} P0 blocker${p0Count !== 1 ? "s" : ""} must be resolved before building.`;
  }
  if (verdict === "needs_clarification") {
    const clarifyCount = blockers.filter((b) => b.severity === "P1").length + contradictions.length;
    return `Ready to build once ${clarifyCount} item${clarifyCount !== 1 ? "s are" : " is"} clarified.`;
  }
  return "Spec looks good — ready to build.";
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function analyzeSpecProactively(
  spec: any,
  blueprint: any | null,
  requestText: string
): ProactiveAdvisory {
  const blockers = detectBlockers(spec, blueprint, requestText);
  const suggestions = detectSmartDefaults(blueprint, requestText);
  const contradictions = detectContradictions(requestText);

  // Creative modes: show when spec confidence is low OR request is very short/vague
  const wordCount = requestText.trim().split(/\s+/).length;
  const specConfidenceLow =
    typeof spec.readinessScore === "number" && spec.readinessScore < 50;
  const showCreativeModes = wordCount < 30 || specConfidenceLow;
  const creativeModes: CreativeMode[] = showCreativeModes
    ? generateCreativeModes(requestText)
    : [];

  const readinessVerdict = computeVerdict(blockers, contradictions);
  const summary = computeSummary(readinessVerdict, blockers, contradictions);

  return {
    blockers,
    suggestions,
    contradictions,
    creativeModes,
    readinessVerdict,
    summary,
  };
}
