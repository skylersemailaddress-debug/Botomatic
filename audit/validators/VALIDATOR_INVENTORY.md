# Validator Inventory

## Status

```text
initial inventory scaffold
```

## Purpose

Inventory every validator, proof gate, deployment gate, runtime gate, and claim gate involved in Botomatic.

## Required Validator Classes

| Class | Purpose |
|---|---|
| syntax validators | ensure parsable output |
| type validators | ensure compile correctness |
| runtime validators | ensure app boots/runs |
| UX validators | ensure flows are usable |
| accessibility validators | ensure minimum accessibility standards |
| deployment validators | ensure deployability |
| commercial validators | ensure launch-grade behavior |
| proof validators | ensure evidence integrity |
| repair-loop validators | ensure repairs do not regress |
| security validators | ensure baseline safety |
| tenant-isolation validators | ensure isolation boundaries |
| generated-app validators | ensure generated outputs are independently viable |

## Required Inventory Fields

| Field | Meaning |
|---|---|
| validator name | unique validator identifier |
| owner package | responsible package/module |
| execution phase | when validator executes |
| evidence produced | artifacts/logs/screenshots/etc |
| negative-path coverage | whether broken cases are tested |
| false-pass risk | probability validator can incorrectly pass |
| blocking level | warn/block/release-block |
| repair-loop integration | whether repairs re-trigger validator |

## Required Questions

1. Which validators are authoritative?
2. Which validators are advisory only?
3. Which validators can falsely pass?
4. Which validators are duplicated?
5. Which validators are bypassable?
6. Which validators lack negative-path tests?
7. Which validators are coupled to unrelated runtime systems?

## Expected High-Risk Areas

```text
packages/validation
repair loops
proof aggregation
commercial launch validators
runtime/deployment validators
```

## Required Phase 3 Outputs

```text
validator inventory
claim gate audit
false-pass analysis
negative-path coverage analysis
validator ownership map
repair-loop trust audit
```

## Tool / Model Ownership

| Work | Primary | Secondary |
|---|---|---|
| validator reasoning | GPT-5.5 | Claude Opus |
| mutation testing | StrykerJS | Vitest |
| runtime validation | Playwright/Vitest | Codex/Cursor |
| implementation | Codex/Cursor | Claude Opus |
