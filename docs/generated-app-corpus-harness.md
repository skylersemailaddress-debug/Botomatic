# Generated App Corpus Harness (GEN-005)

## Purpose

The generated app corpus harness evaluates **test fixture directories** representing generated app outputs and emits evidence-bound readiness packets.

This is a **harness/schema** capability only. It does not claim launch readiness, does not run live deployment, and does not act as runtime proof.

## Module and APIs

Module: `packages/validation/src/generatedApp/corpusHarness.ts`

APIs:

- `loadGeneratedAppCorpusManifest(manifestPath: string): GeneratedAppCorpusManifest`
- `evaluateGeneratedAppCorpusCase(root: string, testCase: GeneratedAppCorpusCase): GeneratedAppCorpusCaseResult`
- `evaluateGeneratedAppCorpus(manifestPath: string): GeneratedAppCorpusHarnessResult`
- `createGeneratedAppLaunchPacket(caseResult: GeneratedAppCorpusCaseResult): GeneratedAppLaunchPacket`
- `validateGeneratedAppCorpusManifest(manifest: GeneratedAppCorpusManifest): string[]`

## Manifest schema

`GeneratedAppCorpusManifest`

- `manifestVersion: string`
- `corpusName: string`
- `cases: GeneratedAppCorpusCase[]`

`GeneratedAppCorpusCase`

- `id: string`
- `displayName: string`
- `domain: string`
- `appPath: string` (resolved relative to the manifest directory)
- `expectedBlueprintId?: string`
- `expectedReadinessStatus?: "blocked" | "preview_ready" | "candidate_ready"`
- `requiredChecks: string[]`
- `notes: string`

## Launch packet schema

`GeneratedAppLaunchPacket`

- `packetVersion`
- `generatedAt`
- `caseId`
- `appPath`
- `readinessStatus`
- `noPlaceholderSummary`
- `commercialReadinessSummary`
- `scannedFiles`
- `gates`
- `findings`
- `caveats`
- `recommendedNextActions`
- `evidenceBoundary`
- `claimBoundary`

## GEN-003 and GEN-004 integration

The harness composes:

- GEN-003: `validateGeneratedAppNoPlaceholders`
- GEN-004: `validateGeneratedAppCommercialReadiness`

Per case, the harness:

1. Resolves fixture path from manifest root.
2. Runs no-placeholder scan.
3. Runs commercial readiness gate evaluation.
4. Emits readiness status constrained to `blocked | preview_ready | candidate_ready`.
5. Generates an evidence-bound launch packet.

## Boundaries and non-claims

The harness enforces explicit boundaries:

- corpus/static readiness output only
- not live deployment proof
- not runtime execution proof unless future evidence exists
- legal/commercial validators must pass separately before public claims

`candidate_ready` is **not** `launch_ready` and never upgrades to production claim status.

## Test fixtures are not product proof

Fixtures under:

`packages/validation/src/generatedApp/tests/fixtures/generated-app-corpus/`

are intentionally tiny internal test fixtures used to verify harness behavior:

- clean candidate fixture
- placeholder blocked fixture
- preview-ready fixture

They are test-only artifacts and not representative commercial proof corpus.

## GEN-006 follow-through

GEN-006 now adds a broader representative fixture corpus under `fixtures/generated-app-corpus/representative/` and validates it via `test:generated-app-representative-corpus`, while preserving evidence boundaries and non-claim protections.
