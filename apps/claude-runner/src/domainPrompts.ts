import { ExecuteRequest } from "./types.js";

// ── Synthesized capability registry (runtime-loaded) ─────────────────────────
// Populated by the capability-synthesizer package when new domains are detected.
// Keyed by waveTypeId matching what detectWaveType() returns for the domain.
const synthesizedConstraints = new Map<string, string>();
const synthesizedWaveContexts = new Map<string, { preamble: string; instructions: string; fileHints: string }>();

export function registerSynthesizedDomainPrompts(
  waveTypeId: string,
  constraints: string,
  waveContext: { preamble: string; instructions: string; fileHints: string }
): void {
  synthesizedConstraints.set(waveTypeId, constraints);
  synthesizedWaveContexts.set(waveTypeId, waveContext);
}

export type WaveType =
  | "repo_layout"
  | "api_schema"
  | "auth"
  | "builder_factory"
  | "spec_compiler"
  | "intelligence_shell"
  | "governance_security"
  | "deployment_rollback"
  | "validation_proof"
  | "fresh_clone_proof"
  | "execution_runtime"
  | "repair_replay"
  | "truth_memory"
  | "roblox_game"
  | "unity_steam_game"
  | "godot_game"
  | "react_native_mobile"
  | "flutter_mobile"
  | "electron_desktop"
  | "tauri_desktop"
  | "ios_swift"
  | "android_kotlin"
  | "dotnet_maui"
  | "generic";

export function detectWaveType(packetId: string, goal: string): WaveType {
  const id = (packetId + " " + goal).toLowerCase();
  if (/repo[_-]?layout|scaffold|monorepo|workspace|tsconfig/.test(id)) return "repo_layout";
  if (/api[_-]?schema|data.?model|migration|prisma|database|schema/.test(id)) return "api_schema";
  if (/auth|rbac|role|permission|jwt|session|clerk|oauth/.test(id)) return "auth";
  if (/builder[_-]?factory|build.?pipeline|ci[_-]?cd|build.?system/.test(id)) return "builder_factory";
  if (/spec[_-]?compiler|spec.?engine|compiler|intake/.test(id)) return "spec_compiler";
  if (/intelligence|shell|ui.?shell|admin|frontend|dashboard/.test(id)) return "intelligence_shell";
  if (/governance|security|audit|compliance|policy/.test(id)) return "governance_security";
  if (/deploy|rollback|vercel|railway|release/.test(id)) return "deployment_rollback";
  if (/valid|test|proof|evidence|e2e|smoke/.test(id)) return "validation_proof";
  if (/fresh[_-]?clone|clone.?proof|final.?proof/.test(id)) return "fresh_clone_proof";
  if (/execution|runtime|worker|queue|job/.test(id)) return "execution_runtime";
  if (/repair|replay|fix|recover|patch/.test(id)) return "repair_replay";
  if (/memory|truth|state|store|cache/.test(id)) return "truth_memory";
  if (/roblox|luau|datastore|remoteevent|robloxstudio/.test(id)) return "roblox_game";
  if (/unity|csharp|steamworks|steam.?game|godot.*steam|steam.*godot/.test(id)) return "unity_steam_game";
  if (/godot|gdscript|godot.?game/.test(id)) return "godot_game";
  if (/react.?native|expo|eas.?build|rn.?app/.test(id)) return "react_native_mobile";
  if (/flutter|dart|riverpod|go_router/.test(id)) return "flutter_mobile";
  if (/electron|ipc.?main|context.?bridge|electron.?builder/.test(id)) return "electron_desktop";
  if (/tauri|tauri.?command|cargo.*tauri/.test(id)) return "tauri_desktop";
  if (/swift|swiftui|xcode|uikit|appkit|ios.?app/.test(id)) return "ios_swift";
  if (/kotlin|jetpack.?compose|android|gradle.*android/.test(id)) return "android_kotlin";
  if (/maui|dotnet.?maui|xamarin|csharp.*mobile/.test(id)) return "dotnet_maui";
  return "generic";
}

const HEALTH_ENDPOINT = `
// Health endpoint — required for smoke validation
if (req.url === "/health") {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: SERVICE_NAME }));
  return;
}`.trim();

