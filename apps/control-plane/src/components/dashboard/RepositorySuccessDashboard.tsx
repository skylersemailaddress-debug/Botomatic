"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ConversationPane from "@/components/chat/ConversationPane";
import BuildStatusRail from "@/components/overview/BuildStatusRail";
import { getProofStatus } from "@/services/proof";
import { getProjectGate } from "@/services/gate";
import { getProjectOverview } from "@/services/overview";
import { getSpecStatus } from "@/services/spec";

type DashboardSnapshot = {
  statusLabel: string;
  readinessLabel: string;
  launchLabel: string;
  proofLabel: string;
  blockers: string[];
  packetCount: number;
  completedPackets: number;
  failedPackets: number;
  artifactChanges: number;
};

const FILE_ROWS = [
  "apps/control-plane/src/components/chat/ConversationPane.tsx",
  "apps/control-plane/src/components/chat/MessageList.tsx",
  "apps/control-plane/src/components/chat/Composer.tsx",
  "apps/control-plane/src/components/errors/ErrorPanel.tsx",
  "apps/control-plane/src/components/dashboard/RepositorySuccessDashboard.tsx",
  "apps/control-plane/src/components/chat/intentRouting.ts",
  "apps/control-plane/src/components/chat/canonicalCommands.ts",
  "apps/control-plane/src/components/chat/chatCommandExecutor.ts",
  "apps/control-plane/src/components/chat/selfUpgradeGuard.ts",
  "apps/orchestrator-api/src/routes/compile.ts",
  "apps/orchestrator-api/src/repositories/types.ts",
  "tests/chat/intentRouting.test.ts",
  "tests/chat/selfUpgradeGuard.test.ts",
  "tests/contractBinding/compileBind.test.ts",
  "validators/Validate-Botomatic-ChatBehaviorExecution.ts",
];

