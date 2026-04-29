import assert from "assert";
import { analyzeReactSourceFile } from "../uiReactSourceAnalyzer";
const src=`import Link from "next/link"; export const Header=()=>{return (<header>Hi</header>)}; export default function Page(){ return (<main>Hello</main>) }`;
const a=analyzeReactSourceFile("app/page.tsx",src);
assert.ok(a.exports.some((e)=>e.exportKind==="default"));
assert.ok(a.exports.some((e)=>e.exportKind==="named"&&e.exportName==="Header"));
assert.ok(a.isRouteFile);
assert.ok(a.imports.includes("next/link"));
console.log("uiReactSourceAnalyzer tests passed");
