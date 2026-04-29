import assert from "assert";
import { normalizeUIDesignTokens } from "../uiDesignTokenNormalizer";
const r = normalizeUIDesignTokens([
  { tokenId:"1", name:" Primary Color ", category:"color", value:"#fff" },
  { tokenId:"2", name:"primary_color", category:"color", value:"url(javascript:1)" },
  { tokenId:"3", name:"Space S", category:"spacing", value:"-4px" },
  { tokenId:"4", name:"Z", category:"zIndex", value:"10000" },
  { tokenId:"5", name:"Sh", category:"shadow", value:"expression(alert(1))" },
  { tokenId:"6", name:"C2", category:"color", value:"hsl(0 0% 0%)" },
]);
assert(r.tokens[0].cssVariableName.startsWith("--ui-"));
assert(r.issues.some(i=>i.message.includes("unsafe") || i.code==="unsafe-value"));
assert(r.issues.some(i=>i.code==="negative-spacing"));
assert(r.issues.some(i=>i.code==="duplicate-normalized-name"));
assert(r.requiresManualReview);
console.log("uiDesignTokenNormalizer.test.ts passed");
