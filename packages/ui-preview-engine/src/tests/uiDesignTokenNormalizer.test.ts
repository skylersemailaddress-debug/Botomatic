import assert from "assert";
import { normalizeUIDesignTokens } from "../uiDesignTokenNormalizer";

const valid = normalizeUIDesignTokens([
  { tokenId: "hex", name: "Primary Hex", category: "color", value: "#A1B2C3" },
  { tokenId: "rgb", name: "Primary RGB", category: "color", value: "rgb(1, 2, 3)" },
  { tokenId: "hsl", name: "Primary HSL", category: "color", value: "hsl(120 50% 50%)" },
  { tokenId: "sp-px", name: "Spacing PX", category: "spacing", value: "8px" },
  { tokenId: "sp-rem", name: "Spacing REM", category: "spacing", value: "1rem" },
  { tokenId: "sp-em", name: "Spacing EM", category: "spacing", value: "2em" },
  { tokenId: "sp-pct", name: "Spacing PCT", category: "spacing", value: "10%" },
  { tokenId: "sp-zero", name: "Spacing ZERO", category: "spacing", value: "0" },
  { tokenId: "rd-px", name: "Radius PX", category: "radius", value: "4px" },
  { tokenId: "rd-rem", name: "Radius REM", category: "radius", value: "0.5rem" },
  { tokenId: "rd-em", name: "Radius EM", category: "radius", value: "1em" },
  { tokenId: "rd-pct", name: "Radius PCT", category: "radius", value: "50%" },
  { tokenId: "rd-zero", name: "Radius ZERO", category: "radius", value: "0" },
  { tokenId: "z-ok", name: "Layer 10", category: "zIndex", value: "10" },
]);
assert(valid.tokens.every((t) => t.cssVariableName.startsWith("--ui-")));
assert(!valid.issues.some((i) => ["hex", "rgb", "hsl"].includes(i.tokenId)));
assert(!valid.issues.some((i) => i.tokenId.startsWith("sp-")));
assert(!valid.issues.some((i) => i.tokenId.startsWith("rd-")));
assert(!valid.issues.some((i) => i.tokenId === "z-ok"));

const invalid = normalizeUIDesignTokens([
  { tokenId: "dup-1", name: "primary_color", category: "color", value: "#fff" },
  { tokenId: "dup-2", name: "Primary Color", category: "color", value: "url(javascript:1)" },
  { tokenId: "neg-space", name: "Space S", category: "spacing", value: "-4px" },
  { tokenId: "z-bad", name: "Layer bad", category: "zIndex", value: "10000" },
  { tokenId: "shadow-bad", name: "Sh", category: "shadow", value: "expression(alert(1))" },
]);
assert(invalid.issues.some((i) => i.code === "unsafe-value"));
assert(invalid.issues.some((i) => i.code === "duplicate-normalized-name"));
assert(invalid.issues.some((i) => i.code === "negative-spacing"));
assert(invalid.issues.some((i) => i.code === "zindex-out-of-range"));
assert(invalid.requiresManualReview);
console.log("uiDesignTokenNormalizer.test.ts passed");
