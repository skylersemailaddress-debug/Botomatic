"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProjectLiveState } from "./useProjectLiveState";

const navItems = ["Home", "Projects", "Templates", "Design Studio", "Brand Kit", "Launch", "Learn"];

function LuxoraPreview({ compact = false, runtimeUrl }: { compact?: boolean; runtimeUrl?: string }) {
  if (runtimeUrl) return <iframe className={compact ? "luxora compact" : "luxora"} src={runtimeUrl} title="Live runtime preview" />;
  return <div className={compact ? "luxora compact" : "luxora"} />;
}

export function VibeWiredClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const { execution, runtime, launchProof, refresh, mutate } = useProjectLiveState(projectId);

  const navRoutes: Record<string, string> = {
    Home: `/projects/${projectId}`,
    Projects: `/projects/${projectId}`,
    Templates: `/projects/${projectId}`,
    "Design Studio": `/projects/${projectId}/vibe`,
    "Brand Kit": `/projects/${projectId}/advanced`,
    Launch: `/projects/${projectId}/deployment`,
    Learn: `/projects/${projectId}/logs`
  };

  const activeNav = pathname?.includes("/deployment")
    ? "Launch"
    : pathname?.includes("/advanced")
    ? "Brand Kit"
    : pathname?.includes("/logs")
    ? "Learn"
    : pathname?.includes("/vibe")
    ? "Design Studio"
    : "Home";

  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  async function runExecution(nextPrompt: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/execution`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: `vibe-${Date.now()}`,
          prompt: nextPrompt,
          objective: nextPrompt,
          requestedJobs: ["file_diff"]
        })
      });
      const data = await res.json();
      mutate({ execution: data });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function startRuntime() {
    const res = await fetch(`/api/projects/${projectId}/runtime/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: `runtime-${Date.now()}` })
    });
    if (res.ok) {
      const data = await res.json();
      mutate({ runtime: data.runtime });
      return data.runtime;
    }
    return null;
  }

  async function launchLocal() {
    setBusy(true);
    try {
      const rt = runtime?.state === "running" ? runtime : await startRuntime();
      const res = await fetch(`/api/projects/${projectId}/launch/local`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `launch-${Date.now()}` })
      });
      const data = await res.json();
      if (data.runtime) mutate({ runtime: data.runtime });
      if (data.launchProof) mutate({ launchProof: data.launchProof });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function deploy() {
    setBusy(true);
    try {
      await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `deploy-${Date.now()}` })
      });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const runtimeUrl = runtime?.verifiedPreviewUrl || "";
  const launchReady = Boolean(launchProof?.launchReady && launchProof?.launchProof?.verified);

  return (
    <main className="ref">
      <aside className="sidebar">
        <button className="new" onClick={() => runExecution("Create a new app project shell")}>+ New Project</button>
        <nav>
          {navItems.map((item) => (
            <button key={item} className={item === activeNav ? "active" : ""} onClick={() => router.push(navRoutes[item])}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="work">
        <header className="top">
          <h1>Vibe Mode</h1>
          <button onClick={refresh}>↻</button>
          <button className="launch" onClick={launchReady ? deploy : launchLocal} disabled={busy}>
            {launchReady ? "Launch App" : "Start Runtime"}
          </button>
        </header>

        <div>
          <div>
            {execution?.prompt || "No execution yet"}
          </div>

          <LuxoraPreview runtimeUrl={runtimeUrl} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (prompt.trim()) runExecution(prompt);
              setPrompt("");
            }}
          >
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <button disabled={busy}>Run</button>
          </form>
        </div>
      </section>
    </main>
  );
}
