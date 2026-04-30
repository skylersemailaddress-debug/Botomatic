import assert from "assert";
import { planUIScalabilityChunks } from "../uiScalabilityChunkPlanner";
const result = planUIScalabilityChunks({ orderedFiles: ["a","b","c","d"], operationCount: 4, maxChunkSize: 2 });
assert.equal(result.chunkCount, 2);
assert(result.chunks.every((c) => c.operationBudget === 2));
console.log("uiScalabilityChunkPlanner tests passed");
