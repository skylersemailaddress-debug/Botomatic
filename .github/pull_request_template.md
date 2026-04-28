# Pull Request Template

## Linked Issue
- Issue: <!-- Required. Example: OPS-001 -->

## Scope
- <!-- Required. Describe exactly what this PR changes. -->

## Non-Goals
- <!-- Required. Describe what this PR intentionally does not change. -->

## Files Changed
- <!-- Required. List key files changed and why. -->

## Validation Commands
- <!-- Required. List exact commands run and pass/fail outcome. -->

## Runtime Route Checks (when applicable)
- [ ] Not applicable (no runtime route changes)
- [ ] Routes exercised and verified in runtime environment
- Evidence / notes:

## UI Screenshot Proof (when applicable)
- [ ] Not applicable (no user-visible UI changes)
- [ ] Before/after screenshots attached and route-accurate
- Evidence / notes:

## Generated-App Proof (when applicable)
- [ ] Not applicable (no generated-app impact)
- [ ] Generated output validated with current validators
- Evidence / notes:

## Claim-Boundary Checklist
- [ ] Claims are bounded to verified behavior only
- [ ] No launch/commercial-readiness claim expansion without evidence
- [ ] Documentation and PR text avoid unsupported claims

## Safety / Policy Checklist
- [ ] No validator weakening in this PR
- [ ] No placeholder production paths introduced
- [ ] No hidden scope expansion beyond linked issue
