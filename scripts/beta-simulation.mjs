import fs from "fs/promises";
import path from "path";
import { performance } from "perf_hooks";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_BASE_URL = process.env.API_BASE_URL || process.env.BOTOMATIC_API_BASE_URL || "http://localhost:3001";
const BOTOMATIC_API_TOKEN = process.env.BOTOMATIC_API_TOKEN || "dev-api-token";
const BOTOMATIC_REVIEWER_TOKEN = process.env.BOTOMATIC_REVIEWER_TOKEN || "";
const OUTPUT_DIR = path.join(process.cwd(), "receipts", "beta-simulation");
const REPORT_JSON_PATH = path.join(OUTPUT_DIR, "beta-simulation-report.json");
const REPORT_MD_PATH = path.join(OUTPUT_DIR, "beta-simulation-report.md");
const RAW_LOG_PATH = path.join(OUTPUT_DIR, "beta-simulation-requests.json");

const PERSONA_SPECS = [
  ["first-time nontechnical users", 20],
  ["power builders", 15],
  ["owner/admin users", 10],
  ["reviewer/approval users", 10],
  ["file-upload-heavy users", 10],
  ["chat-heavy users", 10],
  ["generated-app testers", 10],
  ["error-path testers", 5],
  ["mobile/responsive-path testers", 5],
  ["recovery/rollback testers", 5],
];

