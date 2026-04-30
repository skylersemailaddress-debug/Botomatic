import fs from "fs";
import path from "path";
import { type RepoValidatorResult } from "../repoValidators";
export function validateLiveUIBuilderExportDeployReadiness(root:string):RepoValidatorResult{
 const files=["packages/ui-preview-engine/src/uiExportDeployModel.ts","packages/ui-preview-engine/src/uiExportBundlePlanner.ts","packages/ui-preview-engine/src/uiDeployTargetPlanner.ts","packages/ui-preview-engine/src/uiExportDeployPlanner.ts","packages/ui-preview-engine/src/tests/uiExportBundlePlanner.test.ts","packages/ui-preview-engine/src/tests/uiDeployTargetPlanner.test.ts","packages/ui-preview-engine/src/tests/uiExportDeployPlanner.test.ts","apps/control-plane/src/components/live-ui-builder/LiveUIBuilderSourceSyncPanel.tsx","packages/validation/src/tests/liveUIBuilderSourceSyncPanel.test.ts","package.json"];
 const okFiles=files.every(f=>fs.existsSync(path.join(root,f))); const read=(f:string)=>fs.readFileSync(path.join(root,f),"utf8");
 const txt=okFiles?files.map(read).join("\n"):"";
 const banned=["child_process","exec(","spawn(","execa","fetch(","axios","XMLHttpRequest","archiver","writeFile","https://"];
 const ok=okFiles && txt.includes("exportDeployPlanId")&&txt.includes("bundleManifestId")&&txt.includes("liveDeployBlocked")&&txt.includes("always be true")||txt.includes("liveDeployBlocked:true")&&txt.includes("invalid env var name")&&txt.includes("raw secret literal rejected")&&txt.includes("node_modules")&&txt.includes(".env")&&txt.includes("vercel")&&txt.includes("netlify")&&txt.includes("unknown provider")&&txt.includes("allowLiveDeploy=true blocked")&&txt.includes("Export/deploy planning is dry-run only")&&txt.includes("test:ui-export-deploy-model")&&txt.includes("test:universal")&&banned.every(t=>!read("packages/ui-preview-engine/src/uiExportDeployPlanner.ts").includes(t));
 return {name:"Validate-Botomatic-LiveUIBuilderExportDeployReadiness",status:ok?"passed":"failed",summary:ok?"Live UI Builder export/deploy readiness checks passed.":"Live UI Builder export/deploy readiness missing or shallow.",checks:files};
}
