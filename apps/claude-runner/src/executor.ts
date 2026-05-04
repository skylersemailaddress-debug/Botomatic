import Anthropic from "@anthropic-ai/sdk";
import { ExecuteRequest, ExecuteResponse, FileChange } from "./types.js";
import { detectWaveType, buildSystemPrompt, buildUserPrompt } from "./domainPrompts.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WRITE_FILES_TOOL: Anthropic.Tool = {
  name: "write_files",
  description: "Write all generated source files for this wave packet. Every file must be complete and functional.",
  input_schema: {
    type: "object" as const,
    properties: {
      files: {
        type: "array",
        description: "Array of files to write",
        items: {
          type: "object",
          properties: {
            path: { type: "string", description: "Relative file path (e.g. src/server.ts)" },
            body: { type: "string", description: "Complete file contents" },
          },
          required: ["path", "body"],
        },
      },
      summary: {
        type: "string",
        description: "One-sentence summary of what was generated",
      },
    },
    required: ["files", "summary"],
  },
};

function ensureHealthEndpoint(files: FileChange[]): FileChange[] {
  // If a server file exists but has no /health route, inject one
  return files.map((f) => {
    const isServer =
      /server\.(ts|js|mjs)$/.test(f.path) &&
      f.body.includes("listen") &&
      !f.body.includes('"/health"') &&
      !f.body.includes("'/health'") &&
      !f.body.includes("`/health`");

    if (!isServer) return f;

    // Inject /health before the first res.writeHead/res.json/res.send or at top of handler
    const healthSnippet = `
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
`;
    // Insert after first createServer( callback opening or http handler
    const injected = f.body.replace(
      /(createServer\s*\([^)]*\)\s*\{|app\.use\(express\.json\(\)\);\s*\n)/,
      (match) => match + healthSnippet
    );
    return { ...f, body: injected !== f.body ? injected : f.body };
  });
}

export async function executePacket(req: ExecuteRequest): Promise<ExecuteResponse> {
  const waveType = detectWaveType(req.packetId, req.goal);
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(req, waveType);

  const logs: string[] = [`wave_type=${waveType}`, `packet_id=${req.packetId}`];

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 8192,
      system: systemPrompt,
      tools: [WRITE_FILES_TOOL],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: userPrompt }],
    });

    logs.push(`claude_stop_reason=${response.stop_reason}`);
    logs.push(`claude_input_tokens=${response.usage.input_tokens}`);
    logs.push(`claude_output_tokens=${response.usage.output_tokens}`);

    for (const block of response.content) {
      if (block.type === "tool_use" && block.name === "write_files") {
        const input = block.input as { files: FileChange[]; summary: string };
        const rawFiles: FileChange[] = (input.files ?? []).filter(
          (f) => typeof f.path === "string" && typeof f.body === "string" && f.path.length > 0
        );

        const files = ensureHealthEndpoint(rawFiles);
        logs.push(`files_generated=${files.length}`);

        return {
          success: true,
          summary: input.summary ?? `Generated ${files.length} files for ${req.packetId}`,
          changedFiles: files,
          logs,
        };
      }
    }

    // No tool_use block — extract any text content as fallback
    const textContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as Anthropic.TextBlock).text)
      .join("\n");

    logs.push("warn: no write_files tool call in response");
    return {
      success: false,
      summary: "Claude did not call write_files tool",
      changedFiles: [],
      logs: [...logs, textContent.slice(0, 500)],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`error=${msg}`);
    return {
      success: false,
      summary: `Execution error: ${msg}`,
      changedFiles: [],
      logs,
    };
  }
}
