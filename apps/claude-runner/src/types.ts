export interface ExecuteRequest {
  projectId: string;
  packetId: string;
  branchName: string;
  goal: string;
  requirements: string[];
  constraints: string[];
}

export interface ExecuteResponse {
  success: boolean;
  summary: string;
  changedFiles: string[];
  logs?: string[];
}