// ── Trusted dependency manifest ───────────────────────────────────────────────
// Use ONLY these packages and versions. This prevents AI from inventing package
// names, using deprecated APIs, or picking versions with breaking changes.
const TRUSTED_DEPS = `
## APPROVED PACKAGES — use ONLY these (do not invent or use unlisted packages):

### HTTP / Framework
- express@4.19.2          — HTTP server (prefer over raw http for complex routes)
- cors@2.8.5              — CORS middleware for Express
- helmet@7.1.0            — Security headers for Express

### Auth / Security
- jsonwebtoken@9.0.2      — JWT sign/verify (import as "jsonwebtoken")
- bcryptjs@2.4.3          — Password hashing (NOT bcrypt — use bcryptjs, pure JS)
- express-rate-limit@7.3.1 — Rate limiting middleware

### Database / ORM
- @prisma/client@5.14.0   — Prisma ORM client (always use with schema.prisma)
- prisma@5.14.0           — Prisma CLI (dev dependency)

### Validation
- zod@3.23.8              — Schema validation (use for all input validation)

### Email
- resend@3.2.0            — Transactional email (preferred)
- @sendgrid/mail@8.1.3    — SendGrid alternative

### Payments
- stripe@15.7.0           — Stripe SDK (import: import Stripe from "stripe")

### File Storage
- @aws-sdk/client-s3@3.600.0      — AWS S3 v3 SDK
- @aws-sdk/s3-request-presigner@3.600.0 — Presigned URLs

### WebSockets / Real-time
- socket.io@4.7.5         — WebSocket server (with socket.io-client@4.7.5 on client)

### Utilities
- uuid@9.0.1              — UUID generation (import: import { v4 as uuidv4 } from "uuid")
- date-fns@3.6.0          — Date manipulation (NOT moment.js)
- dotenv@16.4.5           — Env var loading

### Queue / Jobs
- bullmq@5.8.4            — Job queue with Redis
- ioredis@5.3.2           — Redis client

### Testing
- vitest@1.6.0            — Test runner (preferred over jest)
- supertest@7.0.0         — HTTP testing

### Frontend (if applicable)
- next@14.2.4             — Next.js app router
- react@18.3.1 / react-dom@18.3.1
- tailwindcss@3.4.4       — Utility CSS
- @radix-ui/react-*@latest — Headless UI primitives (shadcn/ui uses these)

### Do NOT use:
- moment.js (use date-fns), lodash (use native JS), axios (use fetch),
  request (deprecated), node-fetch (use built-in fetch in Node 18+),
  mongoose (use Prisma), sequelize (use Prisma), passport (implement JWT directly)
`.trim();

export function buildSystemPrompt(): string {
  return `You are an expert full-stack software engineer generating production-quality Node.js/TypeScript application code. You MUST:

1. Generate REAL, WORKING code — no placeholders, no TODOs, no "// implement this"
2. Every server file MUST include a /health endpoint returning { status: "ok" }
3. Use TypeScript where appropriate, prefer .ts over .js for all logic files
4. All files must be syntactically valid and immediately runnable by Node.js 20+
5. Use built-in Node.js fetch (Node 18+) instead of axios or node-fetch
6. Keep implementations focused and complete — no skeleton stubs, no half-finished code

CRITICAL: The /health endpoint returning JSON { status: "ok" } is MANDATORY in any HTTP server file.

${TRUSTED_DEPS}`;
}

function buildCrossPacketContext(req: ExecuteRequest): string {
  const parts: string[] = [];

  // Repo structure — helps every wave understand the monorepo layout
  if (req.repoStructure) {
    parts.push(`## Repo Structure (from repo_layout wave)\n${req.repoStructure.slice(0, 800)}`);
  }

  // Data model — critical for auth, builder_factory, api_schema, intelligence_shell
  if (req.dataModelSchema) {
    parts.push(`## Data Model (from api_schema wave)\nUse these exact entity names and field types in your implementation:\n\`\`\`prisma\n${req.dataModelSchema.slice(0, 1200)}\n\`\`\``);
  }

  // API routes — helps auth, builder, and UI waves know the contract
  if (req.apiRoutes) {
    parts.push(`## API Contract (from api_schema wave)\n\`\`\`typescript\n${req.apiRoutes.slice(0, 800)}\n\`\`\``);
  }

  // Summary of all completed waves — gives broader situational awareness
  if (req.previousWaveOutputs && req.previousWaveOutputs.length > 0) {
    const summaries = req.previousWaveOutputs
      .map(w => `- [${w.waveType}] ${w.summary} → files: ${w.fileList.slice(0, 6).join(", ")}`)
      .join("\n");
    parts.push(`## Completed Waves\n${summaries}`);
  }

  return parts.length > 0 ? `\n---\n${parts.join("\n\n")}\n---\n` : "";
}

