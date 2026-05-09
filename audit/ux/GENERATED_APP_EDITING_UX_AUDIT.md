# Generated App Editing UX Audit

## Status

```text
initial audit
```

## Purpose

Evaluate whether generated-app editing workflows are understandable, trustworthy, and safe for non-technical users.

## Required Editing UX Properties

- conversational edits work predictably
- visual edits map to source changes
- edit history is understandable
- repair actions are visible
- validation state is visible
- preview/source remain synchronized
- unsupported edits fail honestly
- rollback/revert options are understandable

## Required Questions

1. Can users understand what changed?
2. Can users safely undo changes?
3. Can visual edits silently corrupt source?
4. Can chat edits conflict with visual edits?
5. Are failed edits understandable?
6. Are repair attempts visible?
7. Are generated-app limitations explained honestly?
8. Can users distinguish draft vs validated state?

## Initial Risks

### GAE-001 — edit-source divergence risk

Severity:

```text
P1
```

Visual/chat editing systems must converge into one source-of-truth mutation pipeline.

### GAE-002 — hidden repair mutation risk

Severity:

```text
P1
```

Users must understand when Botomatic modifies projects autonomously.

### GAE-003 — draft/readiness confusion risk

Severity:

```text
P1
```

Users may mistake editable preview states for validated release-ready output.

## Desired Direction

```text
conversation
+ visual editing
+ source truth
+ validator governance
+ understandable rollback
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| UX reasoning | GPT-5.5 | Gemini |
| interaction replay | Playwright | GPT-5.5 |
| visual review | Gemini | Playwright screenshots |
| implementation | Codex/Cursor | Claude Opus |
