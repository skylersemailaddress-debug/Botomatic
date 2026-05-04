export interface WaveOutput {
  packetId: string;
  waveType: string;
  summary: string;
  fileList: string[];   // paths only — keeps token count manageable
  completedAt: string;
}

export interface ExecutorContext {
  projectId: string;
  packetId: string;
  branchName: string;
  goal: string;
  requirements: string[];
  constraints: string[];
  // Cross-packet context: completed waves feed into subsequent waves
  previousWaveOutputs?: WaveOutput[];
  // Extracted artifacts — populated by orchestrator when available
  dataModelSchema?: string;   // Prisma/DB schema from api_schema wave
  apiRoutes?: string;         // API contract from api_schema wave
  repoStructure?: string;     // package.json + file tree from repo_layout wave
}

export interface FileChange {
  path: string;
  body: string;
}

export interface ExecutorResult {
  success: boolean;
  summary: string;
  changedFiles: FileChange[];
  logs?: string[];
}

export interface ExecutorAdapter {
  name: string;
  execute(context: ExecutorContext): Promise<ExecutorResult>;
}
