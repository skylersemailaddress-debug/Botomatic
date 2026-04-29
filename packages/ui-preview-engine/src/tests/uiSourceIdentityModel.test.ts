import assert from "assert";
import { UI_SOURCE_IDENTITY_CLAIM_BOUNDARY, type UISourceIdentity } from "../uiSourceIdentityModel";

const identity: UISourceIdentity = {
  identityId: "id-1",
  sourceFilePath: "app/page.tsx",
  propSignatureHash: "p",
  textSignatureHash: "t",
  childShapeHash: "c",
  confidence: "high",
  issues: [],
  claimBoundary: UI_SOURCE_IDENTITY_CLAIM_BOUNDARY
};

assert(identity.claimBoundary.includes("best-effort"));
assert(identity.confidence === "high");
console.log("uiSourceIdentityModel.test.ts passed");
