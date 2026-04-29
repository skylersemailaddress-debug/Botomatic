# AUDIT-UIBUILDER-001 — Live UI Builder Behavioral Gap Baseline

## A. Executive verdict

**Verdict: live UI builder behavior is partially implemented.**

Reasoning baseline:
- The repository includes **structured planning artifacts** for UI shape (blueprints + preview manifests) and route-level UI surfaces for Vibe/Advanced views.
- Current UI editing behavior is still predominantly **static/presentational** with explicit "static preview" / "not implemented" signals in builder shell code, and no end-to-end runtime proof that natural-language/voice edits mutate a real editable UI model with source sync.
- Therefore, the core requirement exists in framing and partial data modeling, but **the required live editing behavioral system is not complete**.

## B. Evidence inventory

| Path | Current role | Type | Extend or leave alone |
|---|---|---|---|
| `MASTER_TRUTH_SPEC.md` | Canonical truth defining live visual UI builder requirements, shared typed/spoken pipeline, real-time preview mutation, source sync, undo/redo, diff, safe-fail, and guardrails. | Behavioral spec | **Extend only via future truth-aligned deltas**; keep canonical authority. |
| `apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx` | Route wiring that renders `VibeDashboard`. | Runtime route wiring | **Extend** later when live builder container replaces dashboard-only surface. |
| `apps/control-plane/src/app/projects/[projectId]/advanced/page.tsx` | Route wiring that renders `ProDashboard`. | Runtime route wiring | **Extend** later for inspect/diff/proof tooling integration. |
| `apps/control-plane/src/components/vibe/VibeDashboard.tsx` | Rich static dashboard UI; includes “edit anything” copy and hotel preview content, but no mutation engine binding. | Static/presentational | **Extend** as visual shell only; avoid embedding core edit engine logic directly. |
| `apps/control-plane/src/components/pro/ProDashboard.tsx` | Static/seeded Pro cockpit with code/live panels but no live UI command mutation path. | Static/presentational | **Extend** for observability UX; keep engine/domain logic external. |
| `apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx` | Chat-first shell and source badges; explicitly labels many sections as `static-preview`/`not-implemented`; includes voice button messaging that voice shares chat path conceptually. | Static/presentational + policy signaling | **Extend** as shell; preserve truthful status badges; attach real command pipeline adapters later. |
| `packages/ui-blueprint-registry/src/index.ts` | Defines typed blueprint/page/component structures with a11y/responsive/no-placeholder requirement lists; registry validation exists. | Structured model template registry | **Extend**; reuse as seed schema source for editable document model bootstrap. |
| `packages/ui-preview-engine/src/index.ts` | Builds deterministic preview manifest from blueprint/spec; returns planning metadata (pages/componentTree/theme/integration slots) and explicit non-production caveat. | Structured model/planning transform | **Extend** by introducing editable runtime document + mutation APIs alongside (not replacing) manifest planning APIs. |
| `packages/ui-preview-engine/src/tests/uiPreviewEngine.test.ts` | Verifies deterministic manifest generation, inference, and manifest validation constraints. | Behavioral test (planning layer) | **Extend** with mutation/command-path tests in new suites; keep existing planning tests intact. |
| `packages/validation/src/tests/uiRouteRegression.test.ts` | Verifies Vibe/Pro route signals and explicitly checks chat-first/static-preview wording; no runtime UI edit E2E behavior checks. | Behavioral regression test (route copy/layout signals) | **Extend** with separate live-builder behavior suite (do not overload this smoke test). |
| `packages/validation/src/repoValidators/generatedAppNoPlaceholderValidatorReadiness.ts` (+ generated-app validator stack) | Repo-readiness checks for no-placeholder validator module existence and wiring; currently repo-level readiness, not live editor safe-fail adjudication. | Validator/readiness audit | **Leave core behavior**; add targeted live-ui validator/readiness modules rather than repurposing this one. |
| `package.json` | Defines build/test/validate orchestration; includes `test:ui-routes`, `test:ui-blueprints`, `test:ui-preview-engine`, and `test:universal`. | Tooling orchestration | **Extend** by adding new live-ui command/mutation/source-sync/e2e proof scripts in future PRs. |

## C. Capability baseline matrix

