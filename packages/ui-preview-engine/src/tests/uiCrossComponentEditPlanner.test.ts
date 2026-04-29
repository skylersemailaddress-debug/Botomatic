import assert from "assert";
import { planUICrossComponentEdits } from "../uiCrossComponentEditPlanner";
const mapping:any={targets:[{filePath:"src/Parent.tsx"}]};
const identity:any={identities:[{sourceFilePath:"src/Parent.tsx",identityId:"i",confidence:"high"}]};
const intent:any={rootIntent:"edit",sharedComponentFiles:["src/Child.tsx"],routeFile:"app/page.tsx",styleFile:"src/app.css"};
const sourceFiles:any={
  "app/page.tsx":"import Parent from '../src/Parent'; export default function Page(){ return <Parent />; }",
  "src/Parent.tsx":"import Child from './Child'; import './app.css'; export default function Parent(){ return <Child />; }",
  "src/Child.tsx":"export default function Child(){ return <div/>; }",
  "src/app.css":".x{}"
};
const r=planUICrossComponentEdits({},mapping,identity,intent,sourceFiles);
assert.ok(r.plan.dependencies.find((d)=>d.relation==="route-imports-component"&&d.fromFile==="app/page.tsx"&&d.toFile==="src/Parent.tsx"));
assert.ok(r.plan.dependencies.find((d)=>d.relation==="component-imports-child"&&d.toFile==="src/Child.tsx"));
assert.ok(r.plan.dependencies.find((d)=>d.relation==="component-imports-style"&&d.toFile==="src/app.css"));
assert.deepStrictEqual(r.plan.operations.map(o=>o.operationOrder),[1,2,3,4]);
const unresolved=planUICrossComponentEdits({},mapping,identity,intent,{...sourceFiles,"src/Parent.tsx":"import Missing from './Missing'; export default function Parent(){ return <Missing/>; }"});
assert.strictEqual(unresolved.plan.requiresManualReview,true);
assert.ok(unresolved.plan.blockedReasons.some((r)=>r.includes("unresolved")));

const shallowIntentOnly=planUICrossComponentEdits({},mapping,identity,{...intent,sharedComponentFiles:["src/Unimported.tsx"]},{...sourceFiles,"src/Unimported.tsx":"export default function U(){return null;}"});
assert.strictEqual(shallowIntentOnly.plan.requiresManualReview,true);
assert.ok(shallowIntentOnly.plan.blockedReasons.some((r)=>r.includes("unresolved dependency import")));
const missId=planUICrossComponentEdits({},mapping,undefined,intent,sourceFiles); assert.strictEqual(missId.plan.requiresManualReview,true);
const circ=planUICrossComponentEdits({},mapping,identity,{...intent,circularDependency:true},sourceFiles); assert.strictEqual(circ.plan.riskLevel,"high");
const gt5=planUICrossComponentEdits({},mapping,identity,{...intent,sharedComponentFiles:["a","b","c","d","e"]},{...sourceFiles,a:"",b:"",c:"",d:"",e:"",}); assert.strictEqual(gt5.plan.riskLevel,"high");
console.log("uiCrossComponentEditPlanner.test.ts passed");
