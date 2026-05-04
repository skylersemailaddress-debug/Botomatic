export interface WaveOutput {
  packetId: string;
  waveType: string;
  summary: string;
  fileList: string[];
  completedAt: string;
}

export interface ExecuteRequest {
  projectId: string;
  packetId: string;
  branchName: string;
  goal: string;
  requirements: string[];
  constraints: string[];
  // Cross-packet context
  previousWaveOutputs?: WaveOutput[];
  dataModelSchema?: string;
  apiRoutes?: string;
  repoStructure?: string;
}

export interface FileChange {
  path: string;
  body: string;
}

export interface ExecuteResponse {
  success: boolean;
  summary: string;
  changedFiles: FileChange[];
  logs?: string[];
}
