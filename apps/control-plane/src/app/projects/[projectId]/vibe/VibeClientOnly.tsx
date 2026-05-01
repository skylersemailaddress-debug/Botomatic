"use client";

import dynamic from "next/dynamic";

const VibeWiredClient = dynamic(
  () => import("./VibeWiredClient").then((mod) => mod.VibeWiredClient),
  {
    ssr: false,
    loading: () => (
      <main className="vibe-loading">
        <section>
          <h1>Loading Vibe Mode</h1>
          <p>Connecting to project state, runtime, and launch proof.</p>
        </section>
        <style>{`
          body{margin:0;background:#fbfbff;color:#211a39;font-family:Inter,system-ui,sans-serif}.vibe-loading{height:100vh;display:grid;place-items:center}.vibe-loading section{border:1px solid #ece8fb;background:white;border-radius:18px;padding:28px;box-shadow:0 18px 48px rgba(57,43,105,.08)}.vibe-loading h1{margin:0 0 8px;font-size:22px}.vibe-loading p{margin:0;color:#746988}
        `}</style>
      </main>
    ),
  },
);

export function VibeClientOnly({ projectId }: { projectId: string }) {
  return <VibeWiredClient projectId={projectId} />;
}
