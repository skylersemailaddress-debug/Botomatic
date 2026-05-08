# Failed Gates

## Purpose

This file records every failing baseline command, validator, proof, or launch gate discovered during Phase 1.

A failing gate is not merely a bug. It is a statement that Botomatic currently lacks proof for a launch-critical property.

---

# Classification Levels

| Severity | Meaning |
|---|---|
| P0 | blocks commercial launch or invalidates major claims |
| P1 | major enterprise/commercial risk |
| P2 | important but not launch-blocking |
| P3 | cleanup or optimization |

---

# Failed Gates

## Pending Execution

No command suite execution has been attached yet.

This file will be populated immediately after baseline command execution.

---

# Required Classification Fields

Each failed gate must eventually include:

```text
command
failure category
severity
runtime impact
claim impact
commercial impact
security impact
temporary workaround
required remediation
validator owner
```

---

# Required Truth Rules

A gate may not be marked resolved unless:

- the root cause was fixed
- the failing scenario was reproduced
- the validator/proof reran successfully
- evidence was preserved
- negative-path testing exists where appropriate