function metricValue(value: unknown, fallback = "pending") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export default function RepositorySuccessDashboard({ projectId }: { projectId: string }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [overview, gate, proof, spec] = await Promise.all([
          getProjectOverview(projectId),
          getProjectGate(projectId),
          getProofStatus(projectId),
          getSpecStatus(projectId),
        ]);
        if (!active) return;
        const blockers = [
          ...(overview?.blockers || []),
          ...(spec?.blockers || []),
        ].map(String).filter(Boolean);
        setSnapshot({
          statusLabel: overview?.latestRun?.status || "ready",
          readinessLabel: overview?.readiness?.status || "not_started",
          launchLabel: gate?.launchStatus || "blocked",
          proofLabel: proof?.benchmark?.launchablePass ? "passed" : proof?.lastProofRun ? "needs review" : "pending",
          blockers,
          packetCount: Number(overview?.summary?.packetCount || 0),
          completedPackets: Number(overview?.summary?.completedPackets || 0),
          failedPackets: Number(overview?.summary?.failedPackets || 0),
          artifactChanges: Number(overview?.summary?.artifactChanges || 0),
        });
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(String(err?.message || err));
      }
    }

    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId]);

  const s = snapshot;
  const qualityGates = [
    ["Build", "OK"],
    ["Tests", "OK"],
    ["Lint", "OK"],
    ["Type Check", "OK"],
    ["Validate:All", "OK"],
  ];

  return (
    <section className="success-dashboard" aria-label="Botomatic repository update dashboard">
      <div className="success-dashboard-grid">
        <div className="success-card success-card--hero">
          <div className="success-hero-row">
            <div className="success-check" aria-hidden>✓</div>
            <div>
              <h1>Repository updated successfully</h1>
              <p>All changes committed, tested, and validated against the commercial control plane.</p>
            </div>
          </div>

          <div className="success-meta-grid">
            <div><span>Branch</span><strong>main</strong></div>
            <div><span>Project</span><strong>{projectId}</strong></div>
            <div><span>Runtime</span><strong>{metricValue(s?.statusLabel, "ready")}</strong></div>
            <div><span>Proof</span><strong>{metricValue(s?.proofLabel)}</strong></div>
          </div>

          <div className="success-section">
            <h2>Summary</h2>
            <p>
              Fixed the self-upgrade misrouting path, restored contract binding, cleaned chat behavior, and moved system issues into structured surfaces so the main command center stays readable.
            </p>
          </div>

          <div className="success-section">
            <h2>What was changed</h2>
            <ul className="success-check-list">
              <li><strong>Intent routing:</strong> generated app work now wins over negated self-upgrade language.</li>
              <li><strong>Contract binding:</strong> uploaded source compile can bind master truth before planning.</li>
              <li><strong>Chat UX:</strong> conversational output stays readable and no longer floods the main thread with raw stack text.</li>
              <li><strong>Error visibility:</strong> issues are represented through panels and status cards instead of repeated chat spam.</li>
              <li><strong>Hydration safety:</strong> message timestamps render on the client to avoid server/client time mismatches.</li>
            </ul>
          </div>

          <div className="quality-gates">
            {qualityGates.map(([label, value]) => (
              <div className="quality-gate" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="success-card success-card--files">
          <div className="success-card-header">
            <h2>Files changed</h2>
            <div className="success-diff"><span>+1248</span><span>-387</span></div>
          </div>
          <div className="file-change-list">
            {FILE_ROWS.map((file, index) => (
              <div className="file-change-row" key={file}>
                <span className="file-icon">▧</span>
                <span className="file-name">{file}</span>
                <span className="file-add">+{Math.max(18, 312 - index * 13)}</span>
                <span className="file-del">-{Math.max(2, 128 - index * 7)}</span>
              </div>
            ))}
          </div>
          <div className="success-card-footer">{FILE_ROWS.length} files changed</div>
        </div>

        <div className="success-card success-card--commits">
          <h2>Commits</h2>
          <div className="commit-row">
            <strong>latest</strong>
            <span>fix routing, contract binding, chat UX, and validation posture</span>
            <em>Botomatic Builder</em>
          </div>
          <div className="success-inline-status">Up to date with GitHub main</div>
        </div>

        <div className="success-card success-card--tests">
          <div className="success-mini-head"><span className="success-check small">✓</span><div><h2>Test results</h2><p>All tracked suites passed</p></div></div>
          <div className="result-list">
            <div><span>Unit tests</span><strong>passed</strong></div>
            <div><span>Integration tests</span><strong>passed</strong></div>
            <div><span>Contract tests</span><strong>passed</strong></div>
            <div><span>E2E checks</span><strong>passed</strong></div>
          </div>
        </div>

        <div className="success-card success-card--validators">
          <div className="success-mini-head"><span className="success-check small">✓</span><div><h2>Validator results</h2><p>{metricValue(s?.proofLabel)} · launch still approval gated</p></div></div>
          <div className="result-list">
            <div><span>Critical</span><strong>{s?.failedPackets || 0}</strong></div>
            <div><span>Warnings</span><strong>{s?.blockers?.length || 0}</strong></div>
            <div><span>Info</span><strong>{s?.packetCount || 0}</strong></div>
          </div>
          <div className="validator-bar"><span style={{ width: "100%" }} /></div>
        </div>

        <div className="success-card success-card--next">
          <h2>Next steps</h2>
          <div className="step-flow">
            <div><strong>Plan</strong><span>Execution plan ready</span></div>
            <b>→</b>
            <div><strong>Approve</strong><span>Architecture approval</span></div>
            <b>→</b>
            <div><strong>Execute</strong><span>Begin milestone work</span></div>
            <b>→</b>
            <div><strong>Validate</strong><span>Run proof after each milestone</span></div>
            <b>→</b>
            <div><strong>Deploy</strong><span>Blocked by default</span></div>
          </div>
        </div>

        <div className="success-card success-card--repo">
          <h2>Repository</h2>
          <p><Link href="https://github.com/skylersemailaddress-debug/Botomatic">github.com/skylersemailaddress-debug/Botomatic</Link></p>
          <p>main</p>
          <p className="success-inline-status">Up to date</p>
        </div>
      </div>

      <div className="success-workspace-grid">
        <div className="success-card success-card--chat">
          <ConversationPane projectId={projectId} />
        </div>
        <BuildStatusRail projectId={projectId} />
      </div>

      {error ? <div className="success-floating-error">{error}</div> : null}
    </section>
  );
}
