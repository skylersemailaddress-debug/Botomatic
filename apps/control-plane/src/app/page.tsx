"use client";

import { useEffect } from "react";
import { createLaunchProject } from "@/services/intake";

export default function Page() {
  useEffect(() => {
    async function initializeProject() {
      try {
        const result = await createLaunchProject("Launch Project");
        // Use window.location to redirect since we're in a client component
        // after server action completes
        window.location.href = `/projects/${result.projectId}`;
      } catch (error) {
        console.error("Failed to create launch project:", error);
        // Show error to user
        const errorMsg =
          error instanceof Error ? error.message : "Failed to create launch project";
        document.body.innerHTML = `
          <div style="padding: 40px; font-family: system-ui; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d4423f; margin-top: 40px;">Launch Error</h1>
            <p style="color: #666; line-height: 1.6; margin-top: 16px;">${errorMsg}</p>
            <p style="color: #999; font-size: 14px; margin-top: 20px;">
              Please check that the backend API is running and properly configured.
            </p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 8px 16px; background: #0070f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Retry
            </button>
          </div>
        `;
      }
    }

    initializeProject();
  }, []);

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
