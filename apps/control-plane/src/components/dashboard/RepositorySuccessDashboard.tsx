"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./RepositorySuccessDashboard.module.css";

type GateStatus = "passed" | "failed" | "not_run";
type Gate = {
  name: string;
  command: string;
  status: GateStatus;
  durationMs?: number;
  summary?: string;
};

type DashboardData = {
  repository?: {
    branch?: string;
    localSha?: string;
    remoteSha?: string;
    upToDate?: boolean;
    behind?: number;
    url?: string;
  };
  latestCommit?: { sha?: string; message?: string; author?: string; date?: string };
  filesChanged?: Array<{ path?: string; additions?: number; deletions?: number }>;
  totals?: { additions?: number; deletions?: number };
  gates?: Gate[];
  gateSummary?: { allPassed?: boolean; stale?: boolean };
  commitHistory?: Array<{ sha?: string; message?: string; author?: string; date?: string }>;
  pullRequests?: { items?: Array<{ number?: number; title?: string }> };
};

type DashboardProps = { projectId?: string };

const testRows = ["Unit Tests", "Integration Tests", "Contract Tests", "E2E Tests"];

function shortSha(v?: string) {
  return v && v !== "unknown" ? v.slice(0, 7) : "--";
}

function formatDate(v?: string) {
  if (!v) return "not available";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function gateByName(gates: Gate[], name: string) {
  return gates.find((g) => g.name.toLowerCase() === name.toLowerCase());
}

function gateTone(status?: GateStatus | "pending") {
  if (status === "passed") return "ok";
  if (status === "failed") return "bad";
  return "warn";
}

function gateText(status?: GateStatus | "pending") {
  if (status === "passed") return "OK";
  if (status === "failed") return "FAIL";
  return "--";
}

function toneClass(tone: string) {
  if (tone === "ok") return styles.toneOk;
  if (tone === "bad") return styles.toneBad;
  return styles.toneWarn;
}

export default function RepositorySuccessDashboard({ projectId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [hybrid, setHybrid] = useState<any>(null);
  const [running, setRunning] = useState(false);

  async function load(runGates = false) {
    const dashboardUrl = `/api/local-repo-dashboard${runGates ? "?runGates=1" : "?autoRunOnChange=1"}`;
    const [dashboardRes, hybridRes] = await Promise.all([
      fetch(dashboardUrl, { cache: "no-store" }),
      fetch("/api/hybrid-ci", { cache: "no-store" }).catch(() => null),
    ]);

    if (dashboardRes.ok) setData(await dashboardRes.json());
    if (hybridRes && hybridRes.ok) setHybrid(await hybridRes.json().catch(() => null));
  }

  useEffect(() => {
    void load(false);

    const poll = setInterval(() => {
      void load(false);
    }, 30000);

    let stream: EventSource | null = null;
    try {
      stream = new EventSource("/api/local-repo-dashboard/stream");
      stream.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as DashboardData;
          setData(parsed);
        } catch {
          // no-op on malformed stream events
        }
      };
      stream.onerror = () => {
        stream?.close();
      };
    } catch {
      // stream is optional; polling remains active
    }

    return () => {
      clearInterval(poll);
      stream?.close();
    };
  }, []);

  const repository = data?.repository ?? {};
  const latestCommit = data?.latestCommit ?? {};
  const filesChanged = data?.filesChanged ?? [];
  const totals = data?.totals ?? {};
  const gates = data?.gates ?? [];
  const gateSummary = data?.gateSummary ?? {};
  const commitHistory = data?.commitHistory ?? [];
  const pullRequests = data?.pullRequests?.items ?? [];
  const actions = hybrid?.githubActions?.runs ?? [];

  const buildGate = gateByName(gates, "Build");
  const testsGate = gateByName(gates, "Tests");
  const validateGate = gateByName(gates, "Validate:All");
  const githubGateStatus: GateStatus = repository.upToDate ? "passed" : "failed";
  const actionsStatus: GateStatus = actions.length > 0 ? "passed" : "not_run";

  const anyFailed = gates.some((g) => g.status === "failed");
  const anyRan = gates.some((g) => g.status !== "not_run");
  const allPassed = gateSummary.allPassed || (anyRan && !anyFailed);

  const heroTitle = allPassed
    ? "Repository updated successfully"
    : anyFailed
      ? "Repository needs attention"
      : "Repository status pending";

  const heroSubtitle = allPassed
    ? "All available quality gates report pass for this revision."
    : anyFailed
      ? "At least one quality gate failed. Review evidence before deploy."
      : "No completed gate runs yet. Execute live gates for current status.";

  const commitRows = (commitHistory.length ? commitHistory : [latestCommit]).filter((row) => row && (row.sha || row.message)).slice(0, 3);

  const changedSummary = useMemo(() => {
    if (!filesChanged.length) return ["No file changes detected in the current data snapshot."];
    return filesChanged.slice(0, 4).map((f) => `${f.path ?? "unknown file"} (+${f.additions ?? 0} / -${f.deletions ?? 0})`);
  }, [filesChanged]);

  const validatorCounts = {
    critical: validateGate?.status === "failed" ? 1 : 0,
    warnings: gateSummary.stale ? 1 : 0,
    info: gates.length,
  };

  if (!data) {
    return <div className={styles.loading}>Loading release dashboard for {projectId ?? "project"}…</div>;
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brandWrap}>
          <div className={styles.hex}>⬡</div>
          <div className={styles.brand}>Botomatic</div>
          <div className={styles.subbrand}>Enterprise Builder Command Center</div>
        </div>
        <button
          onClick={() => {
            setRunning(true);
            load(true).finally(() => setRunning(false));
          }}
          disabled={running}
          className={styles.runBtn}
        >
          {running ? "Running live gates…" : "Run Live Gates"}
        </button>
      </header>

      <main className={styles.grid}>
        <section className={`${styles.card} ${styles.heroCard}`}>
          <div className={styles.heroTop}>
            <span className={`${styles.heroIcon} ${allPassed ? styles.heroGood : anyFailed ? styles.heroBad : styles.heroWarn}`}>{allPassed ? "✓" : anyFailed ? "!" : "•"}</span>
            <div>
              <h1 className={`${styles.heroTitle} ${allPassed ? styles.textGood : anyFailed ? styles.textBad : styles.textWarn}`}>{heroTitle}</h1>
              <p className={styles.heroSubtitle}>{heroSubtitle}</p>
            </div>
          </div>

          <div className={styles.metaGrid}>
            {[
              ["Branch", repository.branch ?? "unknown"],
              ["Commit", shortSha(repository.localSha ?? latestCommit.sha)],
              ["Author", latestCommit.author ?? "unknown"],
              ["Date", formatDate(latestCommit.date)],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div className={styles.metaLabel}>{k}</div>
                <div className={styles.metaValue}>{v}</div>
              </div>
            ))}
          </div>

          <div className={styles.sectionLabel}>Summary</div>
          <p className={styles.sectionBody}>
            {latestCommit.message
              ? `Latest commit: ${latestCommit.message}`
              : "No commit metadata available from local-repo dashboard."}
          </p>

          <div className={styles.sectionLabel}>What was changed</div>
          <ul className={styles.checkList}>
            {changedSummary.map((row) => (
              <li key={row} className={styles.checkRow}><span>✓</span><span>{row}</span></li>
            ))}
          </ul>

          <div className={styles.sectionLabel}>Quality gates</div>
          <div className={styles.gateGrid}>
            {[
              ["Build", buildGate?.status],
              ["Tests", testsGate?.status],
              ["GitHub", githubGateStatus],
              ["Actions", actionsStatus],
              ["Validate:All", validateGate?.status],
            ].map(([name, status]) => {
              const tone = gateTone(status as GateStatus | undefined);
              return (
                <div className={styles.gateCell} key={String(name)}>
                  <span>{name}</span>
                  <span className={`${styles.gatePill} ${toneClass(tone)}`}>{gateText(status as GateStatus | undefined)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className={`${styles.card} ${styles.filesCard}`}>
          <div className={styles.cardHeaderRow}>
            <h2>FILES CHANGED ({filesChanged.length})</h2>
            <div className={styles.diffTotals}><span>+{totals.additions ?? 0}</span><span>-{totals.deletions ?? 0}</span></div>
          </div>
          <div className={styles.filesScroller}>
            {!filesChanged.length ? (
              <div className={styles.empty}>No changed files reported by /api/local-repo-dashboard.</div>
            ) : (
              filesChanged.map((file, idx) => (
                <div key={`${file.path ?? "file"}-${idx}`} className={styles.fileRow}>
                  <span>▧</span>
                  <span className={styles.filePath}>{file.path ?? "unknown"}</span>
                  <span className={styles.add}>+{file.additions ?? 0}</span>
                  <span className={styles.del}>-{file.deletions ?? 0}</span>
                </div>
              ))
            )}
          </div>
          <div className={styles.filesFooter}>
            <span>{filesChanged.length} files changed</span>
            <span>{totals.additions ?? 0} additions · {totals.deletions ?? 0} deletions</span>
          </div>
        </section>

        <section className={`${styles.card} ${styles.commitsCard}`}>
          <h2>COMMITS ({commitRows.length})</h2>
          {commitRows.length === 0 ? (
            <div className={styles.empty}>No commits available.</div>
          ) : (
            commitRows.map((c, idx) => (
              <div key={`${c.sha ?? c.message ?? "commit"}-${idx}`} className={styles.commitRow}>
                <strong>{shortSha(c.sha)}</strong>
                <span className={styles.filePath}>{c.message ?? "no message"}</span>
                <span>{c.author ?? "unknown"}</span>
                <span>{formatDate(c.date).split(",")[0]}</span>
              </div>
            ))
          )}
        </section>

        <section className={`${styles.card} ${styles.dualCard}`}>
          <div>
            <h2>TEST RESULTS</h2>
            <div className={styles.statusLine}><span className={`${styles.dot} ${toneClass(gateTone(testsGate?.status))}`} />
              <div>
                <strong>{testsGate?.status === "passed" ? "passed" : testsGate?.status === "failed" ? "failed" : "not run"}</strong>
                <div className={styles.muted}>{testsGate?.summary ?? "No test gate summary available."}</div>
              </div>
            </div>
            {testRows.map((row) => (
              <div className={styles.kvRow} key={row}><span>{row}</span><span>{testsGate?.status === "passed" ? "passed" : testsGate?.status === "failed" ? "failed" : "not run"}</span></div>
            ))}
          </div>
          <div>
            <h2>VALIDATOR RESULTS</h2>
            <div className={styles.statusLine}><span className={`${styles.dot} ${toneClass(gateTone(validateGate?.status))}`} />
              <div>
                <strong>{validateGate?.status === "passed" ? "passed" : validateGate?.status === "failed" ? "failed" : "not run"}</strong>
                <div className={styles.muted}>{validateGate?.summary ?? "No validator summary available."}</div>
              </div>
            </div>
            <div className={styles.kvRow}><span>Critical</span><span>{validatorCounts.critical}</span></div>
            <div className={styles.kvRow}><span>Warnings</span><span>{validatorCounts.warnings}</span></div>
            <div className={styles.kvRow}><span>Info</span><span>{validatorCounts.info}</span></div>
            <div className={styles.progressTrack}><div className={styles.progressBar} style={{ width: `${validateGate?.status === "passed" ? 100 : validateGate?.status === "failed" ? 35 : 12}%` }} /></div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.nextStepsCard}`}>
          <h2>NEXT STEPS</h2>
          <div className={styles.flow}>
            {["Plan", "Approve", "Execute", "Validate", "Deploy"].map((step, i) => (
              <div key={step} className={styles.flowNode}>
                <strong>{step}</strong>
                <span className={styles.muted}>{step === "Deploy" ? "blocked" : "ready"}</span>
                {i < 4 && <em>→</em>}
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.card} ${styles.repoCard}`}>
          <h2>REPOSITORY</h2>
          <div className={styles.repoGrid}>
            <div>
              {repository.url ? <Link href={repository.url}>{repository.url}</Link> : <span className={styles.muted}>GitHub URL unavailable</span>}
            </div>
            <div>Branch: {repository.branch ?? "unknown"}</div>
            <div>SHA: {shortSha(repository.localSha ?? latestCommit.sha)}</div>
            <div>Pushed: {formatDate(latestCommit.date)}</div>
            <div className={`${styles.badge} ${repository.upToDate ? styles.badgeOk : styles.badgeWarn}`}>{repository.upToDate ? "Up to date" : `Behind ${repository.behind ?? 0}`}</div>
            <div className={styles.muted}>PRs: {pullRequests.length ? pullRequests.slice(0, 2).map((pr) => `#${pr.number} ${pr.title}`).join(" · ") : "none"}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
