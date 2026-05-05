"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { postJson } from "@/services/api";
import { submitVibeIntake } from "@/services/orchestration";
import type { IntakeResponse } from "@/services/intake";

const NAV_GLOBAL = [
  { label: "Home",          href: "/",               icon: "⌂" },
  { label: "Templates",     href: "/templates",       icon: "⊞" },
  { label: "Design Studio", href: "/design-studio",  icon: "✦" },
  { label: "Brand Kit",     href: "/brand-kit",       icon: "◈" },
  { label: "Learn",         href: "/learn",           icon: "◎" },
];

function projectNav(projectId: string) {
  return [
    { label: "Vibe Builder", href: `/projects/${projectId}`,           icon: "✦" },
    { label: "Deployment",   href: `/projects/${projectId}/deployment`, icon: "▲" },
    { label: "Logs",         href: `/projects/${projectId}/logs`,       icon: "📋" },
    { label: "Evidence",     href: `/projects/${projectId}/evidence`,   icon: "🔍" },
    { label: "Validators",   href: `/projects/${projectId}/validators`, icon: "✓" },
    { label: "Vault",        href: `/projects/${projectId}/vault`,      icon: "🔐" },
    { label: "Settings",     href: `/projects/${projectId}/settings`,   icon: "⚙" },
    { label: "Pro Cockpit",  href: `/projects/${projectId}/advanced`,   icon: "⌥" },
  ];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AppShellProps {
  children: ReactNode;
  projectId?: string;
  chipHints?: string[];
}

export function AppShell({ children, projectId, chipHints }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = projectId ? projectNav(projectId) : NAV_GLOBAL;

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFileToProject = useCallback(async (pid: string, file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const body = JSON.parse(xhr.responseText);
            reject(new Error(body.error ?? `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));

      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
      const token = process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN ?? "dev-api-token";
      xhr.open("POST", `${base}/api/projects/${pid}/intake/file`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    });
  }, []);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text && !attachedFile) return;
    if (sending || uploading) return;

    setInput("");
    setSending(true);
    setLastResponse(null);

    try {
      if (projectId) {
        // Upload file first if attached
        if (attachedFile) {
          setUploading(true);
          setUploadProgress(0);
          await uploadFileToProject(projectId, attachedFile);
          setAttachedFile(null);
          setUploading(false);
          setUploadProgress(0);
        }
        // Then send text if any
        if (text) {
          const result = await submitVibeIntake(projectId, text);
          if (result.ok) {
            const stages = result.data.graph?.stages ?? [];
            const label = result.data.graph?.objective ?? stages[0]?.label ?? "Working on it…";
            setLastResponse(label);
          } else {
            setLastResponse(result.message ?? "Sent.");
          }
        } else {
          setLastResponse(`File received: ${attachedFile?.name ?? "uploaded"}`);
        }
      } else {
        // Home: create project from text, then upload file if present
        const result = await postJson<IntakeResponse>("/api/projects/intake", {
          name: (text || attachedFile?.name?.slice(0, 60) || "New Project").slice(0, 60),
          request: text || `Uploaded file: ${attachedFile?.name}`,
        });
        if (attachedFile) {
          setUploading(true);
          setUploadProgress(0);
          try {
            await uploadFileToProject(result.projectId, attachedFile);
          } catch {
            // non-fatal — project created, file upload failed
          }
          setAttachedFile(null);
          setUploading(false);
          setUploadProgress(0);
        }
        router.push(`/projects/${result.projectId}`);
        return;
      }
    } catch (err) {
      setLastResponse(err instanceof Error ? err.message : "Something went wrong.");
      setUploading(false);
      setUploadProgress(0);
    } finally {
      setSending(false);
    }
  }, [input, attachedFile, projectId, router, sending, uploading, uploadFileToProject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAttachedFile(file);
    e.target.value = "";
  };

  const placeholder = projectId
    ? "Ask anything — change design, add feature, fix a bug…"
    : "Describe what you want to build…";

  const canSend = (input.trim().length > 0 || attachedFile !== null) && !sending && !uploading;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="app-sidebar" aria-label="Botomatic navigation">
        <Link href="/" className="sidebar-brand" aria-label="Botomatic home">
          <span className="sidebar-brand-mark">B</span>
        </Link>

        <button
          type="button"
          className="sidebar-new-project"
          aria-label="New Project"
          onClick={() => router.push("/")}
        >
          +
        </button>

        <nav className="sidebar-nav" aria-label={projectId ? "Project navigation" : "Product navigation"}>
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`sidebar-nav-item${isActive ? " active" : ""}`}
                title={item.label}
              >
                <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <Link href="/settings" className="sidebar-nav-item" title="Settings">
            <span className="sidebar-nav-icon" aria-hidden="true">⚙</span>
            <span className="sidebar-nav-label">Settings</span>
          </Link>
          <div className="sidebar-avatar" aria-label="User account">B</div>
        </div>
      </aside>

      {/* Main: content + persistent chat bar */}
      <main className="app-main">
        <div className="app-content">{children}</div>

        {/* Persistent chat bar */}
        <div className="app-chatbar">
          {chipHints && chipHints.length > 0 && !input && !attachedFile && (
            <div className="home-chips">
              {chipHints.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="home-chip"
                  onClick={() => {
                    setInput(chip);
                    textareaRef.current?.focus();
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {lastResponse && (
            <div className="app-chatbar-response">
              <span className="app-chatbar-response-icon">✦</span>
              <span className="app-chatbar-response-text">{lastResponse}</span>
              {projectId && (
                <Link href={`/projects/${projectId}`} className="app-chatbar-response-link">
                  View →
                </Link>
              )}
              <button
                type="button"
                className="app-chatbar-response-dismiss"
                onClick={() => setLastResponse(null)}
                aria-label="Dismiss"
              >✕</button>
            </div>
          )}

          {/* File attachment preview */}
          {attachedFile && (
            <div className="app-chatbar-file">
              <div className="app-chatbar-file-icon">
                {attachedFile.name.match(/\.(pdf)$/i) ? "📄" :
                 attachedFile.name.match(/\.(zip|gz|tar)$/i) ? "🗜" :
                 attachedFile.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? "🖼" :
                 attachedFile.name.match(/\.(ts|tsx|js|jsx|py|rb|go)$/i) ? "💻" : "📎"}
              </div>
              <div className="app-chatbar-file-info">
                <span className="app-chatbar-file-name">{attachedFile.name}</span>
                <span className="app-chatbar-file-size">{formatBytes(attachedFile.size)}</span>
              </div>
              {uploading ? (
                <div className="app-chatbar-file-progress">
                  <div className="app-chatbar-file-progress-bar" style={{ width: `${uploadProgress}%` }} />
                  <span className="app-chatbar-file-progress-label">{uploadProgress}%</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="app-chatbar-file-remove"
                  onClick={() => setAttachedFile(null)}
                  aria-label="Remove file"
                >✕</button>
              )}
            </div>
          )}

          <form className="app-chatbar-form" onSubmit={(e) => void handleSend(e)}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.zip,.tar.gz,.gz,.png,.jpg,.jpeg,.webp,.ts,.tsx,.js,.jsx,.py,.rb,.go,.json,.md,.txt,.csv,.yaml,.yml"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Attach button */}
            <button
              type="button"
              className="app-chatbar-attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Attach file"
              title="Attach file (up to 250 MB)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              className="app-chatbar-input"
              placeholder={placeholder}
              value={input}
              rows={1}
              disabled={sending || uploading}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <button
              type="submit"
              className="app-chatbar-send"
              disabled={!canSend}
              aria-label="Send"
            >
              {sending || uploading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" style={{ animation: "spin 1s linear infinite", transformOrigin: "center" }} />
                </svg>
              ) : "▶"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AppShell;
