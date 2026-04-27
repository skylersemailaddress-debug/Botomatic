import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export const dynamic = "force-dynamic";

type StreamEvent = {
  type: "start" | "stdout" | "stderr" | "exit" | "complete" | "error";
  command?: string;
  code?: number | null;
  ok?: boolean;
  data?: string;
  timestamp: string;
};

const COMMANDS = [
  { label: "Build", cmd: "npm", args: ["run", "-s", "build"] },
  { label: "Tests", cmd: "npm", args: ["run", "-s", "test:universal"] },
  { label: "Validate:All", cmd: "npm", args: ["run", "-s", "validate:all"] },
];

function repoRoot(): string {
  return path.resolve(process.cwd(), "../..");
}

function encode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: Omit<StreamEvent, "timestamp">) {
        controller.enqueue(encoder.encode(encode({ ...event, timestamp: new Date().toISOString() })));
      }

      try {
        let allOk = true;
        for (const item of COMMANDS) {
          send({ type: "start", command: item.label, data: `${item.cmd} ${item.args.join(" ")}` });
          const code = await new Promise<number | null>((resolve) => {
            const child = spawn(item.cmd, item.args, {
              cwd: repoRoot(),
              shell: false,
              env: process.env,
            });

            child.stdout.on("data", (chunk) => {
              send({ type: "stdout", command: item.label, data: String(chunk) });
            });

            child.stderr.on("data", (chunk) => {
              send({ type: "stderr", command: item.label, data: String(chunk) });
            });

            child.on("error", (err) => {
              send({ type: "error", command: item.label, data: err.message });
              resolve(1);
            });

            child.on("close", (exitCode) => {
              resolve(exitCode);
            });
          });

          const ok = code === 0;
          allOk = allOk && ok;
          send({ type: "exit", command: item.label, code, ok, data: ok ? "passed" : "failed" });
          if (!ok) break;
        }

        send({ type: "complete", ok: allOk, data: allOk ? "CI pipeline passed" : "CI pipeline failed" });
      } catch (err: any) {
        send({ type: "error", ok: false, data: String(err?.message || err) });
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
