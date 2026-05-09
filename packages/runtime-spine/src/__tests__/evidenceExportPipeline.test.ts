import { assert } from 'node:assert/strict';
import { createMemoryEvidenceExportPipeline } from '../evidenceExportPipeline.js';

const pipeline = createMemoryEvidenceExportPipeline();

const exported = await pipeline.exportEvidence({
  exportId: 'export-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  category: 'deployment-evidence',
});

assert.equal(exported.status, 'EXPORTED');

const blocked = await pipeline.exportEvidence({
  exportId: 'export-2',
  traceId: 'trace-2',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  category: '',
});

assert.equal(blocked.status, 'BLOCKED');

console.log('evidenceExportPipeline tests passed');
