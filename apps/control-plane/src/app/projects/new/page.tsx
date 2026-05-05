"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "@/services/api";
import type { IntakeResponse } from "@/services/intake";

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
    <div className="intake-page">
      <div className="intake-card">
        <div className="intake-brand">
          <span className="intake-brand-mark">B</span>
          <div>
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </div>
        </div>

        <h1 className="intake-heading">What do you want to build?</h1>
        <p className="intake-sub">Describe your idea and Botomatic will design, build, and launch it.</p>

        <form className="intake-form" onSubmit={handleSubmit}>
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
          {[
            "SaaS dashboard with auth and billing",
            "E-commerce store with product catalog",
            "Landing page for a mobile app",
            "Portfolio site with case studies",
          ].map((chip) => (
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

      <style>{`
        .intake-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f7ff;
          padding: 24px;
        }
        .intake-card {
          background: #fff;
          border-radius: 16px;
          padding: 48px;
          max-width: 600px;
          width: 100%;
          box-shadow: 0 4px 24px rgba(91,43,224,.08);
        }
        .intake-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .intake-brand-mark {
          width: 36px;
          height: 36px;
          background: #5b2be0;
          color: #fff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
        }
        .intake-brand strong { display: block; font-size: 15px; color: #1a0a3d; }
        .intake-brand small { font-size: 10px; color: #9b8fc0; letter-spacing: .08em; }
        .intake-heading {
          font-size: 28px;
          font-weight: 800;
          color: #1a0a3d;
          margin: 0 0 8px;
        }
        .intake-sub {
          font-size: 15px;
          color: #6b5f8a;
          margin: 0 0 28px;
        }
        .intake-form { display: flex; flex-direction: column; gap: 12px; }
        .intake-textarea {
          width: 100%;
          padding: 14px 16px;
          border: 1.5px solid #e0d9f5;
          border-radius: 10px;
          font-size: 15px;
          color: #1a0a3d;
          resize: vertical;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
        }
        .intake-textarea:focus { border-color: #5b2be0; box-shadow: 0 0 0 3px rgba(91,43,224,.1); }
        .intake-error { color: #d4423f; font-size: 13px; margin: 0; }
        .intake-submit {
          background: #5b2be0;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 14px 24px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background .15s;
        }
        .intake-submit:hover:not(:disabled) { background: #4a22b8; }
        .intake-submit:disabled { opacity: .5; cursor: not-allowed; }
        .intake-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 20px;
        }
        .intake-chip {
          background: #f3f0fb;
          border: none;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 13px;
          color: #5b2be0;
          cursor: pointer;
          transition: background .15s;
        }
        .intake-chip:hover:not(:disabled) { background: #e8e0f8; }
      `}</style>
    </div>
  );
}
