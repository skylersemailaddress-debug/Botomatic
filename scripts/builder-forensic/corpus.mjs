import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const FIXTURE_PATH = path.join(ROOT, "tests", "fixtures", "builder-forensic-corpus.json");
const RUBRIC_PATH = path.join(ROOT, "receipts", "builder-forensic", "scoring-rubric.json");

const categorySpecs = [
  ["one-page-landing-page", "One-page landing page"],
  ["local-service-site", "Local service site"],
  ["restaurant-order-app", "Restaurant/order app"],
  ["booking-scheduling-app", "Booking/scheduling app"],
  ["ecommerce-storefront", "Ecommerce storefront"],
  ["marketplace", "Marketplace"],
  ["saas-dashboard", "SaaS dashboard"],
  ["crm", "CRM"],
  ["project-management", "Project management"],
  ["support-ticketing", "Support ticketing"],
  ["course-lms", "Course/LMS"],
  ["finance-budgeting", "Finance/budgeting"],
  ["fitness-wellness", "Fitness/wellness"],
  ["events-community", "Events/community"],
  ["ai-writing-tool", "AI writing/tool app"],
  ["admin-internal-ops", "Admin/internal ops app"],
  ["inventory-logistics", "Inventory/logistics"],
  ["healthcare-intake-non-medical", "Healthcare-style intake (no medical advice)"],
  ["legal-intake-non-legal-advice", "Legal-style intake (no legal advice)"],
  ["real-estate-listings", "Real estate listings"],
  ["job-board", "Job board"],
  ["social-community-app", "Social/community app"],
  ["chat-collab-app", "Chat/collab app"],
  ["analytics-reporting-app", "Analytics/reporting app"],
  ["multi-tenant-app", "Multi-tenant app"],
  ["role-based-app", "Role-based app"],
  ["file-upload-heavy-app", "File-upload-heavy app"],
  ["auth-heavy-app", "Auth-heavy app"],
  ["payment-subscription-app", "Payment/subscription app"],
  ["api-integration-app", "API-integration app"],
  ["mobile-first-app", "Mobile-first app"],
  ["weird-vague-app", "Weird/vague app"],
  ["messy-typo-filled-prompt", "Messy typo-filled prompt"],
  ["contradictory-prompt", "Contradictory prompt"],
  ["huge-build-me-airbnb-uber-shopify", "Huge build-me Airbnb/Uber/Shopify prompt"],
  ["follow-up-edits-after-first-build", "Follow-up edits after first build"],
  ["make-it-prettier-design-edit", "Make it prettier design edits"],
  ["add-auth-payments-email-db-edit", "Add auth/payments/email/database edits"],
  ["failure-recovery-prompts", "Failure recovery prompts"],
  ["dirty-repo-repair-build-prompts", "Dirty repo repair/build prompts"]
];

const variants = [
  {
    complexity: "easy",
    style: "clear",
    suffix: "Keep scope tight and production-realistic for private owner beta.",
  },
  {
    complexity: "medium",
    style: "normal",
    suffix: "Include realistic auth, CRUD, and operational workflows.",
  },
  {
    complexity: "hard",
    style: "messy",
    suffix: "Include multi-role workflows, edge cases, and import/export flows.",
  },
  {
    complexity: "extreme",
    style: "ambiguous",
    suffix: "Handle contradictory asks honestly and block unsupported claims without faking.",
  },
  {
    complexity: "hard",
    style: "followup",
    suffix: "Assume this is an iterative follow-up requiring safe edits on an existing generated app.",
  },
];

function titleCase(slug) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function requiredCapabilities(category, complexity) {
  const base = [
    "spec extraction",
    "build contract creation",
    "planning",
    "code generation",
    "file output",
    "runtime smoke",
    "no-placeholder validation",
    "honest unsupported-state reporting"
  ];
  if (category.includes("auth") || category.includes("role")) base.push("auth and authorization wiring");
  if (category.includes("payment") || category.includes("ecommerce")) base.push("payment boundary honesty");
  if (category.includes("api")) base.push("external API adapter and failure handling");
  if (category.includes("upload")) base.push("file intake and storage boundary");
  if (category.includes("dirty-repo")) base.push("dirty-repo repair planning");
  if (category.includes("follow-up") || category.includes("edit") || category.includes("recovery")) base.push("safe follow-up edit and repair loop");
  if (complexity === "extreme") base.push("blocker classification under ambiguity");
  return Array.from(new Set(base));
}

function minimumChecks(category) {
  const checks = [
    "project created from prompt",
    "operator/build path invoked",
    "build state persisted",
    "result classified PASS/BLOCKED/FAIL",
    "no fake success artifacts"
  ];
  if (category.includes("follow-up") || category.includes("edit")) {
    checks.push("follow-up edit applied without unrelated file destruction");
  }
  if (category.includes("payment") || category.includes("auth") || category.includes("api")) {
    checks.push("unavailable credentials/integrations blocked honestly");
  }
  return checks;
}

function unsupportedRisks(category) {
  const risks = [];
  if (category.includes("payment")) risks.push("stripe/webhook credentials unavailable in local harness");
  if (category.includes("healthcare")) risks.push("must avoid medical advice claims");
  if (category.includes("legal")) risks.push("must avoid legal advice claims");
  if (category.includes("mobile")) risks.push("native iOS/Android build chain may be unavailable");
  if (category.includes("huge-build")) risks.push("scope too large for single-pass build; partial expected");
  if (category.includes("dirty-repo")) risks.push("requires controlled sandbox for destructive operations");
  if (risks.length === 0) risks.push("feature/provider availability may require explicit credentials");
  return risks;
}

