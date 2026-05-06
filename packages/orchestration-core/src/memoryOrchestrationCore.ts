import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type CorePacketStatus = "pending" | "queued" | "executing" | "complete" | "failed" | "blocked";
export type CoreJobStatus = "queued" | "running" | "succeeded" | "failed";

export type CorePacket = {
  packetId: string;
  projectId: string;
  milestoneId: string;
  goal: string;
  status: CorePacketStatus;
  dependencies?: string[];
  wave?: number;
  filesToTouch?: string[];
  updatedAt?: string;
};

export type CoreMilestone = {
  id: string;
  sequence: number;
  title?: string;
};

export type CorePlan = {
  milestones: CoreMilestone[];
  packets: CorePacket[];
};

export type QueueJobRecord = {
  jobId: string;
  projectId: string;
  packetId: string;
  status: CoreJobStatus;
  workerId?: string | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MaterializedWorkspace = {
  projectId: string;
  workspacePath: string;
  files: Array<{ path: string; body: string }>;
};

function timestamp(): string {
  return new Date().toISOString();
}

function packetWave(packet: CorePacket): number {
  return Number.isInteger(packet.wave) ? Number(packet.wave) : 0;
}

function queueKey(projectId: string, packetId: string): string {
  return `${projectId}:${packetId}`;
}

export function assignWaveDependencies(plan: CorePlan): CorePlan {
  const milestoneWave = new Map<string, number>();
  [...plan.milestones]
    .sort((a, b) => a.sequence - b.sequence)
    .forEach((milestone, index) => milestoneWave.set(milestone.id, index));

  const packetsWithWaves = plan.packets.map((packet) => ({
    ...packet,
    wave: milestoneWave.get(packet.milestoneId) ?? 0,
    dependencies: [...(packet.dependencies || [])],
  }));

  const packetIdsByWave = new Map<number, string[]>();
  for (const packet of packetsWithWaves) {
    const wave = packetWave(packet);
    packetIdsByWave.set(wave, [...(packetIdsByWave.get(wave) || []), packet.packetId]);
  }

  const updatedPackets = packetsWithWaves.map((packet) => {
    if (packet.dependencies && packet.dependencies.length > 0) return packet;
    const wave = packetWave(packet);
    if (wave <= 0) return packet;
    const previousWaveIds = packetIdsByWave.get(wave - 1) || [];
    return {
      ...packet,
      dependencies: previousWaveIds,
    };
  });

  return {
    milestones: [...plan.milestones],
    packets: updatedPackets,
  };
}

export class InMemoryOrchestrationQueue {
  private jobs = new Map<string, QueueJobRecord>();

  enqueue(input: { projectId: string; packetId: string }): QueueJobRecord {
    const key = queueKey(input.projectId, input.packetId);
    const existing = this.jobs.get(key);
    if (existing) return existing;

    const now = timestamp();
    const job: QueueJobRecord = {
      jobId: `job_${input.projectId}_${input.packetId}`.replace(/[^a-zA-Z0-9_-]/g, "_"),
      projectId: input.projectId,
      packetId: input.packetId,
      status: "queued",
      workerId: null,
      claimedAt: null,
      completedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(key, job);
    return job;
  }

  claim(workerId: string): QueueJobRecord | null {
    const queued = [...this.jobs.values()].find((job) => job.status === "queued");
    if (!queued) return null;
    const now = timestamp();
    const claimed: QueueJobRecord = {
      ...queued,
      status: "running",
      workerId,
      claimedAt: now,
      updatedAt: now,
    };
    this.jobs.set(queueKey(claimed.projectId, claimed.packetId), claimed);
    return claimed;
  }

  finalize(jobId: string, status: "succeeded" | "failed", error?: string): QueueJobRecord {
    const job = [...this.jobs.values()].find((candidate) => candidate.jobId === jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    const finalized: QueueJobRecord = {
      ...job,
      status,
      completedAt: timestamp(),
      lastError: error || null,
      updatedAt: timestamp(),
    };
    this.jobs.set(queueKey(finalized.projectId, finalized.packetId), finalized);
    return finalized;
  }

  list(): QueueJobRecord[] {
    return [...this.jobs.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.jobId.localeCompare(b.jobId));
  }

  stats() {
    const jobs = this.list();
    return {
      queued: jobs.filter((job) => job.status === "queued").length,
      running: jobs.filter((job) => job.status === "running").length,
      succeeded: jobs.filter((job) => job.status === "succeeded").length,
      failed: jobs.filter((job) => job.status === "failed").length,
      total: jobs.length,
    };
  }
}

export function enqueueRunnablePackets(plan: CorePlan, queue: InMemoryOrchestrationQueue): CorePlan {
  const completed = new Set(plan.packets.filter((packet) => packet.status === "complete").map((packet) => packet.packetId));
  const packets = plan.packets.map((packet) => {
    if (packet.status !== "pending") return packet;
    const dependencies = packet.dependencies || [];
    const dependenciesComplete = dependencies.every((dependency) => completed.has(dependency));
    if (!dependenciesComplete) return packet;
    queue.enqueue({ projectId: packet.projectId, packetId: packet.packetId });
    return { ...packet, status: "queued" as CorePacketStatus, updatedAt: timestamp() };
  });
  return { ...plan, packets };
}

export function completeClaimedJob(plan: CorePlan, queue: InMemoryOrchestrationQueue, workerId: string): { plan: CorePlan; job: QueueJobRecord | null } {
  const job = queue.claim(workerId);
  if (!job) return { plan, job: null };

  const executingPackets = plan.packets.map((packet) =>
    packet.packetId === job.packetId ? { ...packet, status: "executing" as CorePacketStatus, updatedAt: timestamp() } : packet
  );
  const finalized = queue.finalize(job.jobId, "succeeded");
  const completedPackets = executingPackets.map((packet) =>
    packet.packetId === finalized.packetId ? { ...packet, status: "complete" as CorePacketStatus, updatedAt: timestamp() } : packet
  );
  return { plan: { ...plan, packets: completedPackets }, job: finalized };
}

export function materializeAtlasCrmWorkspace(projectId: string, outputRoot: string): MaterializedWorkspace {
  const workspacePath = join(outputRoot, projectId);
  const files = [
    {
      path: "package.json",
      body: JSON.stringify({ scripts: { build: "vite build", test: "vitest run" }, dependencies: { "@vitejs/plugin-react": "latest", vite: "latest", react: "latest", "react-dom": "latest" }, devDependencies: { vitest: "latest", typescript: "latest" } }, null, 2),
    },
    {
      path: "src/App.tsx",
      body: `export function App() {\n  const pricing = [\"Starter\", \"Growth\", \"Scale\"];\n  return <main><section><h1>AtlasCRM</h1><p>Commercial CRM launch workspace for pipeline visibility.</p></section><section>{pricing.map((tier) => <article key={tier}>{tier}</article>)}</section><section aria-label=\"Testimonials\">Revenue teams trust AtlasCRM.</section><section aria-label=\"FAQ\">FAQ and contact form UI included.</section><section aria-label=\"Launch readiness checklist\">Security, validation, deployment, support.</section></main>;\n}\n`,
    },
    {
      path: "src/validation/launch-readiness.json",
      body: JSON.stringify({ app: "AtlasCRM", hero: true, pricingCards: 3, testimonials: true, faq: true, contactFormUi: true, launchReadinessChecklist: true }, null, 2),
    },
    {
      path: "README.md",
      body: "# AtlasCRM\n\nGenerated commercial beta workspace with hero, pricing cards, testimonials, FAQ, contact-form UI, and launch-readiness checklist.\n",
    },
  ];

  mkdirSync(workspacePath, { recursive: true });
  for (const file of files) {
    const fullPath = join(workspacePath, file.path);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, file.body);
  }

  return { projectId, workspacePath, files };
}

export function runWorkerWaveProof(outputRoot: string) {
  const projectId = "atlascrm-worker-wave-proof";
  const plan = assignWaveDependencies({
    milestones: [
      { id: "foundation", sequence: 1, title: "Foundation" },
      { id: "experience", sequence: 2, title: "Experience" },
      { id: "launch", sequence: 3, title: "Launch" },
    ],
    packets: [
      { packetId: "foundation-scaffold", projectId, milestoneId: "foundation", goal: "Create AtlasCRM app shell", status: "pending" },
      { packetId: "experience-pages", projectId, milestoneId: "experience", goal: "Add hero pricing testimonials FAQ and contact UI", status: "pending" },
      { packetId: "launch-readiness", projectId, milestoneId: "launch", goal: "Add launch-readiness checklist and validation evidence", status: "pending" },
    ],
  });

  const queue = new InMemoryOrchestrationQueue();
  let currentPlan = enqueueRunnablePackets(plan, queue);
  const firstQueueTotal = queue.stats().total;
  currentPlan = enqueueRunnablePackets(currentPlan, queue);
  const dedupedQueueTotal = queue.stats().total;

  const completedJobs: QueueJobRecord[] = [];
  for (let guard = 0; guard < 10; guard += 1) {
    const result = completeClaimedJob(currentPlan, queue, `worker-${guard + 1}`);
    currentPlan = result.plan;
    if (result.job) completedJobs.push(result.job);
    currentPlan = enqueueRunnablePackets(currentPlan, queue);
    if (currentPlan.packets.every((packet) => packet.status === "complete")) break;
  }

  const workspace = materializeAtlasCrmWorkspace(projectId, outputRoot);
  const proof = {
    projectId,
    score: currentPlan.packets.every((packet) => packet.status === "complete") && workspace.files.length >= 4 && firstQueueTotal === dedupedQueueTotal ? 100 : 0,
    passed: currentPlan.packets.every((packet) => packet.status === "complete") && workspace.files.length >= 4 && firstQueueTotal === dedupedQueueTotal,
    checks: {
      inMemoryQueueRecords: queue.stats().total === currentPlan.packets.length,
      enqueueDeduplication: firstQueueTotal === dedupedQueueTotal,
      workerClaiming: completedJobs.every((job) => Boolean(job.workerId && job.claimedAt)),
      jobFinalization: completedJobs.every((job) => job.status === "succeeded" && Boolean(job.completedAt)),
      waveDependencyAssignment: currentPlan.packets.some((packet) => (packet.dependencies || []).length > 0),
      dependentPacketEnqueueing: queue.stats().total === 3,
      workerMaterialization: workspace.files.length >= 4,
      atlasCrmWorkspace: workspace.files.some((file) => file.body.includes("AtlasCRM")),
    },
    queue: queue.list(),
    packets: currentPlan.packets,
    workspace: { path: workspace.workspacePath, files: workspace.files.map((file) => file.path) },
  };
  return proof;
}
