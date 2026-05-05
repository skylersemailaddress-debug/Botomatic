"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { postJson } from "@/services/api";
import { submitVibeIntake } from "@/services/orchestration";
import type { IntakeResponse } from "@/services/intake";

const NAV_GLOBAL = [
  { label: "Home",          href: "/",                   icon: "⌂" },
  { label: "Templates",     href: "/templates",               icon: "⊞" },
  { label: "Design Studio", href: "/design-studio",          icon: "✦" },
  { label: "Brand Kit",     href: "/brand-kit",           icon: "◈" },
  { label: "Learn",         href: "/learn",           icon: "◎" },
];

function projectNav(projectId: string) {
  return [
    { label: "Vibe Builder",  href: `/projects/${projectId}`,            icon: "✦" },
    { label: "Deployment",    href: `/projects/${projectId}/deployment`,  icon: "▲" },
    { label: "Logs",          href: `/projects/${projectId}/logs`,        icon: "📋" },
    { label: "Evidence",      href: `/projects/${projectId}/evidence`,    icon: "🔍" },
    { label: "Validators",    href: `/projects/${projectId}/validators`,  icon: "✓" },
    { label: "Vault",         href: `/projects/${projectId}/vault`,       icon: "🔐" },
    { label: "Settings",      href: `/projects/${projectId}/settings`,    icon: "⚙" },
    { label: "Pro Cockpit",   href: `/projects/${projectId}/advanced`,    icon: "⌥" },
  ];
}

const RECENT_PLACEHOLDER = [
  { label: "Luxury Booking Site", color: "#22c55e", time: "Just now" },
  { label: "SaaS Dashboard",      color: "#f59e0b", time: "2h ago" },
  { label: "AI Landing Page",     color: "#6366f1", time: "1d ago" },
];

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setLastResponse(null);

    try {
      if (projectId) {
        const result = await submitVibeIntake(projectId, text);
        if (result.ok) {
          const stages = result.data.graph?.stages ?? [];
          const label = result.data.graph?.objective ?? stages[0]?.label ?? "Working on it…";
          setLastResponse(label);
        } else {
          setLastResponse(result.message ?? "Sent.");
        }
      } else {
        const result = await postJson<IntakeResponse>("/api/projects/intake", {
          name: text.slice(0, 60),
          request: text,
        });
        router.push(`/projects/${result.projectId}`);
        return;
      }
    } catch (err) {
      setLastResponse(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }, [input, projectId, router, sending]);

  const placeholder = projectId
    ? "Ask anything — change design, add feature, fix a bug…"
    : "Describe what you want to build…";

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
          {chipHints && chipHints.length > 0 && !input && (
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
          <form className="app-chatbar-form" onSubmit={(e) => void handleSend(e)}>
            <textarea
              ref={textareaRef}
              className="app-chatbar-input"
              placeholder={placeholder}
              value={input}
              rows={1}
              disabled={sending}
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
              disabled={!input.trim() || sending}
              aria-label="Send"
            >
              {sending ? "…" : "▶"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default AppShell;
