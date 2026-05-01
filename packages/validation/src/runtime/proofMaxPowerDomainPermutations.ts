import fs from "fs";
import path from "path";

type DomainId =
  | "web_saas_app"
  | "marketing_website"
  | "api_service"
  | "mobile_app"
  | "bot"
  | "ai_agent"
  | "game"
  | "dirty_repo_completion";

type DomainPermutation = {
  permutationId: string;
  requiredPaths: string[];
  placeholderScanPath: string;
};

type DomainPermutationSpec = {
  domainId: DomainId;
  permutations: DomainPermutation[];
};

const DOMAIN_SPECS: DomainPermutationSpec[] = [
  {
    domainId: "web_saas_app",
    permutations: [
      {
        permutationId: "saas_core_runtime",
        requiredPaths: ["app/page.tsx", "app/dashboard/page.tsx", "app/api/workflows/execute/route.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "saas_data_auth",
        requiredPaths: ["db/schema.sql", "auth/rbacPolicy.ts", "forms/projectForm.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "saas_deploy_package",
        requiredPaths: ["deploy/vercel.json", ".env.example", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "marketing_website",
    permutations: [
      {
        permutationId: "marketing_core_pages",
        requiredPaths: ["app/page.tsx", "app/pricing/page.tsx", "components/HeroSection.tsx"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "marketing_conversion_api",
        requiredPaths: ["app/api/lead-capture/route.ts", "config/seo.json", "tests/seo.test.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "marketing_deploy_package",
        requiredPaths: ["deploy/static-hosting.md", ".env.example", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "api_service",
    permutations: [
      {
        permutationId: "api_core_runtime",
        requiredPaths: ["src/server.ts", "src/routes/projects.ts", "src/controllers/projectsController.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "api_contract_data",
        requiredPaths: ["openapi/openapi.json", "schema/schema.sql", "tests/routes.test.js"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "api_deploy_package",
        requiredPaths: ["deploy/container.md", "deploy/Dockerfile", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "mobile_app",
    permutations: [
      {
        permutationId: "mobile_core_runtime",
        requiredPaths: ["src/App.tsx", "src/screens/HomeScreen.tsx", "src/navigation/index.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "mobile_state_services",
        requiredPaths: ["src/state/store.ts", "src/services/api.ts", "tests/navigation.test.js"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "mobile_release_package",
        requiredPaths: ["app.config.json", "deploy/app-store.md", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "bot",
    permutations: [
      {
        permutationId: "bot_core_runtime",
        requiredPaths: ["src/worker.ts", "src/commands/router.ts", "src/security/permissions.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "bot_safety_controls",
        requiredPaths: ["src/auth/tokenConfig.ts", "src/security/rateLimit.ts", "tests/permissions.test.js"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "bot_deploy_package",
        requiredPaths: [".env.example", "deploy/worker.md", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "ai_agent",
    permutations: [
      {
        permutationId: "agent_core_runtime",
        requiredPaths: ["src/agent.ts", "src/tools/manifest.ts", "src/safety/policy.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "agent_eval_audit",
        requiredPaths: ["src/evals/evaluationSuite.ts", "src/audit/log.ts", "src/memory/boundaries.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "agent_deploy_package",
        requiredPaths: ["src/cost/limits.ts", "deploy/agent-runtime.md", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "game",
    permutations: [
      {
        permutationId: "game_core_runtime",
        requiredPaths: ["src/gameLoop.ts", "src/input/playerInput.ts", "src/state/sessionState.ts"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "game_assets_save",
        requiredPaths: ["src/save/saveModel.ts", "assets/manifest.json", "tests/gameplay.test.js"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "game_export_package",
        requiredPaths: ["export/build-notes.md", "README.md", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
  {
    domainId: "dirty_repo_completion",
    permutations: [
      {
        permutationId: "repair_contract_runtime",
        requiredPaths: ["repair/completion_contract.json", "repair/repaired_file_manifest.json", "audit/repo_audit_report.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "repair_validation_bundle",
        requiredPaths: ["repair/repair_summary.md", "tests/repaired_workflows.test.js", "launch/launch_packet.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
      {
        permutationId: "repair_handoff_package",
        requiredPaths: ["launch/launch_instructions.md", "README.md", "domain_readiness.json"],
        placeholderScanPath: "no_placeholder_scan.json",
      },
    ],
  },
];

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function run() {
  const root = process.cwd();
  const generatedBase = path.join(root, "release-evidence", "generated-apps");
  const runtimeBase = path.join(root, "release-evidence", "runtime");
  ensureDir(runtimeBase);

  const results: Array<Record<string, unknown>> = [];
  let requiredPermutationCount = 0;
  let coveredPermutationCount = 0;

  for (const domainSpec of DOMAIN_SPECS) {
    const domainRoot = path.join(generatedBase, domainSpec.domainId);
    const domainExists = fs.existsSync(domainRoot);

    for (const permutation of domainSpec.permutations) {
      requiredPermutationCount += 1;
      const missingPaths: string[] = [];

      if (!domainExists) {
        missingPaths.push("domain_root_missing");
      } else {
        for (const rel of permutation.requiredPaths) {
          const full = path.join(domainRoot, rel);
          if (!fs.existsSync(full)) {
            missingPaths.push(rel);
            continue;
          }
          const content = fs.readFileSync(full, "utf8").trim();
          if (!content) missingPaths.push(`${rel}#empty`);
        }
      }

      let placeholderScanPassed = false;
      let placeholderIssues: string[] = [];
      const scanPath = path.join(domainRoot, permutation.placeholderScanPath);
      if (domainExists && fs.existsSync(scanPath)) {
        try {
          const scan = loadJson(scanPath);
          placeholderScanPassed = scan?.ok === true;
          placeholderIssues = Array.isArray(scan?.issues) ? scan.issues.map(String) : [];
        } catch {
          placeholderScanPassed = false;
          placeholderIssues = ["invalid_placeholder_scan_json"];
        }
      } else {
        placeholderIssues = ["placeholder_scan_missing"];
      }

      const status = missingPaths.length === 0 && placeholderScanPassed ? "passed" : "failed";
      if (status === "passed") coveredPermutationCount += 1;

      results.push({
        domainId: domainSpec.domainId,
        permutationId: permutation.permutationId,
        status,
        missingPaths,
        placeholderScanPassed,
        placeholderIssues,
      });
    }
  }

  const declaredDomainCount = DOMAIN_SPECS.length;
  const coveredDomainCount = new Set(results.filter((r) => r.status === "passed").map((r) => String(r.domainId))).size;
  const status = coveredPermutationCount === requiredPermutationCount && coveredDomainCount === declaredDomainCount ? "passed" : "failed";

  const corpus = {
    generatedAt: new Date().toISOString(),
    status,
    declaredDomainCount,
    coveredDomainCount,
    requiredPermutationCount,
    coveredPermutationCount,
    results,
  };

  const index = {
    status: status === "passed" ? "complete" : "incomplete",
    declaredDomains: DOMAIN_SPECS.map((d) => d.domainId),
    declaredDomainCount,
    coveredDomainCount,
    requiredPermutationCount,
    coveredPermutationCount,
    uncoveredReason: status === "passed" ? "none" : "One or more required domain permutations are missing or failed placeholder checks.",
  };

  fs.writeFileSync(path.join(runtimeBase, "max_power_domain_permutation_corpus.json"), JSON.stringify(corpus, null, 2));
  fs.writeFileSync(path.join(runtimeBase, "max_power_domain_permutation_index.json"), JSON.stringify(index, null, 2));

  console.log(`Max-power domain permutation proof written: status=${status} required=${requiredPermutationCount} covered=${coveredPermutationCount}`);

  if (status !== "passed") process.exit(1);
}

run();
