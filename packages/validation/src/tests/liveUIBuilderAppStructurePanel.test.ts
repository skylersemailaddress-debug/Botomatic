import assert from "node:assert/strict";import fs from "node:fs";
const c=fs.readFileSync('apps/control-plane/src/components/live-ui-builder/LiveUIBuilderAppStructurePanel.tsx','utf8');
assert.ok(c.includes('App Structure'));assert.ok(c.includes('Source sync remains guarded and planning-first'));assert.ok(c.includes('Select page'));assert.ok(c.includes('Reuse component'));
const h=fs.readFileSync('apps/control-plane/src/components/vibe/useLiveUIBuilderVibe.ts','utf8');assert.ok(!h.includes('source file writing'));
console.log('ok liveUIBuilderAppStructurePanel');
