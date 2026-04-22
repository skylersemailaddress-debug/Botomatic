export interface ExecuteRequest {
  projectId: string;
  packetId: string;
  branchName: string;
  goal: string;
  requirements: string[];
  constraints: string[];
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
