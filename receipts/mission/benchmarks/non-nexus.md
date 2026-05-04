# Non-Nexus Benchmark Receipt

## Benchmarks: Generic Enterprise Specs

These benchmarks validate that the system works on specs unrelated to Nexus.

## Fixtures

### Enterprise SaaS HR Platform
- Source: `packages/mission-orchestrator/src/fixtures/enterprise-saas.ts`
- Type: Full-stack app (HR management, payroll, PTO tracking)
- Architecture: `full_stack_app`

### Vendor Marketplace
- Source: `packages/mission-orchestrator/src/fixtures/marketplace.ts`
- Type: Multi-service system (vendor discovery, bidding, contracting)
- Architecture: `multi_service_system`

## Validation Goals

1. `detectTargetArchitecture()` correctly classifies each spec
2. `detectProductType()` returns non-null for each spec
3. `compileSpecToMission()` produces valid wave structures for both
4. Wave names and descriptions contain no Nexus-specific branding
5. Claim boundary checks reach at least `MISSION_COMPILED`

## Usage

```bash
# Compile the enterprise-saas fixture
node scripts/mission/compile-generic-mission.mjs --fixture enterprise-saas

# Compile the marketplace fixture  
node scripts/mission/compile-generic-mission.mjs --fixture marketplace
```

## Status

Fixture specs defined. Unit tests in `packages/mission-orchestrator/src/tests/genericMission.test.ts` cover all three fixtures.
