# EVIDENCE_BOUNDARY_POLICY

This policy maps claim types to minimum evidence classes and defines conflict-resolution rules.

## Evidence classes

1. **documentation claim**
   - Evidence source: policy/spec/docs text only.
   - Use: descriptive intent/process language, never readiness/performance guarantees.

2. **validator-proven**
   - Evidence source: passing validators for the targeted claim scope.
   - Use: gate/readiness assertions bounded to validator coverage.

3. **runtime-proven**
   - Evidence source: executable runtime command/path evidence.
   - Use: local/runtime behavior claims for covered scenarios.

4. **generated-output-proven**
   - Evidence source: generated artifacts plus validation outcomes.
   - Use: generated output quality claims for covered domains.

5. **deployment-dry-run-proven**
   - Evidence source: deployment planning/contracts/checklists/smoke-test and rollback plans without live provider execution.
   - Use: deployment readiness claims only.

6. **credentialed-deployment-ready**
   - Evidence source: approved credential-binding and preflight readiness pathways.
   - Use: "ready to attempt live deployment with approval + credentials" claims.

7. **live-deployment-proven**
   - Evidence source: actual provider deployment using real credentials and provider-specific smoke tests.
   - Use: production deployment claims for that provider/path/environment only.

8. **exhaustive-domain-proven**
   - Evidence source: complete declared-domain/permutation proof corpus.
   - Use: exhaustive or universal claims.

## Minimum evidence required per claim type

| Claim type | Minimum evidence class |
| --- | --- |
| Internal implementation/status note | documentation claim |
| Validator-gated readiness statement | validator-proven |
| Runtime behavior statement | runtime-proven |
| Generated-output quality statement | generated-output-proven |
| Deployment readiness statement | deployment-dry-run-proven |
| Credentialed readiness to attempt live deployment | credentialed-deployment-ready |
| Live deployment success statement | live-deployment-proven |
| Universal/exhaustive claim language ("all", "every", "universal") | exhaustive-domain-proven |

## Governing rules

1. **Current code + current validator output supersede stale docs.**
   - If docs and executable truth conflict, executable truth controls claim eligibility.

2. **Representative evidence cannot be marketed as exhaustive.**
   - Representative evidence authorizes representative wording only.

3. **Any failed critical validator blocks launch-ready claims.**
   - Launch-ready language is disallowed until critical validators are passing again.

4. **No placeholder/fake integration path may support a commercial claim.**
   - Commercial claims require real, non-placeholder integration pathways appropriate to the claim tier.
