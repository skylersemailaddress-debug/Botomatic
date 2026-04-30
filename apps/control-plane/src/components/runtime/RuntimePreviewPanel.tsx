"use client";

import { getBrowserContext, resolveRuntimePreview } from "@/services/runtimePreview";

type Props = { runtimeStatus?: string; previewUrl?: string; panel: "pro" | "vibe"; previewUnavailableLabel?: string; runtimeNotConnectedLabel?: string };

export function RuntimePreviewPanel({ runtimeStatus, previewUrl, panel, previewUnavailableLabel = "Preview unavailable", runtimeNotConnectedLabel = "Runtime not connected" }: Props) {
  const state = resolveRuntimePreview({ runtimeStatus, previewUrl, browser: getBrowserContext() });
  const isVerifiedLive = state.status === "live" && state.source === "backend" && Boolean(state.previewUrl);
  const hasPreview = Boolean(state.previewUrl);
  const statusLabel = isVerifiedLive ? "Live" : state.source === "derived" ? "Derived preview" : "Unverified";
  const runtimeLabel = runtimeStatus || runtimeNotConnectedLabel;

  if (panel === "pro") {
    return (
      <section className="pro-panel pro-panel--wide">
        <header>
          <h2>Live Application</h2>
          <strong className="pro-live">● {statusLabel}</strong>
        </header>
        <div className="pro-url-bar">{state.displayUrl || previewUnavailableLabel}</div>
        <div className="pro-runtime-controls">
          <span>{runtimeLabel}</span>
          {hasPreview ? <a href={state.previewUrl} target="_blank" rel="noreferrer">Open Preview</a> : null}
          <small>{hasPreview ? (state.source === "derived" ? "Unverified preview URL" : "Verified runtime URL") : "Runtime controls unavailable"}</small>
        </div>
      </section>
    );
  }

  return (
    <section className="vibe-rail-card">
      <header><h3>Live Preview</h3><strong>{isVerifiedLive ? "Live" : state.source === "derived" ? "Derived" : "Preview"}</strong></header>
      <div className="vibe-mini-preview">{state.displayUrl || previewUnavailableLabel}</div>
      <small>{hasPreview ? (state.source === "derived" ? "Derived preview" : runtimeLabel) : runtimeNotConnectedLabel}</small>
      {hasPreview ? <a href={state.previewUrl} target="_blank" rel="noreferrer">Open Preview</a> : null}
      {!hasPreview ? <small>Runtime controls unavailable</small> : null}
    </section>
  );
}

export function LiveApplicationPanel({ runtimeStatus, previewUrl, previewUnavailableLabel, runtimeNotConnectedLabel }: Omit<Props, "panel">) {
  return <RuntimePreviewPanel panel="pro" runtimeStatus={runtimeStatus} previewUrl={previewUrl} previewUnavailableLabel={previewUnavailableLabel} runtimeNotConnectedLabel={runtimeNotConnectedLabel} />;
}

export function VibeLivePreviewPanel({ runtimeStatus, previewUrl, previewUnavailableLabel, runtimeNotConnectedLabel }: Omit<Props, "panel">) {
  return <RuntimePreviewPanel panel="vibe" runtimeStatus={runtimeStatus} previewUrl={previewUrl} previewUnavailableLabel={previewUnavailableLabel} runtimeNotConnectedLabel={runtimeNotConnectedLabel} />;
}
