// trimmed for brevity: identical file but nav buttons now use real routing
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function VibeWiredClient({ projectId }: { projectId: string }) {
  const router = useRouter();

  const navMap: Record<string,string> = {
    Home: `/projects/${projectId}`,
    Projects: `/projects/${projectId}`,
    Templates: `/projects/${projectId}`,
    "Design Studio": `/projects/${projectId}/vibe`,
    "Brand Kit": `/projects/${projectId}/advanced`,
    Launch: `/projects/${projectId}/deployment`,
    Learn: `/projects/${projectId}/logs`
  };

  const navItems = Object.keys(navMap);

  return (
    <main>
      <aside>
        <nav>
          {navItems.map(item => (
            <button key={item} onClick={() => router.push(navMap[item])}>
              {item}
            </button>
          ))}
        </nav>
      </aside>
    </main>
  );
}
