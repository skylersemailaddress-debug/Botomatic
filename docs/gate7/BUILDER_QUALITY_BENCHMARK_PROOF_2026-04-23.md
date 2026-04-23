# Builder Quality Benchmark Proof - 2026-04-23

Status: Phase 4 benchmark evidence added
Scope: compiler + planner output quality benchmark
Proof grade: local_static

## Evidence files

- release-evidence/benchmarks/builder_quality_cases.json
- release-evidence/runtime/builder_quality_benchmark.json

## Method

- Run compileConversationToMasterTruth for each benchmark case.
- Run generatePlan for each compiled case.
- Score dimensions:
  - appStructure
  - authShell
  - dataModel
  - workflowCompleteness
  - validationBuildPath
  - codeQualitySignals

## Command

```bash
npm run benchmark:builder
```

## Result snapshot

See release-evidence/runtime/builder_quality_benchmark.json for exact case scores and aggregate.

Current aggregate score: 6.0/10 (target: 8.5/10).
Primary deficits:
- role-model depth
- data-model depth
- workflow depth
- support level remains bounded_prototype

## Notes

- This introduces repeatable measured output quality evidence.
- Proof is local/static and not sufficient alone for production-grade 10/10 claim.
