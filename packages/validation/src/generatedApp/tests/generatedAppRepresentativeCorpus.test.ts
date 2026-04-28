import assert from "assert";
import fs from "fs";
import path from "path";

import {
  evaluateGeneratedAppCorpus,
  loadGeneratedAppCorpusManifest,
} from "../corpusHarness";

const manifestPath = path.resolve(process.cwd(), "fixtures/generated-app-corpus/representative/manifest.json");
const manifestRoot = path.dirname(manifestPath);

const requiredRepresentativeIds = [
  "webSaasDashboard",
  "bookingApp",
  "ecommerceStore",
  "marketplace",
  "customerPortal",
  "apiService",
  "botAgentConsole",
  "mobileAppShell",
  "gameLandingPage",
];

const manifest = loadGeneratedAppCorpusManifest(manifestPath);
assert.equal(manifest.corpusName, "generated-app-representative-corpus");
assert.ok(manifest.cases.length >= requiredRepresentativeIds.length + 1);

const ids = new Set(manifest.cases.map((entry) => entry.id));
requiredRepresentativeIds.forEach((id) => {
  assert.ok(ids.has(id), `Required representative fixture id is missing: ${id}`);
});
assert.ok(ids.has("negativePlaceholderBlocked"), "Missing required controlled negative fixture id.");

manifest.cases.forEach((entry) => {
  const appPath = path.resolve(manifestRoot, entry.appPath);
  assert.ok(fs.existsSync(appPath), `Fixture path does not exist for ${entry.id}: ${appPath}`);
});

const harness = evaluateGeneratedAppCorpus(manifestPath);
assert.equal(harness.status, "passed");
assert.equal(harness.caseResults.length, manifest.cases.length);

for (const result of harness.caseResults) {
  const source = manifest.cases.find((entry) => entry.id === result.id);
  assert.ok(source, `Case result missing source manifest case: ${result.id}`);

  if (source?.expectedReadinessStatus) {
    assert.equal(result.readinessStatus, source.expectedReadinessStatus, `Readiness mismatch for ${result.id}`);
  }

  const packet = harness.launchPackets.find((entry) => entry.caseId === result.id);
  assert.ok(packet, `Missing launch packet for ${result.id}`);
  assert.ok(packet?.claimBoundary.toLowerCase().includes("launch-ready"));
  assert.ok(packet?.evidenceBoundary.toLowerCase().includes("static corpus-only validator output"));

  assert.notEqual(result.readinessStatus, "launch_ready" as never);
  assert.notEqual(result.readinessStatus, "production_ready" as never);

  const readmePath = path.join(result.resolvedAppPath, "README.md");
  const readme = fs.readFileSync(readmePath, "utf8").toLowerCase();
  [
    "not launch-ready",
    "not production-ready",
    "static corpus fixture only",
    "no live deployment proof",
    "runtime validation and deployment smoke are required before any public readiness claims",
    "legal claim boundary",
  ].forEach((fragment) => {
    assert.ok(readme.includes(fragment), `README boundary fragment missing for ${result.id}: ${fragment}`);
  });
}

const negative = harness.caseResults.find((result) => result.id === "negativePlaceholderBlocked");
assert.ok(negative, "Missing controlled negative case result.");
assert.equal(negative?.readinessStatus, "blocked");
assert.ok(negative?.appPath.startsWith("negative/"), "Negative case is not isolated under negative/.");

const positives = harness.caseResults.filter((result) => result.id !== "negativePlaceholderBlocked");
for (const result of positives) {
  const severeFindings = result.noPlaceholderSummary.findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high"
  );
  assert.equal(severeFindings.length, 0, `Positive fixture has critical/high placeholder findings: ${result.id}`);
}

assert.ok(
  harness.launchPackets.every((packet) =>
    packet.claimBoundary.toLowerCase().includes("not launch-ready") ||
    packet.claimBoundary.toLowerCase().includes("never interpret")
  ),
  "Launch packet claim boundaries are missing non-claim language."
);

const summaryText = JSON.stringify(
  {
    status: harness.status,
    findings: harness.findings,
    caveats: harness.launchPackets.flatMap((packet) => packet.caveats),
  },
  null,
  2
).toLowerCase();
assert.ok(summaryText.includes("static"));
assert.ok(summaryText.includes("not live deployment proof"));
assert.ok(!summaryText.includes('"launch_ready"'));
assert.ok(!summaryText.includes('"production_ready"'));

console.log("generatedAppRepresentativeCorpus.test.ts passed");
