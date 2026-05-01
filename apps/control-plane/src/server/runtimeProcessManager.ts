import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { loadGeneratedApp } from "./generatedAppStore";
import { sanitizeProjectId } from "./executionStore";

type ManagedRuntime = { projectId: string; port: number; url: string; process: ChildProcess; root: string; startedAt: string };
const runtimes = new Map<string, ManagedRuntime>();
const ROOT = path.resolve(process.cwd(), "data/runtime-processes");

async function freePort(start = 4300): Promise<number> {
  for (let port = start; port < start + 300; port += 1) {
    const available = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port, "127.0.0.1");
    });
    if (available) return port;
  }
  throw new Error("No local runtime port available");
}

function htmlFor(app: NonNullable<ReturnType<typeof loadGeneratedApp>>) {
  const esc = (v: string) => v.replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c] || c));
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(app.appName)}</title><style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:linear-gradient(135deg,#071023,#172b58 55%,#8a4a32);color:white;height:100vh;overflow:hidden}nav{display:flex;align-items:center;justify-content:space-between;padding:22px 34px}nav strong{letter-spacing:.1em}nav span{margin:0 10px;font-size:13px;opacity:.82}button{border:0;border-radius:10px;padding:12px 16px;font-weight:900;background:#d99a31;color:white}.hero{max-width:660px;padding:70px 54px}.hero p:first-child{text-transform:uppercase;letter-spacing:.16em;font-size:12px;opacity:.68}.hero h1{font-family:Georgia,serif;font-size:68px;line-height:1.02;margin:0 0 18px}.hero .subtitle{display:block;font-size:19px;line-height:1.5;opacity:.82;margin-bottom:24px}.hero button+button{margin-left:12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26)}</style></head><body><nav><strong>${esc(app.appName)}</strong><div><span>Home</span><span>Features</span><span>About</span><span>Contact</span></div><button>${esc(app.primaryCta)}</button></nav><section class="hero"><p>Generated from your prompt</p><h1>${esc(app.heroTitle)}</h1><span class="subtitle">${esc(app.heroSubtitle)}</span><div><button>${esc(app.primaryCta)}</button><button>${esc(app.secondaryCta)}</button></div></section></body></html>`;
}

export async function startProjectRuntime(projectIdInput: string) {
  const projectId = sanitizeProjectId(projectIdInput);
  const existing = runtimes.get(projectId);
  if (existing && !existing.process.killed) return existing;

  const app = loadGeneratedApp(projectId);
  if (!app) throw new Error("No generated app artifact exists");

  fs.mkdirSync(ROOT, { recursive: true });
  const root = path.join(ROOT, projectId);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "index.html"), htmlFor(app));
  const serverFile = path.join(root, "server.mjs");
  fs.writeFileSync(serverFile, `import http from 'node:http';import fs from 'node:fs';import path from 'node:path';const root=${JSON.stringify(root)};const port=Number(process.env.PORT);const html=fs.readFileSync(path.join(root,'index.html'));http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(html)}).listen(port,'127.0.0.1');`);

  const port = await freePort();
  const child = spawn(process.execPath, [serverFile], { env: { ...process.env, PORT: String(port) }, stdio: "ignore", detached: false });
  const url = `http://127.0.0.1:${port}`;
  await new Promise<void>((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) { clearInterval(timer); resolve(); }
      } catch {
        if (Date.now() - started > 5000) { clearInterval(timer); reject(new Error("Runtime process failed healthcheck")); }
      }
    }, 150);
  });

  const runtime = { projectId, port, url, process: child, root, startedAt: new Date().toISOString() };
  runtimes.set(projectId, runtime);
  child.once("exit", () => runtimes.delete(projectId));
  return runtime;
}

export function stopProjectRuntime(projectIdInput: string) {
  const projectId = sanitizeProjectId(projectIdInput);
  const runtime = runtimes.get(projectId);
  if (!runtime) return false;
  runtime.process.kill();
  runtimes.delete(projectId);
  return true;
}