| Capability | Status | Evidence | Blocker | Needed implementation module | Needed test/proof | Severity | Recommended ticket |
|---|---|---|---|---|---|---|---|
| editable UI document model | partial | Blueprint + preview manifest types exist, but immutable planning artifacts only. | No canonical editable runtime AST/document contract. | `packages/ui-preview-engine` (new `uiDocumentModel.ts`) + shared contract package if needed. | Unit: create/load/serialize model; deterministic IDs. | P0 | LIVEUI-001 |
| element identity system | partial | Blueprint component IDs exist; no runtime stable node identity lifecycle. | No identity contract across edit/move/source sync. | `packages/ui-preview-engine` identity module (`nodeId`, `semanticLabel`, provenance). | Unit + property tests for identity stability after mutations. | P0 | LIVEUI-001 |
| page tree | partial | `UIBlueprint.pages` + manifest pages exist. | No mutable tree operations. | Mutation engine tree primitives. | Unit operations add/remove/reorder page. | P1 | LIVEUI-004 |
| component tree | partial | Manifest `componentTree` exists. | No live tree mutation/runtime patch application. | Mutation engine component operations. | Unit operations add/remove/move/duplicate/replace. | P0 | LIVEUI-004 |
| selection/inspect mode | missing | No inspect state machine found in current routes/components. | No selected-target runtime state + inspect UI contract. | Control-plane selection store + inspect adapters. | Component/integration tests for select/inspect intent mapping. | P1 | LIVEUI-003 |
| natural-language UI edit parser | missing | No parser module for live UI edit classes detected. | Command NLP layer absent for UI edits. | New command parser package/module. | Parser acceptance suite with required edit classes. | P0 | LIVEUI-002 |
| natural reference resolver | missing | No resolver for “this/that card/hero/booking form.” | Requires selection context + semantic labels + disambiguation rules. | Target resolver module linked to selection and AST. | Resolver tests with ambiguity/safe-fail branches. | P0 | LIVEUI-003 |
| edit command schema | missing | No typed edit-command schema in audited modules. | No unified contract between parser and mutation engine. | `UiEditCommand` schema/types + validators. | Schema validation tests incl malformed payloads. | P0 | LIVEUI-002 |
| add/remove/move/resize/duplicate/replace | missing | None observed beyond static UI markup. | Mutation op library absent. | Mutation engine operation set. | Operation-level tests + invariant checks. | P0 | LIVEUI-004 |
| rewrite/restyle/retheme | partial | Theme tokens generated in manifest planning; no live mutation path. | No style/text mutation runtime pipeline. | Style/text mutation operators + token applicator. | Mutation tests + preview patch tests. | P1 | LIVEUI-004 |
| page add/remove | missing | No runtime page mutation path. | No editable document/page ops. | Page mutation ops. | Unit/integration page lifecycle tests. | P1 | LIVEUI-004 |
| layout/responsive edits | partial | Blueprint/manifest contain responsive requirements as static notes. | No responsive edit command handling. | Layout/responsive command handlers + guardrails. | Responsive behavior proof suite. | P1 | LIVEUI-007 |
| data/action/form binding edits | missing | No binding edit APIs in audited UI modules. | Binding model + mutation semantics absent. | Binding mutation module + schema links. | Integration tests with form/action/data bindings. | P0 | LIVEUI-004 |
| real-time preview mutation | missing | Current preview surfaces are static markup; no mutation subscription pipeline. | No state-to-render patch applier. | Preview patch applier + reactive store. | Runtime integration tests for live updates. | P0 | LIVEUI-004 |
| source-file sync | missing | Spec requires it; code currently includes preview caveat and no sync engine. | No AST-to-source projection contract. | Source sync engine + mapping layer. | Contract tests + filesystem projection proof. | P0 | LIVEUI-005 |
| patch history | missing | No edit patch ledger for UI mutations. | No mutation journaling layer. | History store + patch records. | Unit tests for append/replay determinism. | P1 | LIVEUI-006 |
| undo/redo | missing | Not present in audited modules. | Depends on history model and reversible commands. | Undo/redo controller on patch history. | Integration tests for multi-step undo/redo correctness. | P1 | LIVEUI-006 |
| diff preview | missing | No visual/structural diff module for edits. | Requires before/after snapshots + renderer integration. | Diff engine + preview UI adapters. | Snapshot/diff rendering tests. | P1 | LIVEUI-006 |
| invalid edit safe-fail | missing | No runtime edit failure policy observed for UI edits. | Requires schema validation + resolver ambiguity handling + guardrails. | Error taxonomy + safe-fail executor wrapper. | Negative tests for invalid/ambiguous edits. | P0 | LIVEUI-007 |
| accessibility guardrails | partial | Blueprint/manifest include requirements/notes only. | Not enforced during edit mutations. | A11y guardrail validator in mutation pipeline. | Guardrail tests rejecting regressions. | P0 | LIVEUI-007 |
| responsive guardrails | partial | Responsive notes exist as static metadata. | No mutation-time responsive invariant checks. | Responsive invariant validator. | Guardrail tests for breakpoints/layout preservation. | P1 | LIVEUI-007 |
| no-placeholder/fake-path guardrails | partial | Registry rules and validators exist at readiness/repo level. | Not integrated into live edit mutation accept/reject path. | Live edit no-placeholder gate bridging existing validators. | Behavior tests on forbidden placeholder insertions. | P0 | LIVEUI-007 |
| voice-as-chat input for UI edits | partial | Shell copy asserts voice maps to chat path; no proven shared edit parser path. | No executable shared typed/spoken UI command adapter proof. | Input normalization adapter into single command bus. | E2E parity tests typed vs spoken same command outcome. | P1 | LIVEUI-008 |
| visual regression proof | missing | No dedicated live builder behavioral proof suite found. | Requires final integrated architecture and fixtures. | E2E harness + regression fixtures. | `LIVEUI-PROOF-001` full suite. | P0 | LIVEUI-PROOF-001 |