// ── Domain blueprint constraints ─────────────────────────────────────────────
// Injected per wave to enforce proven patterns that AI consistently gets wrong.
const DOMAIN_CONSTRAINTS: Partial<Record<WaveType, string>> = {
  auth: `
## AUTH IMPLEMENTATION RULES (non-negotiable):
- JWT: use jsonwebtoken@9.0.2. Sign with process.env.JWT_SECRET. Expiry: 15m access token, 7d refresh token in httpOnly cookie.
- Password: ALWAYS use bcryptjs.hash(password, 12) — NEVER store plaintext or use bcrypt (use bcryptjs).
- Middleware: extract Bearer token from Authorization header, verify, attach decoded user to req.user.
- RBAC: canDo(user, action, resource) helper that checks role permissions map.
- Routes: POST /auth/register, POST /auth/login (returns {accessToken}), POST /auth/refresh, POST /auth/logout, GET /auth/me.
- Logout: clear the refresh token cookie AND invalidate token (add to blocklist or use short TTL).
- NEVER hardcode secrets. ALWAYS read from process.env. Throw clear error if JWT_SECRET missing at startup.`,

  api_schema: `
## PRISMA SCHEMA RULES (non-negotiable):
- ALWAYS include: id String @id @default(cuid()), createdAt DateTime @default(now()), updatedAt DateTime @updatedAt on every model.
- ALWAYS add @@index on foreign key fields (e.g., @@index([userId])).
- Soft-delete: add deletedAt DateTime? to any entity that should be soft-deleted; filter WHERE deletedAt IS NULL in all queries.
- Enums: use Prisma enums (not string fields) for status fields.
- Relations: always define both sides of the relation explicitly.
- Generate working Prisma schema that passes \`prisma validate\`.`,

  governance_security: `
## SECURITY RULES (non-negotiable):
- Rate limiting: apply express-rate-limit to all auth endpoints (max 10 req/15min).
- Input validation: use zod schemas for ALL incoming request bodies — never trust raw req.body.
- SQL injection: use Prisma parameterized queries ONLY — never string-concatenate into queries.
- XSS: sanitize any user content before storing or returning as HTML.
- Secrets: scanner must flag any string matching /[a-z0-9]{32,}/i that appears in source code literals.
- Audit: every mutating action must write to audit_log with {timestamp, actorId, action, resourceType, resourceId, before, after}.`,

  deployment_rollback: `
## DEPLOYMENT RULES (non-negotiable):
- vercel.json: set framework to null for API-only, or "nextjs" for Next.js. Include rewrites if needed.
- Health probe: poll GET /health until 200 or timeout 120s with 2s interval.
- Rollback: use git tags for checkpoints (git tag before deploy, git checkout tag on rollback).
- Dockerfile: multi-stage — build stage (node:20-alpine + npm ci + npm run build), runtime stage (node:20-alpine + only production files).
- Environment: NEVER hardcode values — all secrets via process.env, verified at startup.`,

  validation_proof: `
## TESTING RULES (non-negotiable):
- Use vitest (NOT jest). Import: import { describe, it, expect, beforeAll, afterAll } from "vitest".
- Smoke test: start the actual server on a random port, hit GET /health, assert status 200 and body.status === "ok".
- Integration tests: test the actual HTTP endpoints with supertest — not mocked behavior.
- Coverage: test happy path AND the most important error case (400 bad input, 401 unauthorized) for each endpoint.
- Each test file must be independently runnable: no shared mutable state between describe blocks.`,

  intelligence_shell: `
## FRONTEND RULES (non-negotiable):
- Use Next.js 14 App Router (not Pages Router). Server components by default, client components only where needed.
- Auth guard: create middleware.ts at root that checks for auth cookie/token and redirects to /login if missing.
- API client (lib/api.ts): typed fetch wrapper that reads NEXT_PUBLIC_API_BASE_URL from env, includes credentials: "include".
- Error states: every data-fetching component must handle loading, error, and empty states.
- Tailwind: use shadcn/ui patterns — cn() utility, className merging, consistent spacing scale.`,

  execution_runtime: `
## QUEUE/WORKER RULES (non-negotiable):
- In-memory queue: use a Map<string, Job> with status: "queued"|"running"|"succeeded"|"failed".
- Worker: process one job at a time, mark running before starting, always mark succeeded/failed in finally block.
- Timeouts: wrap job execution in Promise.race with a 60s timeout — failed jobs must not block the queue.
- Retry: support max 3 retries with exponential backoff (1s, 2s, 4s). Track retryCount on each job.
- /queue/status endpoint: return {queued, running, succeeded, failed, total} counts.`,

  react_native_mobile: `
## REACT NATIVE / EXPO RULES (non-negotiable):
- Framework: Expo managed workflow with EAS Build — not bare React Native unless native modules explicitly required.
- Navigation: React Navigation 6 (Stack + Bottom Tabs). Always wrap app in NavigationContainer at root.
- Auth tokens: ALWAYS use expo-secure-store — NEVER AsyncStorage for sensitive data.
- Environment: all API URLs and keys via app.config.ts (extra.apiBaseUrl) — never hardcoded.
- TypeScript: strict mode. All components must be typed with React.FC<Props> or named function with typed props.
- Styling: StyleSheet.create() for styles — never inline objects in JSX (performance).
- Platform: check Platform.OS for platform-specific behaviour. Use Platform.select() for style variants.
- Push notifications: expo-notifications for token registration and received handler. Always request permissions before subscribing.
- Error handling: wrap navigation screens in ErrorBoundary. Every data fetch must handle loading/error/empty states.`,

  flutter_mobile: `
## FLUTTER / DART RULES (non-negotiable):
- Language: Dart (latest stable). No null safety violations — all fields must be non-nullable or explicitly nullable.
- State management: Riverpod 2 (ref.watch / ref.read / AsyncNotifier). No Provider, GetX, or setState for business logic.
- Navigation: go_router with typed routes. Define routes in a single router.dart file.
- HTTP: dio package with Interceptor for auth token injection (Bearer header). Throw DioException on non-2xx.
- Secure storage: flutter_secure_storage for tokens — never SharedPreferences for sensitive data.
- Data classes: use freezed + json_serializable. Run build_runner before committing. No manual copyWith.
- Async: use async/await with try/catch. NEVER use Future.then() chains.
- Logging: use logger package (Logger class) — no print() calls in production.
- Images: use CachedNetworkImage for remote images — never Image.network directly.`,

  electron_desktop: `
## ELECTRON RULES (non-negotiable):
- Security: contextIsolation: true, nodeIntegration: false, sandbox: true in ALL BrowserWindow configs.
- IPC: ALL main↔renderer communication via contextBridge.exposeInMainWorld in preload.ts. No direct require('electron') in renderer.
- Build: Vite for renderer, electron-builder for packaging. NEVER webpack unless specifically required.
- Settings: electron-store for all app settings persistence. NEVER localStorage for settings.
- Paths: use app.getPath('userData') for user data — NEVER hardcode absolute paths.
- Auto-update: electron-updater with GitHub Releases. Implement update-available and update-downloaded events.
- Logging: electron-log — configure to write to file AND console. Log app lifecycle events.
- Main process errors: wrap all ipcMain.handle() in try/catch and return structured { error } on failure.
- CSP: set Content-Security-Policy in main process BrowserWindow webContents headers.`,

  tauri_desktop: `
## TAURI RULES (non-negotiable):
- Permissions: ONLY declare the capabilities you need in tauri.conf.json allowlist — never wildcard.
- Commands: ALL frontend→backend calls use invoke('command_name', args) — never direct filesystem/shell access from renderer.
- Rust handlers: ALL #[tauri::command] functions must return Result<T, String>. Use ? operator, never .unwrap() in production.
- Async Rust: use async fn for all I/O commands. Mark with #[tauri::command] + async fn.
- JS API: use @tauri-apps/api for all Tauri-specific APIs. No Node.js require() in renderer.
- Plugins: use official Tauri plugins (tauri-plugin-fs, tauri-plugin-store, tauri-plugin-notification) — not raw OS calls.
- Error propagation: Rust errors convert to String via .map_err(|e| e.to_string()) before returning to frontend.
- Build: cargo check before tauri build. Fix ALL warnings in Rust code.`,

  ios_swift: `
## IOS SWIFT / SWIFTUI RULES (non-negotiable):
- Language: Swift 5.9+. Use SwiftUI for all UI — no UIKit unless platform integration requires it.
- Concurrency: async/await with Task and Actor — NO DispatchQueue.main.async or completion handlers.
- Storage: Keychain (via KeychainAccess package) for auth tokens — NEVER UserDefaults for sensitive data.
- Networking: URLSession with async/await. Codable + JSONDecoder for responses. Never use Alamofire.
- Dependencies: Swift Package Manager only — no CocoaPods or Carthage.
- Architecture: MVVM with @Observable (iOS 17+) or @ObservedObject / @StateObject for older targets.
- Navigation: NavigationStack with typed NavigationPath — no NavigationView (deprecated iOS 16+).
- Error handling: throw/catch structured errors conforming to LocalizedError — never force-unwrap optionals.
- Sign in with Apple: REQUIRED for any app with third-party login (App Store rule).`,

  android_kotlin: `
## ANDROID KOTLIN / JETPACK COMPOSE RULES (non-negotiable):
- Language: Kotlin. Jetpack Compose for all UI — no XML layouts.
- Architecture: MVVM with ViewModel + StateFlow. Use collectAsStateWithLifecycle() in composables.
- Coroutines: viewModelScope for ViewModel-launched coroutines. Dispatchers.IO for network/DB, Dispatchers.Main for UI.
- DI: Hilt (Dagger Hilt) for all dependency injection. @HiltViewModel for ViewModels.
- Navigation: Navigation Compose with type-safe routes (Kotlin Sealed class route definitions).
- HTTP: Retrofit2 + OkHttp3 + kotlinx.serialization. Inject Retrofit via Hilt module.
- Storage: EncryptedSharedPreferences or Android Keystore for tokens — NEVER plain SharedPreferences for auth.
- Settings: Jetpack DataStore (Preferences) — not SharedPreferences.
- Build: ./gradlew build must pass. Target SDK must match current Google Play requirements (API 34+).
- Permissions: declare all permissions in AndroidManifest.xml. Request dangerous permissions at runtime.`,

  dotnet_maui: `
## .NET MAUI RULES (non-negotiable):
- Language: C# 12 / .NET 8 LTS. XAML or C# Markup for UI — prefer C# Markup for complex views.
- Architecture: MVVM via CommunityToolkit.Mvvm (ObservableObject, RelayCommand, [ObservableProperty]).
- DI: Microsoft.Extensions.DependencyInjection registered in MauiProgram.cs. Inject via constructor.
- Navigation: Shell URI-based navigation. Register all routes in AppShell.xaml or Shell.Current.GoToAsync().
- HTTP: HttpClient with named client registered in DI, with BaseAddress and DelegatingHandler for auth.
- Secure storage: SecureStorage.SetAsync() for tokens — NEVER Preferences for sensitive data.
- Platform-specific: use #if WINDOWS, #if ANDROID, #if IOS guards or partial class platform implementations.
- Build: dotnet build must succeed for all target frameworks. Warnings-as-errors for security-sensitive code.
- Entitlements: declare all permissions in each platform manifest (AndroidManifest.xml, Info.plist, Package.appxmanifest).`,

  roblox_game: `
## ROBLOX / LUAU RULES (non-negotiable):
- Language: Luau ONLY. No TypeScript, no Node.js, no external npm packages.
- Architecture: ServerScriptService for server Scripts, StarterPlayerScripts for LocalScripts, ReplicatedStorage for shared ModuleScripts and RemoteEvents/RemoteFunctions.
- ALL RemoteEvent/RemoteFunction handlers on the server MUST validate every argument before use — never trust client inputs.
- Data persistence: use Roblox DataStoreService with pcall() wrappers and retry on failure. NEVER rely on in-memory state for persistent player data.
- Monetisation: MarketplaceService:PromptGamePassPurchase() and :PromptProductPurchase() — grant items/currency ONLY from the server-side ProcessReceipt callback.
- Performance: use task.spawn() for non-blocking operations. Avoid wait() (deprecated) — use task.wait() instead.
- Communication: all gameplay events must go through RemoteEvents. NEVER call server functions directly from client scripts.
- NEVER hardcode UserId values. NEVER grant currency/items without server-side verification.`,

  unity_steam_game: `
## UNITY / C# / STEAM RULES (non-negotiable):
- Language: C# (.cs) targeting Unity 2022 LTS or newer. Use UnityEngine and Steamworks.NET namespaces.
- Architecture: ScriptableObject-based data (no magic strings), singleton GameManager/AudioManager via DontDestroyOnLoad, scene transitions via SceneLoader.
- Save system: use JsonUtility.ToJson() / FromJson() with FileStream to persistent data path. NEVER use PlayerPrefs for gameplay-critical data.
- Steam integration: Steamworks.NET wrapper. Init via SteamAPI.Init() in Awake, shut down in OnApplicationQuit. Achievement unlock via SteamUserStats.SetAchievement().
- Input: use new Unity Input System (not legacy Input.GetKey). Define InputActionAsset in assets.
- Debug: surround all Debug.Log calls with #if UNITY_EDITOR / #endif guards in production scripts.
- Build pipeline: multi-platform build script (BuildScript.cs) with BuildPlayerOptions. Output to /Builds/ directory. NEVER hardcode absolute paths.
- Async: use UniTask or Coroutines for async operations. NEVER block the main thread with Thread.Sleep.`,

  godot_game: `
## GODOT 4 / GDSCRIPT RULES (non-negotiable):
- Language: GDScript (.gd) for Godot 4. Use @export, @onready, signal, await correctly.
- Architecture: Autoloads (project.godot [autoload] section) for GameManager, SaveManager, AudioManager. Use signals for loose coupling between nodes — avoid direct node references across branches.
- Save system: use FileAccess.open() with JSON.stringify()/parse() to user://save.json. Call save in NOTIFICATION_WM_CLOSE_REQUEST and on explicit save action.
- Scene management: SceneLoader autoload with transition animation. Use ResourceLoader.load_threaded_request() for large scenes.
- Input: define all actions in Project Settings > Input Map. Use Input.is_action_pressed() — never hardcode key constants.
- Signals: declare signals at top of class with `signal my_signal`. Emit with emit_signal() or shorthand self.my_signal.emit().
- Resource system: extend Resource for all data objects (items, stats, quests). Store as .tres files, load with preload() for small assets, load() for large.
- Performance: use Object Pooling for frequently spawned nodes. Never instantiate/free nodes in tight loops.
- Export: configure export templates in export_presets.cfg. NEVER hardcode absolute paths — use res:// and user:// prefixes.`,
};

