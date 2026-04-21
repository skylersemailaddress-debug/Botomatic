export interface ExecutorContext {
  projectId: string;
  packetId: string;
  branchName: string;
  goal: string;
  requirements: string[];
  constraints: string[];
}

export interface ExecutorResult {
  success: boolean;
  summary: string;
  changedFiles: string[];
  logs?: string[];
}

export interface ExecutorAdapter {
  name: string;
  execute(context: ExecutorContext): Promise<ExecutorResult>;
}