function makePrompt(category, label, variantIndex, variant) {
  const n = variantIndex + 1;
  const labelText = titleCase(category);
  if (category === "messy-typo-filled-prompt") {
    return `plz mak a ${label} for my biz rn ${n}, i need login maybe maybe not, add db + emails + all pages but no bugs k thx. ${variant.suffix}`;
  }
  if (category === "contradictory-prompt") {
    return `Build ${labelText} case ${n}: must be serverless and also require always-on local stateful socket server, include zero auth and strict RBAC auth simultaneously. ${variant.suffix}`;
  }
  if (category === "weird-vague-app") {
    return `Build something like ${labelText} case ${n} that feels magical and futuristic for three user types, but I do not know exact features yet. Start with sensible defaults and surface assumptions. ${variant.suffix}`;
  }
  if (category === "huge-build-me-airbnb-uber-shopify") {
    return `Build me an Airbnb + Uber + Shopify hybrid platform case ${n} with multi-region, real-time dispatch, payments, inventory, host/driver/seller/admin roles, mobile web, and analytics. ${variant.suffix}`;
  }
  if (category === "follow-up-edits-after-first-build") {
    return `Follow-up edit case ${n}: after initial build, add a pricing page, analytics dashboard, and audit log while preserving existing flows and file structure. ${variant.suffix}`;
  }
  if (category === "make-it-prettier-design-edit") {
    return `Follow-up design edit case ${n}: keep current layout semantics but improve visual quality and spacing without breaking existing routes or behavior. ${variant.suffix}`;
  }
  if (category === "add-auth-payments-email-db-edit") {
    return `Follow-up capability edit case ${n}: add auth, subscription billing, email notifications, and database CRUD with honest blockers when credentials are missing. ${variant.suffix}`;
  }
  if (category === "failure-recovery-prompts") {
    return `Recovery case ${n}: the previous generated app build now fails compile/runtime. Diagnose, classify, repair, rerun, and document exact root cause and rollback path. ${variant.suffix}`;
  }
  if (category === "dirty-repo-repair-build-prompts") {
    return `Dirty-repo case ${n}: continue from a partially broken repository with merge artifacts, missing scripts, and placeholder text. Repair safely and preserve user changes. ${variant.suffix}`;
  }
  return `Build a ${label} case ${n} for private owner beta with ${variant.style} requirements and ${variant.complexity} complexity. Include realistic user journeys, admin operations, and explicit blockers for unsupported integrations. ${variant.suffix}`;
}

export function buildCorpus() {
  const items = [];
  let globalIndex = 1;
  for (const [category, label] of categorySpecs) {
    variants.forEach((variant, variantIndex) => {
      const id = `bf-${String(globalIndex).padStart(3, "0")}`;
      const prompt = makePrompt(category, label, variantIndex, variant);
      items.push({
        id,
        category,
        complexity: variant.complexity,
        prompt,
        requiredCapabilities: requiredCapabilities(category, variant.complexity),
        expectedOutputType: category.includes("edit") || category.includes("follow-up") || category.includes("recovery")
          ? "follow_up_edit_or_repair"
          : "generated_app_or_honest_blocker",
        minimumAcceptanceChecks: minimumChecks(category),
        unsupportedRiskNotes: unsupportedRisks(category)
      });
      globalIndex += 1;
    });
  }

  return {
    corpusVersion: "1",
    generatedAt: new Date().toISOString(),
    totalPrompts: items.length,
    categoryCount: categorySpecs.length,
    categories: categorySpecs.map(([key, value]) => ({ id: key, label: value })),
    items,
  };
}

export function scoringRubric() {
  return {
    rubricVersion: "1",
    generatedAt: new Date().toISOString(),
    scalarScores: [
      "spec relevance: 0-5",
      "architecture completeness: 0-5",
      "UI completeness: 0-5",
      "data/state model: 0-5",
      "API/backend wiring: 0-5",
      "auth/payment/external service honesty: 0-5"
    ],
    binaryChecks: [
      "runtime build success: pass/fail",
      "generated app smoke success: pass/fail",
      "tests generated/executed: pass/fail",
      "no placeholder/fake content: pass/fail",
      "follow-up edit success: pass/fail",
      "repair loop success: pass/fail"
    ],
    readinessBand: "commercial readiness: blocked/partial/pass",
    classifications: [
      "PASS_REAL",
      "PASS_PARTIAL",
      "BLOCKED_UNSUPPORTED",
      "FAIL_BUILDER",
      "FAIL_RUNTIME",
      "FAIL_QUALITY",
      "FAIL_FAKE"
    ],
  };
}

async function main() {
  const corpus = buildCorpus();
  const rubric = scoringRubric();
  await fs.mkdir(path.dirname(FIXTURE_PATH), { recursive: true });
  await fs.mkdir(path.dirname(RUBRIC_PATH), { recursive: true });
  await fs.writeFile(FIXTURE_PATH, JSON.stringify(corpus, null, 2), "utf8");
  await fs.writeFile(RUBRIC_PATH, JSON.stringify(rubric, null, 2), "utf8");
  process.stdout.write(`builder-forensic corpus generated: ${FIXTURE_PATH}\n`);
  process.stdout.write(`builder-forensic rubric generated: ${RUBRIC_PATH}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