const CRITICAL_WORKFLOWS = [
  "landing_load",
  "dashboard_load",
  "new_project",
  "intake_submission",
  "spec_analysis",
  "build_contract_creation",
  "contract_approval",
  "compile",
  "plan_generation",
  "execute_next",
  "generated_status_check",
  "chat_general",
  "chat_project",
  "chat_file",
  "chat_admin",
  "unauthorized_rejected",
  "bad_token_rejected",
  "deploy_guard",
  "rollback_guard",
  "audit_check",
  "error_handling",
  "state_persistence",
];

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function summarizeBody(body) {
  if (body === null || body === undefined) return "<empty>";
  if (typeof body === "string") return body.slice(0, 180);
  if (typeof body === "object") {
    if (typeof body.error === "string") return `error:${body.error}`.slice(0, 180);
    const keys = Object.keys(body).slice(0, 8);
    return `keys:${keys.join(",")}`;
  }
  return String(body).slice(0, 180);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function makeUsers() {
  const users = [];
  let counter = 1;
  for (const [persona, count] of PERSONA_SPECS) {
    for (let i = 0; i < count; i += 1) {
      users.push({
        userId: `beta-user-${String(counter).padStart(3, "0")}`,
        persona,
        index: counter,
      });
      counter += 1;
    }
  }
  return users;
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

function createRecorder() {
  const requests = [];
  return {
    requests,
    async request(user, workflow, method, url, options = {}) {
      const start = performance.now();
      const headers = { ...(options.headers || {}) };
      const finalOptions = { method, headers };

      if (options.body !== undefined) {
        if (options.body instanceof FormData) {
          finalOptions.body = options.body;
        } else {
          headers["Content-Type"] = "application/json";
          finalOptions.body = JSON.stringify(options.body);
        }
      }

      const response = await fetch(url, finalOptions);
      const latencyMs = Math.round((performance.now() - start) * 100) / 100;
      const raw = await response.text();
      let body = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = raw;
      }

      const record = {
        at: new Date().toISOString(),
        userId: user.userId,
        persona: user.persona,
        workflow,
        method,
        url,
        status: response.status,
        ok: response.ok,
        latencyMs,
        responseSummary: summarizeBody(body),
      };
      requests.push(record);
      return { response, status: response.status, body, latencyMs, record };
    },
  };
}

function authHeaders(token = BOTOMATIC_API_TOKEN) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(recorder, user, workflow, method, routePath, options = {}) {
  return recorder.request(user, workflow, method, `${API_BASE_URL}${routePath}`, options);
}

async function uiRequest(recorder, user, workflow, routePath, options = {}) {
  return recorder.request(user, workflow, "GET", `${BASE_URL}${routePath}`, options);
}

function buildProjectName(user) {
  return `${user.persona} ${user.userId}`;
}

function buildProjectRequest(user) {
  return `Build a commercially ready ${slugify(user.persona)} application with auth, approvals, builder flow, generated app quality, observability, and deployment safeguards for ${user.userId}. Decide for me using safe defaults. Compliance targets include SOC2 and GDPR. Pricing model is tiered paid subscription with trial.`;
}

async function ensureBuildContractReady(recorder, user, projectId, results) {
  const retryAnalyze = await apiRequest(recorder, user, "spec_analysis_remediation", "POST", `/api/projects/${projectId}/spec/analyze`, {
    headers: authHeaders(),
    body: {
      message: "Decide for me using safe defaults. Treat compliance as SOC2 and GDPR. Keep tiered paid subscription pricing and proceed to build-ready contract.",
    },
  });
  results.push({ workflow: "spec_analysis_remediation", passed: retryAnalyze.status === 200, critical: false, details: `status=${retryAnalyze.status}` });

  const status = await apiRequest(recorder, user, "spec_status_remediation", "GET", `/api/projects/${projectId}/spec/status`, {
    headers: authHeaders(),
  });

  const assumptions = Array.isArray(status.body?.spec?.assumptions) ? status.body.spec.assumptions : [];
  const assumptionIds = assumptions.filter((item) => item?.requiresApproval && !item?.approved).map((item) => item.id);
  if (assumptionIds.length > 0) {
    const assumptionAccept = await apiRequest(recorder, user, "assumption_accept_remediation", "POST", `/api/projects/${projectId}/spec/assumptions/accept`, {
      headers: authHeaders(),
      body: { assumptionIds },
    });
    results.push({ workflow: "assumption_accept_remediation", passed: assumptionAccept.status === 200, critical: false, details: `status=${assumptionAccept.status}` });
  }

  const rebuilt = await apiRequest(recorder, user, "build_contract_rebuild", "POST", `/api/projects/${projectId}/spec/build-contract`, {
    headers: authHeaders(),
    body: {},
  });
  results.push({ workflow: "build_contract_rebuild", passed: rebuilt.status === 200, critical: false, details: `status=${rebuilt.status}` });
  return rebuilt;
}

async function createProject(recorder, user) {
  const intake = await apiRequest(recorder, user, "new_project", "POST", "/api/projects/intake", {
    headers: authHeaders(),
    body: { name: buildProjectName(user), request: buildProjectRequest(user) },
  });
  if (intake.status !== 200 || !intake.body?.projectId) {
    throw new Error(`project_intake_failed:${intake.status}`);
  }
  return String(intake.body.projectId);
}

async function uploadFile(recorder, user, projectId, workflow, fileName, content, mimeType, expectedStatuses = [200]) {
  const form = new FormData();
  form.append("file", new Blob([content], { type: mimeType }), fileName);
  const result = await apiRequest(recorder, user, workflow, "POST", `/api/projects/${projectId}/intake/file`, {
    headers: authHeaders(),
    body: form,
  });
  const passed = expectedStatuses.includes(result.status);
  return { ...result, passed };
}

async function runCommonFlow(recorder, user, results) {
  const landing = await uiRequest(recorder, user, "landing_load", "/");
  results.push({ workflow: "landing_load", passed: landing.status === 200, critical: true, details: `status=${landing.status}` });

  const projectId = await createProject(recorder, user);
  const dashboard = await uiRequest(recorder, user, "dashboard_load", `/projects/${projectId}`);
  results.push({ workflow: "dashboard_load", passed: dashboard.status === 200, critical: true, details: `status=${dashboard.status} projectId=${projectId}` });

  const pasted = await apiRequest(recorder, user, "intake_submission", "POST", `/api/projects/${projectId}/intake/pasted-text`, {
    headers: authHeaders(),
    body: { text: `User ${user.userId} pasted requirements for ${user.persona}.`, displayName: `${user.userId}.md` },
  });
  results.push({ workflow: "intake_submission", passed: pasted.status === 200, critical: true, details: `status=${pasted.status}` });

  const analyze = await apiRequest(recorder, user, "spec_analysis", "POST", `/api/projects/${projectId}/spec/analyze`, {
    headers: authHeaders(),
    body: { message: `Analyze spec for ${user.persona}` },
  });
  results.push({ workflow: "spec_analysis", passed: analyze.status === 200, critical: true, details: `status=${analyze.status}` });

  const clarify = await apiRequest(recorder, user, "approval_gate_creation", "POST", `/api/projects/${projectId}/spec/clarify`, {
    headers: authHeaders(),
    body: {},
  });
  results.push({ workflow: "approval_gate_creation", passed: clarify.status === 200, critical: false, details: `status=${clarify.status}` });

  const specStatus = await apiRequest(recorder, user, "spec_status", "GET", `/api/projects/${projectId}/spec/status`, {
    headers: authHeaders(),
  });
  const assumptions = Array.isArray(specStatus.body?.spec?.assumptions) ? specStatus.body.spec.assumptions : [];
  const assumptionIds = assumptions.filter((item) => item?.requiresApproval && !item?.approved).map((item) => item.id);
  if (assumptionIds.length > 0) {
    const assumptionAccept = await apiRequest(recorder, user, "assumption_accept", "POST", `/api/projects/${projectId}/spec/assumptions/accept`, {
      headers: authHeaders(),
      body: { assumptionIds },
    });
    results.push({ workflow: "assumption_accept", passed: assumptionAccept.status === 200, critical: false, details: `status=${assumptionAccept.status}` });
  }

  const buildContract = await apiRequest(recorder, user, "build_contract_creation", "POST", `/api/projects/${projectId}/spec/build-contract`, {
    headers: authHeaders(),
    body: {},
  });
  results.push({ workflow: "build_contract_creation", passed: buildContract.status === 200, critical: true, details: `status=${buildContract.status}` });

  let activeContract = buildContract;
  if (buildContract.status === 200 && !buildContract.body?.contract?.readyToBuild) {
    activeContract = await ensureBuildContractReady(recorder, user, projectId, results);
  }

  const approveContract = await apiRequest(recorder, user, "contract_approval", "POST", `/api/projects/${projectId}/spec/approve`, {
    headers: authHeaders(),
    body: {},
  });
  const contractReady = activeContract.body?.contract?.readyToBuild === true;
  results.push({ workflow: "contract_approval", passed: approveContract.status === 200 && contractReady, critical: true, details: `status=${approveContract.status} ready=${contractReady}` });

  const compile = await apiRequest(recorder, user, "compile", "POST", `/api/projects/${projectId}/compile`, {
    headers: authHeaders(),
    body: {},
  });
  results.push({ workflow: "compile", passed: compile.status === 200, critical: true, details: `status=${compile.status}` });

  const plan = await apiRequest(recorder, user, "plan_generation", "POST", `/api/projects/${projectId}/plan`, {
    headers: authHeaders(),
    body: {},
  });
  results.push({ workflow: "plan_generation", passed: plan.status === 200, critical: true, details: `status=${plan.status}` });

  const execute = await apiRequest(recorder, user, "execute_next", "POST", `/api/projects/${projectId}/dispatch/execute-next`, {
    headers: authHeaders(),
    body: {},
  });
  results.push({ workflow: "execute_next", passed: execute.status === 202, critical: true, details: `status=${execute.status}` });

  const projectStatus = await apiRequest(recorder, user, "generated_status_check", "GET", `/api/projects/${projectId}/status`, {
    headers: authHeaders(),
  });
  results.push({ workflow: "generated_status_check", passed: projectStatus.status === 200, critical: true, details: `status=${projectStatus.status}` });

  const overview = await apiRequest(recorder, user, "generated_preview_status", "GET", `/api/projects/${projectId}/ui/overview`, {
    headers: authHeaders(),
  });
  results.push({ workflow: "generated_preview_status", passed: overview.status === 200, critical: false, details: `status=${overview.status}` });

  return { projectId, specStatus: specStatus.body, projectStatus: projectStatus.body };
}

async function runChatFlows(recorder, user, projectId, results) {
  const messages = [
    ["chat_general", "What is the current status of this project?"],
    ["chat_project", "Create a build contract and explain blockers if any."],
    ["chat_file", "Use the uploaded file context and tell me what is missing."],
    ["chat_admin", "Approve governance and tell me what would block launch."],
  ];

  for (const [workflow, message] of messages) {
    const response = await apiRequest(recorder, user, workflow, "POST", `/api/projects/${projectId}/operator/send`, {
      headers: authHeaders(),
      body: { message },
    });
    results.push({ workflow, passed: response.status === 200, critical: workflow !== "chat_admin", details: `status=${response.status} route=${response.body?.route || "unknown"}` });
  }
}

async function runFileFlows(recorder, user, projectId, results) {
  const uploads = [
    ["notes.txt", "text/plain", "plain text upload for intake"],
    ["brief.md", "text/markdown", "# Brief\nCommercial product requirements"],
    ["data.csv", "text/csv", "col1,col2\na,b\n"],
    ["config.json", "application/json", JSON.stringify({ auth: true, ui: "dashboard" })],
  ];
  for (const [fileName, mimeType, content] of uploads) {
    const upload = await uploadFile(recorder, user, projectId, `file_ingestion_${fileName}`, fileName, content, mimeType, [200]);
    results.push({ workflow: `file_ingestion_${fileName}`, passed: upload.passed, critical: true, details: `status=${upload.status}` });
  }
  const invalid = await uploadFile(recorder, user, projectId, "file_ingestion_invalid", "malware.exe", "MZ-binary", "application/octet-stream", [400]);
  results.push({ workflow: "file_ingestion_invalid", passed: invalid.passed, critical: true, details: `status=${invalid.status}` });
}

async function runAuthAndGateChecks(recorder, user, projectId, results, notes) {
  const unauthorized = await apiRequest(recorder, user, "unauthorized_rejected", "POST", "/api/projects/intake", {
    headers: {},
    body: { name: "Unauthorized", request: "Should fail" },
  });
  results.push({ workflow: "unauthorized_rejected", passed: unauthorized.status === 401, critical: true, details: `status=${unauthorized.status}` });

  const badToken = await apiRequest(recorder, user, "bad_token_rejected", "POST", "/api/projects/intake", {
    headers: authHeaders("definitely-wrong-token"),
    body: { name: "Bad Token", request: "Should fail" },
  });
  results.push({ workflow: "bad_token_rejected", passed: badToken.status === 401, critical: true, details: `status=${badToken.status}` });

  const unauthorizedApprove = await apiRequest(recorder, user, "unauthorized_approval_rejected", "POST", `/api/projects/${projectId}/spec/approve`, {
    headers: {},
    body: {},
  });
  results.push({ workflow: "unauthorized_approval_rejected", passed: unauthorizedApprove.status === 401, critical: true, details: `status=${unauthorizedApprove.status}` });

  if (BOTOMATIC_REVIEWER_TOKEN) {
    const reviewerAdmin = await apiRequest(recorder, user, "reviewer_admin_denied", "POST", `/api/projects/${projectId}/deploy/promote`, {
      headers: authHeaders(BOTOMATIC_REVIEWER_TOKEN),
      body: { environment: "prod" },
    });
    results.push({ workflow: "reviewer_admin_denied", passed: reviewerAdmin.status === 403, critical: true, details: `status=${reviewerAdmin.status}` });
  } else {
    notes.push("NOT_PROVEN: reviewer cannot do admin-only action requires BOTOMATIC_REVIEWER_TOKEN or OIDC reviewer credentials.");
    results.push({ workflow: "reviewer_admin_denied", passed: false, notProven: true, critical: false, details: "missing reviewer credential source" });
  }

  const governanceCapture = await apiRequest(recorder, user, "governance_capture", "POST", `/api/projects/${projectId}/governance/approval`, {
    headers: authHeaders(),
    body: { runtimeProofStatus: "captured" },
  });
  const governanceApprove = await apiRequest(recorder, user, "owner_approval", "POST", `/api/projects/${projectId}/governance/approval`, {
    headers: authHeaders(),
    body: { approvalStatus: "approved" },
  });
  results.push({ workflow: "owner_approval", passed: governanceCapture.status === 200 && governanceApprove.status === 200, critical: true, details: `capture=${governanceCapture.status} approve=${governanceApprove.status}` });

  const gate = await apiRequest(recorder, user, "gate_status", "GET", `/api/projects/${projectId}/ui/gate`, {
    headers: authHeaders(),
  });
  results.push({ workflow: "gate_status", passed: gate.status === 200, critical: false, details: `status=${gate.status}` });

  const promote = await apiRequest(recorder, user, "deploy_guard", "POST", `/api/projects/${projectId}/deploy/promote`, {
    headers: authHeaders(),
    body: { environment: "prod" },
  });
  results.push({ workflow: "deploy_guard", passed: [200, 409].includes(promote.status), critical: true, details: `status=${promote.status}` });

  const rollback = await apiRequest(recorder, user, "rollback_guard", "POST", `/api/projects/${projectId}/deploy/rollback`, {
    headers: authHeaders(),
    body: { environment: "prod" },
  });
  results.push({ workflow: "rollback_guard", passed: [200, 409].includes(rollback.status), critical: true, details: `status=${rollback.status}` });

  notes.push("NOT_PROVEN: no dedicated live HTTP deploy dry-run or rollback dry-run route exists; deployment readiness is validated via proof artifacts, not owner-facing API dry-run endpoints.");
}

async function runObservabilityAndStateChecks(recorder, user, projectId, results) {
  const audit = await apiRequest(recorder, user, "audit_check", "GET", `/api/projects/${projectId}/ui/audit`, {
    headers: authHeaders(),
  });
  results.push({ workflow: "audit_check", passed: audit.status === 200, critical: true, details: `status=${audit.status}` });

  const securityCenter = await apiRequest(recorder, user, "security_center", "GET", `/api/projects/${projectId}/ui/security-center`, {
    headers: authHeaders(),
  });
  results.push({ workflow: "security_center", passed: securityCenter.status === 200, critical: false, details: `status=${securityCenter.status}` });

  const badProject = await apiRequest(recorder, user, "error_handling", "GET", `/api/projects/proj_missing_${user.index}/status`, {
    headers: authHeaders(),
  });
  const errorPassed = badProject.status === 404 && !String(badProject.body?.error || "").toLowerCase().includes("referenceerror");
  results.push({ workflow: "error_handling", passed: errorPassed, critical: true, details: `status=${badProject.status}` });

  const first = await apiRequest(recorder, user, "state_persistence", "GET", `/api/projects/${projectId}/status`, {
    headers: authHeaders(),
  });
  const second = await apiRequest(recorder, user, "state_persistence_reload", "GET", `/api/projects/${projectId}/status`, {
    headers: authHeaders(),
  });
  const persisted = first.status === 200 && second.status === 200 && first.body?.projectId === second.body?.projectId;
  results.push({ workflow: "state_persistence", passed: persisted, critical: true, details: `first=${first.status} second=${second.status}` });
}

async function runUiSurfaceChecks(recorder, user, projectId, results) {
  const routes = [
    `/projects/${projectId}/vibe`,
    `/projects/${projectId}/advanced`,
    `/projects/${projectId}/deployment`,
    `/projects/${projectId}/evidence`,
    `/projects/${projectId}/settings`,
    `/projects/${projectId}/logs`,
  ];
  for (const route of routes) {
    const response = await uiRequest(recorder, user, `ui_surface_${route}`, route, {
      headers: user.persona === "mobile/responsive-path testers" ? { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" } : {},
    });
    const passed = response.status === 200 && !String(response.body || "").toLowerCase().includes("referenceerror");
    results.push({ workflow: `ui_surface_${route}`, passed, critical: false, details: `status=${response.status}` });
  }
}

async function runUserScenario(recorder, user) {
  const results = [];
  const notes = [];
  const { projectId } = await runCommonFlow(recorder, user, results);

  if (user.persona === "file-upload-heavy users" || user.persona === "generated-app testers") {
    await runFileFlows(recorder, user, projectId, results);
  }

  if (user.persona === "chat-heavy users" || user.persona === "power builders" || user.persona === "first-time nontechnical users") {
    await runChatFlows(recorder, user, projectId, results);
  }

  if (user.persona === "owner/admin users" || user.persona === "reviewer/approval users" || user.persona === "recovery/rollback testers") {
    await runAuthAndGateChecks(recorder, user, projectId, results, notes);
  }

  if (user.persona === "mobile/responsive-path testers" || user.persona === "generated-app testers") {
    await runUiSurfaceChecks(recorder, user, projectId, results);
  }

  if (user.persona === "error-path testers" || user.persona === "recovery/rollback testers" || user.persona === "owner/admin users") {
    await runObservabilityAndStateChecks(recorder, user, projectId, results);
  }

  return { userId: user.userId, persona: user.persona, projectId, results, notes };
}

async function runWithConcurrency(items, limit, worker) {
  const out = [];
  let index = 0;
  async function runOne() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      out.push(await worker(current));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runOne()));
  return out;
}

