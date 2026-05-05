"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/services/api";
import type { IntakeResponse } from "@/services/intake";

const CHIPS = [
  "SaaS dashboard with auth and billing",
  "E-commerce store with product catalog",
  "Landing page for a mobile app",
  "Portfolio site with case studies",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    try {
      const result = await postJson<IntakeResponse>("/api/projects/intake", {
        name: text.slice(0, 60),
        request: text,
      });
      router.replace(`/projects/${result.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setLoading(false);
    }
  }

  return (
    <div className="intake-wrap">
      <div className="intake-card">
        <div className="intake-brand">
          <span className="intake-brand-mark">B</span>
          <div className="intake-brand-name">
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </div>
        </div>

        <h1 className="intake-heading">What do you want to build?</h1>
        <p className="intake-sub">Describe your idea and Botomatic will design, build, and launch it.</p>

        <form style={{ display: "flex", flexDirection: "column", gap: 10 }} onSubmit={(e) => void handleSubmit(e)}>
          <textarea
            className="intake-textarea"
            placeholder="Build me a modern booking website for a luxury hotel with a beautiful landing page..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={loading}
            autoFocus
          />
          {error && <p className="intake-error">{error}</p>}
          <button type="submit" className="intake-submit" disabled={loading || !prompt.trim()}>
            {loading ? "Creating project…" : "Start Building →"}
          </button>
        </form>

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
      </div>
    </div>
  );
}