## D. Proposed architecture

1. **UI document model / AST**
   - Introduce canonical editable document contract (pages, component nodes, props/styles/layout/data bindings/actions/forms).
   - Keep blueprint registry as seed templates; instantiate into mutable document with stable versioning.

2. **Element identity + semantic labels**
   - Every node gets stable `nodeId`, semantic role, optional user-facing labels, and provenance metadata.
   - Maintain identity stability across move/resize/restyle to preserve command targeting and source sync.

3. **Command parser**
   - Define typed `UiEditCommand` schema for all required edit classes.
   - Parser transforms typed/spoken chat utterances into schema-validated commands + confidence metadata.

4. **Target resolver**
   - Resolve references using (a) explicit node IDs, (b) active selection context, (c) semantic label matching, (d) ambiguity safe-fail flow.

5. **Mutation engine**
   - Pure deterministic mutation ops over UI AST with invariant checks.
   - Produce structured patch set + before/after snapshots.

6. **Preview renderer / patch applier**
   - Apply patches to reactive preview store for real-time UI updates.
   - Keep latency budgeted and deterministic for replay.

7. **Source sync engine**
   - Map UI AST deltas to source file edits using explicit projection contract.
   - Block export/launch claims until source sync status is confirmed.

8. **History/diff engine**
   - Append-only patch journal; reversible operations for undo/redo.
   - Diff preview for user approval before high-impact edits.

9. **Validation guardrails**
   - Inline gates for a11y, responsiveness, and no-placeholder/fake-path constraints before patch commit.
   - Reuse existing validator intent by adaptation, not duplication.

10. **Chat/voice input path**
    - Typed chat and speech-to-text both feed same command bus and parser.
    - Persist normalized command envelope with source metadata (`typed`/`spoken`) for parity auditing.

11. **Test harness**
    - Layered tests: schema/parser, resolver, mutation, source-sync, guardrails, typed-vs-spoken parity, and full E2E behavioral proof.

## E. Build order (dependency sequence)

1. **LIVEUI-001: add editable UI document model and element identity contract**
2. **LIVEUI-002: add UI edit command schema and parser**
3. **LIVEUI-003: add selection/inspect mode and target resolver**
4. **LIVEUI-004: add preview mutation engine**
5. **LIVEUI-005: add source-file sync contract**
6. **LIVEUI-006: add undo/redo and diff preview**
7. **LIVEUI-007: add responsive/a11y/no-placeholder edit guardrails**
8. **LIVEUI-008: add voice-as-chat input proof for UI edits**
9. **LIVEUI-PROOF-001: add end-to-end live UI builder behavioral suite**

## F. Do-not-duplicate list (extend these systems)

- `packages/ui-blueprint-registry` blueprint/page/component and safety metadata contracts.
- `packages/ui-preview-engine` manifest generation and validation pipeline.
- `apps/control-plane/src/components/builder/NorthStarBuilderShell.tsx` shell/status signaling and chat/voice framing.
- `apps/control-plane/src/app/projects/[projectId]/vibe/page.tsx` and `advanced/page.tsx` route topology.
- `packages/validation` existing no-placeholder/readiness/route regression validator infrastructure.
- `package.json` command/test orchestration entrypoints.

## G. Smallest next implementation PR

**Title:** `LIVEUI-001: add editable UI document model and element identity contract`

**Acceptance criteria:**
1. Introduce a typed, serializable editable UI document contract with pages + component tree + style/layout/binding fields.
2. Add stable node identity contract and invariants (identity survives non-destructive edits/moves).
3. Provide deterministic factory to instantiate editable document from existing blueprint registry entries.
4. Add document validation helpers for structural integrity and required metadata.
5. Add unit tests covering create/serialize/validate/identity-stability behaviors.
6. Add explicit non-claim caveat in docs/tests clarifying this PR does not yet provide live command parsing, source sync, or E2E proof.
