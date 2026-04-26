import fs from "fs";
import path from "path";
import http from "http";
import type { AddressInfo } from "net";
import { createRuntimeConfig } from "../../../../apps/orchestrator-api/src/config";
import { buildApp } from "../../../../apps/orchestrator-api/src/server_app";

export type RouteExecution = {
  method: string;
  path: string;
  status: number;
  ok: boolean;
  details?: string;
};

export type ValidatorRun = {
  name: string;
  status: "passed" | "failed";
  details: string;
};

export type ProofArtifact = {
  generatedAt: string;
  proofGrade: "local_runtime";
  pathId: "greenfield_app_build" | "dirty_repo_rescue_completion" | "self_upgrade" | "universal_capability_pipeline";
  inputUsed: Record<string, unknown>;
  routeExercised: RouteExecution[];
  apiFunctionPathExercised: string[];
  contract: {
    type: "build_contract" | "completion_contract" | "self_upgrade_spec";
    payload: Record<string, unknown>;
  };
  generatedPlanOrBuildGraph: Record<string, unknown>;
  executedSteps: Array<{ step: string; status: "passed" | "failed"; details: string }>;
  validatorsRun: ValidatorRun[];
  producedArtifacts: string[];
  proofLedgerReferences: Array<Record<string, unknown>>;
  status: "passed" | "failed";
  remainingBlockers: string[];
  summary: {
    passedSteps: number;
    failedSteps: number;
  };
};

export async function withApiHarness<T>(fn: (ctx: {
  baseUrl: string;
  token: string;
  requestJson: (method: string, routePath: string, body?: unknown) => Promise<{ status: number; body: any; route: RouteExecution }>;
}) => Promise<T>): Promise<T> {
  const token = process.env.BOTOMATIC_PROOF_TOKEN || "botomatic-proof-token";

  process.env.RUNTIME_MODE = "development";
  process.env.PROJECT_REPOSITORY_MODE = "memory";
  process.env.API_AUTH_TOKEN = token;
  process.env.PORT = "0";

  const config = createRuntimeConfig();
  const app = buildApp(config);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    const port = Number((server.address() as AddressInfo).port);
    const baseUrl = `http://127.0.0.1:${port}`;

    const requestJson = async (method: string, routePath: string, body?: unknown) => {
      const res = await fetch(`${baseUrl}${routePath}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { raw: text };
      }

      return {
        status: res.status,
        body: parsed,
        route: {
          method,
          path: routePath,
          status: res.status,
          ok: res.status >= 200 && res.status < 300,
          details: parsed?.error ? String(parsed.error) : undefined,
        } as RouteExecution,
      };
    };

    return await fn({ baseUrl, token, requestJson });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  }
}

export function writeProofArtifact(fileName: string, artifact: ProofArtifact): string {
  const outDir = path.join(process.cwd(), "release-evidence", "runtime");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  return outPath;
}

export function summarizeStepStatus(steps: Array<{ status: "passed" | "failed" }>): { passedSteps: number; failedSteps: number } {
  const passedSteps = steps.filter((step) => step.status === "passed").length;
  const failedSteps = steps.filter((step) => step.status === "failed").length;
  return { passedSteps, failedSteps };
}