function summarizeSimulation(users, requestLog, userRuns) {
  const workflowStats = new Map();
  const notProven = [];
  let criticalFailures = 0;
  let logicalSuccessCount = 0;
  let logicalEvaluatedCount = 0;

  for (const run of userRuns) {
    for (const note of run.notes) notProven.push(note);
    for (const result of run.results) {
      const current = workflowStats.get(result.workflow) || { total: 0, passed: 0, failed: 0, notProven: 0, critical: Boolean(result.critical) };
      current.total += 1;
      current.critical = current.critical || Boolean(result.critical);
      if (result.notProven) {
        current.notProven += 1;
      } else if (result.passed) {
        current.passed += 1;
        logicalSuccessCount += 1;
        logicalEvaluatedCount += 1;
      } else {
        current.failed += 1;
        logicalEvaluatedCount += 1;
        if (result.critical) criticalFailures += 1;
      }
      workflowStats.set(result.workflow, current);
    }
  }

  const workflowSummary = Array.from(workflowStats.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([workflow, stats]) => ({ workflow, ...stats }));
  const requestSuccessRate = requestLog.length === 0 ? 0 : Number(((requestLog.filter((entry) => entry.ok).length / requestLog.length) * 100).toFixed(2));
  const workflowSuccessRate = logicalEvaluatedCount === 0 ? 0 : Number(((logicalSuccessCount / logicalEvaluatedCount) * 100).toFixed(2));
  const latencies = requestLog.map((entry) => entry.latencyMs);
  const criticalWorkflowEntries = workflowSummary.filter((entry) => CRITICAL_WORKFLOWS.includes(entry.workflow));
  const criticalWorkflowSuccessRate = criticalWorkflowEntries.length === 0
    ? 0
    : Number(((criticalWorkflowEntries.filter((entry) => entry.failed === 0 && entry.notProven === 0).length / criticalWorkflowEntries.length) * 100).toFixed(2));

  return {
    userCount: users.length,
    requestCount: requestLog.length,
    requestSuccessRate,
    workflowSuccessRate,
    criticalWorkflowSuccessRate,
    p95LatencyMs: percentile(latencies, 95),
    criticalFailures,
    workflowSummary,
    notProven: Array.from(new Set(notProven)).sort(),
    acceptance: {
      overallWorkflowSuccessAtLeast99: workflowSuccessRate >= 99,
      criticalWorkflowSuccess100: criticalWorkflowSuccessRate === 100,
      noCriticalFailures: criticalFailures === 0,
    },
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Beta Simulation Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Base URL: ${report.environment.BASE_URL}`);
  lines.push(`API Base URL: ${report.environment.API_BASE_URL}`);
  lines.push(`Users simulated: ${report.summary.userCount}`);
  lines.push(`Requests: ${report.summary.requestCount}`);
  lines.push(`Overall success rate: ${report.summary.requestSuccessRate}%`);
  lines.push(`Workflow success rate: ${report.summary.workflowSuccessRate}%`);
  lines.push(`Critical workflow success rate: ${report.summary.criticalWorkflowSuccessRate}%`);
  lines.push(`p95 latency: ${report.summary.p95LatencyMs} ms`);
  lines.push(`Critical failures: ${report.summary.criticalFailures}`);
  lines.push("");
  lines.push("## Workflow Summary");
  lines.push("");
  lines.push("| Workflow | Total | Passed | Failed | Not Proven |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");
  for (const entry of report.summary.workflowSummary) {
    lines.push(`| ${entry.workflow} | ${entry.total} | ${entry.passed} | ${entry.failed} | ${entry.notProven} |`);
  }
  lines.push("");
  lines.push("## NOT_PROVEN");
  lines.push("");
  if (report.summary.notProven.length === 0) {
    lines.push("None.");
  } else {
    for (const note of report.summary.notProven) lines.push(`- ${note}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  await ensureOutputDir();
  const users = makeUsers();
  const recorder = createRecorder();
  const startedAt = new Date().toISOString();

  const userRuns = await runWithConcurrency(users, 8, async (user) => {
    try {
      return await runUserScenario(recorder, user);
    } catch (error) {
      return {
        userId: user.userId,
        persona: user.persona,
        projectId: null,
        results: [{ workflow: "scenario_runtime", passed: false, critical: true, details: String(error?.message || error) }],
        notes: [],
      };
    }
  });

  const summary = summarizeSimulation(users, recorder.requests, userRuns);
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    environment: { BASE_URL, API_BASE_URL },
    users,
    summary,
    userRuns,
  };

  await writeFile(RAW_LOG_PATH, JSON.stringify(recorder.requests, null, 2));
  await writeFile(REPORT_JSON_PATH, JSON.stringify(report, null, 2));
  await writeFile(REPORT_MD_PATH, renderMarkdown(report));

  const acceptanceFailed = Object.values(summary.acceptance).some((value) => value !== true);
  if (acceptanceFailed) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  await ensureOutputDir();
  await writeFile(
    path.join(OUTPUT_DIR, "beta-simulation-crash.log"),
    `${new Date().toISOString()} ${String(error?.stack || error)}\n`
  );
  console.error(String(error?.stack || error));
  process.exit(1);
});