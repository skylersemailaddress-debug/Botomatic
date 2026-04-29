import assert from "assert";
import { createNextRouteTemplate } from "../uiRouteTemplate";
const a=createNextRouteTemplate("page.tsx","Demo");
const b=createNextRouteTemplate("page.tsx","Demo");
assert.strictEqual(a,b);
assert.ok(a.includes("export default function DemoPage"));
console.log("uiRouteTemplate tests passed");
