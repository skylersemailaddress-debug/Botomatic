export interface EvidenceExportRequest {
  exportId: string;
  traceId: string;
  tenantId: string;
  projectId: string;
  category: string;
}

export interface EvidenceExportResult {
  exportId: string;
  status: 'EXPORTED' | 'BLOCKED';
}

export interface EvidenceExportPipeline {
  exportEvidence(request: EvidenceExportRequest): Promise<EvidenceExportResult>;
}

export function createMemoryEvidenceExportPipeline(): EvidenceExportPipeline {
  return {
    async exportEvidence(request) {
      return {
        exportId: request.exportId,
        status: request.category.length > 0 ? 'EXPORTED' : 'BLOCKED',
      };
    },
  };
}
