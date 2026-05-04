# Nexus Benchmark Receipt

## Benchmark: Nexus (Golden Standard)

Nexus is the golden benchmark fixture for the generic mission system. It serves as validation that the system can handle a complex enterprise intelligence platform.

## Spec Source

`packages/mission-orchestrator/src/fixtures/nexus.ts` — `NEXUS_BENCHMARK_SPEC`

## Purpose

- Validate that the generic system can compile a known-good spec
- Verify wave planning produces expected structure
- Confirm claim boundary levels are reachable
- Serve as regression baseline — generic changes must not break Nexus compilation

## Usage

```bash
# Compile Nexus as a generic mission (uses enterprise-saas fixture by default)
npm run test:mission:benchmark:nexus:compile

# Run wave 1 in dry-run mode
npm run test:mission:benchmark:nexus:wave1

# Generate report
npm run test:mission:benchmark:nexus:report
```

## Status

Benchmark fixture defined. Runtime execution pending API server.
