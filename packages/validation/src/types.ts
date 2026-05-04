export type ValidationStatus = "pending" | "running" | "passed" | "failed";

// N85 — Six-rung proof ladder
// 0 Claim:        unverified, internal planning only
// 1 Assertion:    logged statement, named source
// 2 Test-backed:  at least one named passing test
// 3 Validator:    named registered validator issued PASS
// 4 Evidence:     produced, hash-linked artifact proves the claim
// 5 Reproducible: proof can be replayed from audit state alone
export type ProofRung = 0 | 1 | 2 | 3 | 4 | 5;

// N94 — Retry classification
export type FailureKind =
  | "parse_error"       // non-retryable: syntax error in source
  | "type_error"        // non-retryable: TypeScript type mismatch
  | "build_error"       // retryable: build tooling failure
  | "test_error"        // retryable: test logic failure
  | "placeholder"       // non-retryable: forbidden placeholder tokens found
  | "missing_file"      // retryable: required file not generated
  | "unknown"           // retryable by default
  | null;               // validation passed — no failure

export interface ValidationRecord {
  projectId: string;
  packetId: string;
  status: ValidationStatus;
  checks: string[];
  summary?: string;
  // N85 — proof rung achieved by this validation
  proofRung: ProofRung;
  // N94 — failure classification for retry decisions
  failureKind: FailureKind;
  // Whether this failure is safe to retry
  isRetryable: boolean;
  createdAt: string;
  updatedAt: string;
}