export function buildUserPrompt(req: ExecuteRequest, waveType: WaveType): string {
  const { goal, requirements, constraints, packetId } = req;

  const reqLines = requirements.length > 0
    ? `\nRequirements:\n${requirements.map(r => `- ${r}`).join("\n")}`
    : "";
  const conLines = constraints.length > 0
    ? `\nConstraints:\n${constraints.map(c => `- ${c}`).join("\n")}`
    : "";

  // Static registry first, synthesized runtime registry as fallback extension
  const waveContext = WAVE_CONTEXT[waveType]
    ?? synthesizedWaveContexts.get(waveType)
    ?? WAVE_CONTEXT.generic;
  const crossPacketCtx = buildCrossPacketContext(req);
  const domainConstraints = DOMAIN_CONSTRAINTS[waveType as keyof typeof DOMAIN_CONSTRAINTS]
    ?? synthesizedConstraints.get(waveType)
    ?? "";

  return `${waveContext.preamble}

Packet ID: ${packetId}
Goal: ${goal}${reqLines}${conLines}
${crossPacketCtx}
${waveContext.instructions}
${domainConstraints}

Generate all necessary files using the write_files tool. Each file must be complete and functional.
${waveContext.fileHints}`;
}

const WAVE_CONTEXT: Record<WaveType, { preamble: string; instructions: string; fileHints: string }> = {
  repo_layout: {
    preamble: "Generate a production monorepo scaffold.",
    instructions: `Create the core workspace structure including:
- Root package.json with workspaces, build, test, lint scripts
- tsconfig.json with strict settings
- Shared types package (packages/core-contracts/src/index.ts)
- A working HTTP entrypoint (apps/api/src/server.ts) with /health endpoint
- .gitignore, .npmrc for the monorepo`,
    fileHints: `Required files: package.json, tsconfig.json, packages/core-contracts/src/index.ts, apps/api/src/server.ts, .gitignore`,
  },

  api_schema: {
    preamble: "Generate API contracts, data model, and database schema.",
    instructions: `Create:
- Prisma schema (schema.prisma) with all entities from the spec, proper relations, and indexes
- SQL migration file (migrations/001_initial.sql) equivalent
- TypeScript type definitions (src/types/models.ts) for all entities
- API route contracts (src/types/api.ts) with request/response types for all endpoints
- A working Express API server (src/server.ts) with CRUD routes and /health`,
    fileHints: `Required files: prisma/schema.prisma, migrations/001_initial.sql, src/types/models.ts, src/types/api.ts, src/server.ts`,
  },

  auth: {
    preamble: "Generate authentication and authorization implementation.",
    instructions: `Create:
- JWT auth middleware (src/middleware/auth.ts) — sign/verify tokens, extract user from header
- RBAC policy (src/auth/rbacPolicy.ts) — role definitions, permission checks, canDo() helpers
- Auth routes (src/routes/auth.ts) — POST /auth/login, POST /auth/logout, GET /auth/me
- Session types (src/types/auth.ts) — User, Role, Session, JWTPayload interfaces
- A working server (src/server.ts) wiring auth middleware and routes, with /health`,
    fileHints: `Required files: src/middleware/auth.ts, src/auth/rbacPolicy.ts, src/routes/auth.ts, src/types/auth.ts, src/server.ts`,
  },

  builder_factory: {
    preamble: "Generate build pipeline and factory configuration.",
    instructions: `Create:
- Build orchestrator (src/builder.ts) — runs build steps, collects results, reports status
- Pipeline config (src/pipeline.ts) — defines stages: lint, typecheck, test, bundle
- Build scripts (scripts/build.mjs) — executable build entry point
- CI config (.github/workflows/ci.yml) — lint, test, build on push
- Health server (src/server.ts) — exposes /health and /status for build state`,
    fileHints: `Required files: src/builder.ts, src/pipeline.ts, scripts/build.mjs, .github/workflows/ci.yml, src/server.ts`,
  },

  spec_compiler: {
    preamble: "Generate spec compilation and analysis engine.",
    instructions: `Create:
- Spec parser (src/specParser.ts) — parses text spec into structured CompilerInput
- Wave compiler (src/waveCompiler.ts) — compiles spec into ordered waves with acceptance criteria
- Hash engine (src/hashEngine.ts) — deterministic SHA-256 hashing for spec/wave IDs
- Compiler CLI (src/cli.ts) — reads spec file, outputs compiled mission JSON
- Health server (src/server.ts) — /health + /compile endpoint accepting spec text`,
    fileHints: `Required files: src/specParser.ts, src/waveCompiler.ts, src/hashEngine.ts, src/cli.ts, src/server.ts`,
  },

  intelligence_shell: {
    preamble: "Generate UI shell and admin frontend.",
    instructions: `Create:
- Next.js page layout (app/layout.tsx) — root layout with navigation sidebar
- Dashboard page (app/dashboard/page.tsx) — status cards, mission progress, wave list
- App shell component (components/AppShell.tsx) — nav, auth guard, theme
- API client (lib/api.ts) — typed fetch wrappers for all backend routes
- Health check (app/api/health/route.ts) — Next.js route returning { status: "ok" }`,
    fileHints: `Required files: app/layout.tsx, app/dashboard/page.tsx, components/AppShell.tsx, lib/api.ts, app/api/health/route.ts`,
  },

  governance_security: {
    preamble: "Generate governance, security, and compliance layer.",
    instructions: `Create:
- Security policy (src/security/policy.ts) — defines allowed operations, risk levels, approval gates
- Audit logger (src/audit/log.ts) — structured audit trail with timestamp, actor, action, outcome
- Compliance checker (src/compliance/checker.ts) — validates operations against policy, blocks violations
- Secret validator (src/secrets/validator.ts) — scans for hardcoded credentials, enforces env-only secrets
- Health server (src/server.ts) — /health + /audit/recent endpoint`,
    fileHints: `Required files: src/security/policy.ts, src/audit/log.ts, src/compliance/checker.ts, src/secrets/validator.ts, src/server.ts`,
  },

  deployment_rollback: {
    preamble: "Generate deployment configuration and rollback procedures.",
    instructions: `Create:
- Vercel config (vercel.json) — production deployment with env var references
- Deployment script (scripts/deploy.mjs) — pre-flight checks, deploy, smoke, rollback on failure
- Rollback handler (src/rollback.ts) — checkpoint save before deploy, restore on failure
- Health probe (scripts/health-probe.mjs) — polls /health until ready or timeout
- Docker config (Dockerfile) — multi-stage Node.js production build`,
    fileHints: `Required files: vercel.json, scripts/deploy.mjs, src/rollback.ts, scripts/health-probe.mjs, Dockerfile`,
  },

  validation_proof: {
    preamble: "Generate validation and test suite.",
    instructions: `Create:
- Integration test suite (tests/integration.test.ts) — tests all API endpoints with real HTTP calls
- Unit tests (tests/unit.test.ts) — tests core business logic functions
- Smoke test (tests/smoke.test.ts) — starts server, hits /health, validates response
- Test runner (scripts/run-tests.mjs) — orchestrates unit + integration + smoke, reports results
- Health server stub (src/server.ts) — minimal server for smoke tests to target`,
    fileHints: `Required files: tests/integration.test.ts, tests/unit.test.ts, tests/smoke.test.ts, scripts/run-tests.mjs, src/server.ts`,
  },

  fresh_clone_proof: {
    preamble: "Generate fresh clone verification scripts.",
    instructions: `Create:
- Clone verifier (scripts/verify-fresh-clone.mjs) — clones repo, runs npm ci, npm run build, npm test, reports all results
- Preflight checker (scripts/preflight.mjs) — validates all required env vars, ports, dependencies present
- Smoke harness (scripts/smoke-harness.mjs) — starts server, runs 10 health checks, measures latency
- Verification report (scripts/report.mjs) — aggregates all check results into pass/fail JSON
- Health server (src/server.ts) — production-ready server with /health for harness`,
    fileHints: `Required files: scripts/verify-fresh-clone.mjs, scripts/preflight.mjs, scripts/smoke-harness.mjs, scripts/report.mjs, src/server.ts`,
  },

  execution_runtime: {
    preamble: "Generate execution runtime and worker infrastructure.",
    instructions: `Create:
- Job queue (src/queue/jobQueue.ts) — in-memory queue with enqueue, dequeue, status tracking
- Worker (src/worker/worker.ts) — processes jobs from queue, handles retries, reports results
- Execution engine (src/engine/executor.ts) — runs job payloads, captures stdout/stderr, enforces timeout
- Job types (src/types/jobs.ts) — Job, JobResult, JobStatus, WorkerConfig interfaces
- Health server (src/server.ts) — /health + /queue/status endpoint`,
    fileHints: `Required files: src/queue/jobQueue.ts, src/worker/worker.ts, src/engine/executor.ts, src/types/jobs.ts, src/server.ts`,
  },

  repair_replay: {
    preamble: "Generate repair and replay engine.",
    instructions: `Create:
- Failure detector (src/repair/detector.ts) — identifies failure type from error message/exit code
- Repair strategy (src/repair/strategy.ts) — maps failure types to repair actions
- Replay engine (src/repair/replay.ts) — re-runs failed operations with repair applied
- Repair log (src/repair/log.ts) — records repair attempts, outcomes, final status
- Health server (src/server.ts) — /health + /repair/status endpoint`,
    fileHints: `Required files: src/repair/detector.ts, src/repair/strategy.ts, src/repair/replay.ts, src/repair/log.ts, src/server.ts`,
  },

  truth_memory: {
    preamble: "Generate state memory and truth store.",
    instructions: `Create:
- Memory store (src/memory/store.ts) — key-value store with namespacing, TTL, persistence to disk
- Truth compiler (src/truth/compiler.ts) — reduces conversation/state into canonical MasterTruth object
- Snapshot manager (src/memory/snapshots.ts) — save/load/diff memory snapshots
- Query engine (src/truth/query.ts) — structured queries against truth store
- Health server (src/server.ts) — /health + /memory/snapshot endpoint`,
    fileHints: `Required files: src/memory/store.ts, src/truth/compiler.ts, src/memory/snapshots.ts, src/truth/query.ts, src/server.ts`,
  },

  roblox_game: {
    preamble: "Generate a Roblox game module in Luau following Roblox Studio conventions.",
    instructions: `Create the requested Roblox game feature including:
- ServerScript (ServerScriptService/) — server-side logic, DataStore, RemoteEvent handlers with server-side validation
- LocalScript (StarterPlayerScripts/ or StarterGui/) — client-side UI and input handling
- ModuleScript (ReplicatedStorage/) — shared constants, utility functions, data schemas
- RemoteEvents / RemoteFunctions (ReplicatedStorage/Events/) — defined and bound on server
- DataStore save/load (src/DataManager.server.lua) — with pcall retry wrapper`,
    fileHints: `Required files: ServerScriptService/GameServer.server.luau, StarterPlayerScripts/GameClient.client.luau, ReplicatedStorage/Modules/GameConstants.luau, ReplicatedStorage/Events/ (RemoteEvent instances), ServerScriptService/DataManager.server.luau`,
  },

  unity_steam_game: {
    preamble: "Generate a Unity C# game component targeting Steam/PC release.",
    instructions: `Create the requested Unity game feature including:
- GameManager.cs (Assets/Scripts/Core/) — singleton, DontDestroyOnLoad, scene state
- SaveManager.cs (Assets/Scripts/Core/) — JSON save/load via FileStream to persistentDataPath
- Feature script (Assets/Scripts/<Feature>/) — core gameplay logic for the requested feature
- SteamManager.cs (Assets/Scripts/Steam/) — SteamAPI init, achievement + leaderboard helpers
- InputHandler.cs (Assets/Scripts/Input/) — new Unity Input System action callbacks
- BuildScript.cs (Assets/Editor/) — automated multi-platform build pipeline`,
    fileHints: `Required files: Assets/Scripts/Core/GameManager.cs, Assets/Scripts/Core/SaveManager.cs, Assets/Scripts/<Feature>/<Feature>Controller.cs, Assets/Scripts/Steam/SteamManager.cs, Assets/Editor/BuildScript.cs`,
  },

  godot_game: {
    preamble: "Generate a Godot 4 GDScript game component following Godot best practices.",
    instructions: `Create the requested Godot game feature including:
- Autoload scripts (autoloads/) — GameManager.gd, SaveManager.gd with signal declarations
- Scene script (scenes/<feature>/<Feature>.gd) — node logic attached to matching .tscn
- Resource definition (resources/<Type>.gd) — extends Resource, @export properties
- SaveManager implementation — FileAccess + JSON, save to user://save.json
- InputMap actions referenced by string name, never hardcoded key constants`,
    fileHints: `Required files: autoloads/GameManager.gd, autoloads/SaveManager.gd, scenes/<feature>/<Feature>.gd, resources/<Type>.gd, export_presets.cfg`,
  },

  react_native_mobile: {
    preamble: "Generate a React Native / Expo screen or feature.",
    instructions: `Create the requested mobile feature including:
- Screen component (src/screens/<Name>Screen.tsx) — typed React.FC with navigation props
- Navigation types (src/navigation/types.ts) — extend RootStackParamList
- API service hook (src/hooks/use<Name>.ts) — React Query or SWR for data fetching
- Component(s) (src/components/<Name>/) — reusable, typed with StyleSheet.create styles
- Expo config update (app.config.ts) — add any new permissions or plugins needed`,
    fileHints: `Required files: src/screens/<Name>Screen.tsx, src/hooks/use<Name>.ts, src/components/<Name>.tsx, app.config.ts`,
  },

  flutter_mobile: {
    preamble: "Generate a Flutter / Dart feature using Riverpod and go_router.",
    instructions: `Create the requested Flutter feature including:
- Screen widget (lib/screens/<name>_screen.dart) — stateless, uses Consumer/ref.watch
- Provider/Notifier (lib/providers/<name>_provider.dart) — AsyncNotifier or Notifier
- Model (lib/models/<name>.dart) — freezed data class with json_serializable
- Repository (lib/repositories/<name>_repository.dart) — dio-based API calls
- Route registration (lib/router.dart) — add route to existing go_router config`,
    fileHints: `Required files: lib/screens/<name>_screen.dart, lib/providers/<name>_provider.dart, lib/models/<name>.dart, lib/repositories/<name>_repository.dart`,
  },

  electron_desktop: {
    preamble: "Generate an Electron desktop app feature with IPC bridge.",
    instructions: `Create the requested desktop feature including:
- Main process handler (src/main/<feature>.ts) — ipcMain.handle() implementation
- Preload bridge (src/preload/<feature>.ts) — contextBridge.exposeInMainWorld API
- Renderer component (src/renderer/components/<Feature>.tsx) — React + TypeScript UI
- Renderer hook (src/renderer/hooks/use<Feature>.ts) — calls preload bridge methods
- electron-store schema update (src/main/store.ts) — add any new persisted settings`,
    fileHints: `Required files: src/main/<feature>.ts, src/preload/<feature>.ts, src/renderer/components/<Feature>.tsx, src/renderer/hooks/use<Feature>.ts`,
  },

  tauri_desktop: {
    preamble: "Generate a Tauri desktop feature with Rust command and React frontend.",
    instructions: `Create the requested Tauri feature including:
- Rust command (src-tauri/src/commands/<feature>.rs) — async #[tauri::command] returning Result<T, String>
- Rust module registration (src-tauri/src/main.rs) — add command to .invoke_handler(tauri::generate_handler![...])
- TypeScript API wrapper (src/lib/<feature>.ts) — typed invoke() calls matching Rust command signatures
- React component (src/components/<Feature>.tsx) — UI calling the TypeScript wrapper
- Capability update (src-tauri/capabilities/default.json) — add any new required permissions`,
    fileHints: `Required files: src-tauri/src/commands/<feature>.rs, src/lib/<feature>.ts, src/components/<Feature>.tsx`,
  },

  ios_swift: {
    preamble: "Generate a native iOS SwiftUI feature.",
    instructions: `Create the requested iOS feature including:
- View (Sources/<AppName>/Views/<Feature>View.swift) — SwiftUI View with @Observable ViewModel
- ViewModel (Sources/<AppName>/ViewModels/<Feature>ViewModel.swift) — @Observable class, async methods
- Model (Sources/<AppName>/Models/<Feature>.swift) — Codable struct
- Service (Sources/<AppName>/Services/<Feature>Service.swift) — URLSession async/await API calls
- Navigation route (Sources/<AppName>/Navigation/AppRouter.swift) — add NavigationPath destination`,
    fileHints: `Required files: Views/<Feature>View.swift, ViewModels/<Feature>ViewModel.swift, Models/<Feature>.swift, Services/<Feature>Service.swift`,
  },

  android_kotlin: {
    preamble: "Generate a native Android Jetpack Compose feature in Kotlin.",
    instructions: `Create the requested Android feature including:
- Screen composable (app/src/main/java/.../ui/<feature>/<Feature>Screen.kt) — @Composable with ViewModel
- ViewModel (app/src/main/java/.../ui/<feature>/<Feature>ViewModel.kt) — HiltViewModel, StateFlow<UiState>
- Repository (app/src/main/java/.../data/<feature>/<Feature>Repository.kt) — Retrofit API + Room DAO
- API interface (app/src/main/java/.../data/remote/<Feature>Api.kt) — Retrofit @GET/@POST interface
- Hilt module (app/src/main/java/.../di/<Feature>Module.kt) — @Provides for repository and API`,
    fileHints: `Required files: ui/<feature>/<Feature>Screen.kt, ui/<feature>/<Feature>ViewModel.kt, data/<feature>/<Feature>Repository.kt, di/<Feature>Module.kt`,
  },

  dotnet_maui: {
    preamble: "Generate a .NET MAUI cross-platform feature in C#.",
    instructions: `Create the requested MAUI feature including:
- Page (Pages/<Feature>Page.xaml + Pages/<Feature>Page.xaml.cs) — XAML page with code-behind
- ViewModel (ViewModels/<Feature>ViewModel.cs) — ObservableObject, [RelayCommand], [ObservableProperty]
- Service interface (Services/I<Feature>Service.cs) + implementation (Services/<Feature>Service.cs)
- Model (Models/<Feature>.cs) — C# record or class with JSON serialization attributes
- DI registration (MauiProgram.cs) — builder.Services.AddSingleton<I<Feature>Service, <Feature>Service>()`,
    fileHints: `Required files: Pages/<Feature>Page.xaml, ViewModels/<Feature>ViewModel.cs, Services/<Feature>Service.cs, Models/<Feature>.cs`,
  },

  generic: {
    preamble: "Generate the requested application component.",
    instructions: `Create a complete, working implementation based on the goal and requirements. Include:
- Core business logic module (src/index.ts or appropriate entry point)
- Type definitions (src/types.ts)
- Any required utility modules
- A working HTTP server (src/server.ts) with /health endpoint returning { status: "ok" }`,
    fileHints: `Required files: src/index.ts, src/types.ts, src/server.ts`,
  },
};
