import fs from "fs";
import path from "path";
import type { RepoValidatorResult } from "../repoValidators";
const read=(r:string,p:string)=>fs.readFileSync(path.join(r,p),"utf8"); const has=(r:string,p:string)=>fs.existsSync(path.join(r,p));
export function validateLiveUIBuilderCoreReadiness(root: string): RepoValidatorResult {
  const checks=["packages/ui-preview-engine/src/uiSelectionState.ts","packages/ui-preview-engine/src/uiTargetResolver.ts","packages/ui-preview-engine/src/livePreviewPatch.ts","packages/ui-preview-engine/src/uiMutationEngine.ts","packages/ui-preview-engine/src/tests/uiSelectionState.test.ts","packages/ui-preview-engine/src/tests/uiTargetResolver.test.ts","packages/ui-preview-engine/src/tests/livePreviewPatch.test.ts","packages/ui-preview-engine/src/tests/uiMutationEngine.test.ts","packages/ui-preview-engine/src/index.ts","package.json","packages/validation/src/repoValidators.ts"];
  if(!checks.every(c=>has(root,c))) return {name:"Validate-Botomatic-LiveUIBuilderCoreReadiness",status:"failed",summary:"Live UI builder core files are missing.",checks};
  const m=read(root,checks[3]); const idx=read(root,checks[8]); const pkg=read(root,checks[9]); const v=read(root,checks[10]);
  const ok=idx.includes("uiSelectionState")&&idx.includes("uiTargetResolver")&&idx.includes("livePreviewPatch")&&idx.includes("uiMutationEngine")&&pkg.includes("test:ui-selection-state")&&pkg.includes("test:ui-target-resolver")&&pkg.includes("test:live-preview-patch")&&pkg.includes("test:ui-mutation-engine")&&m.includes("No source-file sync")&&m.includes("No browser rendering integration")&&m.includes("No full live builder completion claim")&&v.includes("validateLiveUIBuilderCoreReadiness");
  return {name:"Validate-Botomatic-LiveUIBuilderCoreReadiness",status:ok?"passed":"failed",summary:ok?"Live UI selection/target-resolution/mutation-core readiness checks passed.":"Live UI builder core readiness checks failed.",checks};
}
