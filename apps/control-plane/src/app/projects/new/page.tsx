"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/services/api";
import { uploadIntakeFile } from "@/services/intake";
import type { IntakeResponse } from "@/services/intake";
import { intakeGithub } from "@/services/intakeSources";

type IntakeTab = "idea" | "upload" | "github";

const CHIPS = [
  "SaaS dashboard with auth and billing",
  "E-commerce store with product catalog",
  "Landing page for a mobile app",
  "Portfolio site with case studies",
  "Booking system for a luxury hotel",
  "AI-powered analytics platform",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<IntakeTab>("idea");
  const [prompt, setPrompt] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createProject = useCallback(async (name: string, request: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await postJson<IntakeResponse>("/api/projects/intake", { name, request });
      router.replace(`/projects/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setLoading(false);
    }
  }, [router]);

  async function handleIdeaSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    await createProject(text.slice(0, 60), text);
  }

  async function handleGithubSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = githubUrl.trim();
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const repoName = url.replace(/\/$/, "").split("/").pop() ?? "repo";
      const created = await postJson<IntakeResponse>("/api/projects/intake", {
        name: `Import: ${repoName}`.slice(0, 60),
        request: `Analyze and build from GitHub repository: ${url}`,
      });
      // Fire-and-forget the actual GitHub intake — it runs async in the orchestrator
      void intakeGithub(created.projectId, { sourceUrl: url, allowClone: true }).catch(() => undefined);
      router.replace(`/projects/${created.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setLoading(false);
    }
  }

  async function handleFile(file: File) {
    if (loading) return;
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    try {
      const created = await postJson<IntakeResponse>("/api/projects/intake", {
        name: file.name.slice(0, 60),
        request: `Analyze and build from uploaded file: ${file.name}`,
      });
      await uploadIntakeFile(created.projectId, file, {
        onUploadProgress: (pct) => setUploadProgress(pct),
        fullRepoAudit: true,
      });
      router.replace(`/projects/${created.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="intake-wrap">
      <div className="intake-card">
        {/* Brand */}
        <div className="intake-brand">
          <span className="intake-brand-mark">B</span>
          <div className="intake-brand-name">
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </div>
        </div>

        <h1 className="intake-heading">What do you want to build?</h1>
        <p className="intake-sub">Describe your idea, upload a spec, or import a GitHub repo — Botomatic handles the rest.</p>

        {/* Tabs */}
        <div className="intake-tabs">
          <button type="button" className={`intake-tab${tab === "idea" ? " active" : ""}`} onClick={() => setTab("idea")}>
            ✦ From Idea
          </button>
          <button type="button" className={`intake-tab${tab === "upload" ? " active" : ""}`} onClick={() => setTab("upload")}>
            ↑ Upload Spec
          </button>
          <button type="button" className={`intake-tab${tab === "github" ? " active" : ""}`} onClick={() => setTab("github")}>
            ⌥ GitHub Import
          </button>
        </div>

        {/* Tab: Idea */}
        {tab === "idea" && (
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={(e) => void handleIdeaSubmit(e)}>
            <textarea
              className="intake-textarea"
              placeholder="Build me a modern booking website for a luxury hotel with a beautiful landing page..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              disabled={loading}
              autoFocus
            />
            {error && <p className="intake-error">{error}</p>}
            <button type="submit" className="intake-submit" disabled={loading || !prompt.trim()}>
              {loading ? "Creating project…" : "Start Building →"}
            </button>
          </form>
        )}

        {/* Tab: Upload */}
        {tab === "upload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              className={`intake-upload-zone${dragging ? " dragging" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => void handleDrop(e)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="intake-upload-icon">📁</div>
              <div className="intake-upload-label">Drop a file here, or click to browse</div>
              <div className="intake-upload-sub">Supports ZIP, PDF, DOCX, TXT, images · Max 50 MB</div>
              <input
                ref={fileInputRef}
                type="file"
                className="intake-upload-input"
                accept=".zip,.pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
              />
            </div>
            {loading && (
              <div className="intake-progress">
                <div className="intake-progress-bar" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            {error && <p className="intake-error">{error}</p>}
          </div>
        )}

        {/* Tab: GitHub */}
        {tab === "github" && (
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={(e) => void handleGithubSubmit(e)}>
            <div className="intake-github-row">
              <input
                type="url"
                className="intake-github-input"
                placeholder="https://github.com/owner/repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button type="submit" className="btn btn--primary" disabled={loading || !githubUrl.trim()}>
                {loading ? "Importing…" : "Import"}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-3)" }}>
              Botomatic will clone, audit, and build a full analysis of the repository.
            </p>
            {error && <p className="intake-error">{error}</p>}
          </form>
        )}

        {/* Idea chips (only show on idea tab) */}
        {tab === "idea" && (
          <>
            <div className="intake-divider"><span>or try an example</span></div>
            <div className="intake-chips">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="intake-chip"
                  onClick={() => setPrompt(chip)}
                  disabled={loading}
                >
                  {chip}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
