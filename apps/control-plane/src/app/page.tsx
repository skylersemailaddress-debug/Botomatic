"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLaunchProject } from "@/services/intake";

export default function Page() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function bootstrap() {
    setError(null);
    try {
      const result = await createLaunchProject("Launch Project");
      router.replace(`/projects/${result.projectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create launch project";
      setError(msg);
    }
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div
        style={{
          padding: "40px",
          fontFamily: "system-ui",
          maxWidth: "600px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ color: "#d4423f", marginTop: "40px" }}>Launch Error</h1>
        <p style={{ color: "#666", lineHeight: "1.6", marginTop: "16px" }}>{error}</p>
        <p style={{ color: "#999", fontSize: "14px", marginTop: "20px" }}>
          Please check that the backend API is running and properly configured.
        </p>
        <button
          onClick={bootstrap}
          style={{
            marginTop: "20px",
            padding: "8px 16px",
            background: "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "system-ui",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginTop: "40px" }}>Initializing Launch Project</h1>
      <p style={{ color: "#666", lineHeight: "1.6", marginTop: "16px" }}>
        Creating your first Botomatic project...
      </p>
      <div
        style={{
          marginTop: "20px",
          padding: "16px",
          background: "#f5f5f5",
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            border: "2px solid #0070f3",
            borderTop: "2px solid transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
