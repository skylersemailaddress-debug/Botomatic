import { assertNoDemoDataForRealProject } from "@/services/demoMode";

export const proSidebarNav = ["Home", "Projects", "Templates", "Design Studio", "Brand Kit", "Launch", "Learn"];

export const proRecentProjects: { name: string; updated: string }[] = [];

export const proSecondaryNav = [
  "Overview",
  "Code",
  "Database",
  "API",
  "Tests",
  "Runtime",
  "Deployments",
  "Audit Log",
  "Integrations",
  "Secrets",
  "Settings",
];

const demoBuildPipelineSteps = [
  { label: "Design", status: "Complete", time: "2m ago", tone: "done" },
  { label: "Features", status: "Complete", time: "5m ago", tone: "done" },
  { label: "Data", status: "Complete", time: "8m ago", tone: "done" },
  { label: "Logic", status: "In Progress", time: "Running...", tone: "active" },
  { label: "Tests", status: "Waiting", time: "", tone: "waiting" },
  { label: "Launch", status: "Waiting", time: "", tone: "waiting" },
  { label: "Deploy", status: "Waiting", time: "", tone: "waiting" },
] as const;

export const buildPipelineSteps = assertNoDemoDataForRealProject(
  demoBuildPipelineSteps,
  [] as unknown as typeof demoBuildPipelineSteps
);

const demoSystemHealthRows = [
  { label: "Performance", value: "Good" },
  { label: "Security", value: "Good" },
  { label: "Reliability", value: "Good" },
  { label: "Code Quality", value: "A" },
  { label: "Test Coverage", value: "87%" },
];

export const systemHealthRows = assertNoDemoDataForRealProject(demoSystemHealthRows, [] as { label: string; value: string }[]);

const demoServiceRows = [
  "Next.js App",
  "API Server",
  "PostgreSQL",
  "Redis",
  "Storage (S3)",
  "Email Service",
  "Stripe",
];

export const serviceRows = assertNoDemoDataForRealProject(demoServiceRows, [] as string[]);

const demoSchemaRows = [
  { table: "users", rows: "24,512 rows" },
  { table: "properties", rows: "1,245 rows" },
  { table: "bookings", rows: "8,731 rows" },
  { table: "payments", rows: "8,731 rows" },
  { table: "reviews", rows: "3,432 rows" },
];

export const schemaRows = assertNoDemoDataForRealProject(demoSchemaRows, [] as { table: string; rows: string }[]);

const demoCommitRows = [
  { message: "feat: add availability calendar", author: "A. Reyes", time: "2m ago" },
  { message: "fix: resolve booking conflict issue", author: "Sam Wilson", time: "18m ago" },
  { message: "refactor: optimize query performance", author: "Taylor Smith", time: "1h ago" },
  { message: "chore: update dependencies", author: "A. Reyes", time: "2h ago" },
];

export const commitRows = assertNoDemoDataForRealProject(demoCommitRows, [] as { message: string; author: string; time: string }[]);
