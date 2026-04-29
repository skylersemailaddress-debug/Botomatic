import assert from "assert";
import { createUISourceApplyProof, validateUISourceApplyProof } from "../uiSourceApplyProof";

const tx:any = { id:"abc", beforeSnapshot:[{filePath:"a",existedBefore:true}], mode:"confirmedApply" };
const apply:any = { changedFiles:["a"], writesPerformed:1, blockedReasons:[] };
const proof = createUISourceApplyProof(tx, apply, { ok:true, rollbackRestoredFiles:["a"], rollbackDeletedFiles:[], blockedReasons:[] });
assert.equal(proof.rollbackAvailable, true);
assert.equal(validateUISourceApplyProof(proof).valid, true);
assert.equal(validateUISourceApplyProof({ ...proof, rollbackAvailable:false }).valid, false);
console.log("uiSourceApplyProof tests passed");
