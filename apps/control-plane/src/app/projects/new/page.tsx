"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLaunchProject } from "@/services/intake";

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const createProject = async () => {
      setError(null);
      try {
        const result = await createLaunchProject("Launch Project");
        if (active) router.replace(`/projects/${result.projectId}`);
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Failed to create project";
        setError(msg);
      }
    };
    void createProject();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <section className="northstar-shell" aria-label="New project setup">
      <div className="northstar-main" style={{ padding: "2rem" }}>
        <h1>Creating new project</h1>
        <p>{error ? "Project creation failed." : "Bootstrapping your workspace..."}</p>
        {error ? (
          <p>
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
