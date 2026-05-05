"use client";

import { AppShell } from "@/components/shell/AppShell";

const CHIPS = [
  "SaaS dashboard with auth and billing",
  "E-commerce store with product catalog",
  "Landing page for a mobile app",
  "Portfolio site with case studies",
  "Booking system for a luxury hotel",
  "AI-powered analytics platform",
];

export default function HomePage() {
  return (
    <AppShell chipHints={CHIPS}>
      <div className="home-state">
        <div className="home-state-brand">
          <div className="home-state-mark">B</div>
          <div className="home-state-name">
            <strong>Botomatic</strong>
            <small>NEXUS</small>
          </div>
        </div>

        <h1>What do you want to build?</h1>
        <p>
          Describe your idea in the chat bar below — Botomatic will scaffold, design,
          and deploy your project automatically.
        </p>
      </div>
    </AppShell>
  );
}
