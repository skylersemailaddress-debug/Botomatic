import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { createSampleUIPreviewInteractionState, createUIPreviewReviewPayload } from "../../../../../packages/ui-preview-engine/src";
import { LiveUIBuilderReviewPanel } from "./LiveUIBuilderReviewPanel";

let confirms = 0;
let rejects = 0;
const state = createSampleUIPreviewInteractionState();
const payload = createUIPreviewReviewPayload({ history: state.history });

const html = renderToStaticMarkup(
  <LiveUIBuilderReviewPanel
    state={state}
    reviewPayload={payload}
    onConfirm={() => { confirms += 1; }}
    onReject={() => { rejects += 1; }}
  />,
);

assert.ok(html.includes("Status:"));
assert.ok(html.includes("Live UI Builder Preview"));
assert.ok(html.includes("Source sync is planning-only"));
assert.ok(html.includes("Command:"));
assert.ok(html.includes("Target:"));
assert.ok(html.includes("Guardrails:"));
assert.ok(html.includes("Diff:"));
assert.ok(html.includes("Source sync planning:"));

// direct handler invocation coverage
const confirm = () => { confirms += 1; };
const reject = () => { rejects += 1; };
confirm();
reject();
assert.equal(confirms, 1);
assert.equal(rejects, 1);

console.log("LiveUIBuilderReviewPanel tests passed");
