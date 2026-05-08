# Missing Scripts

## Purpose

This file records required commands, validators, proof runners, or launch gates that are referenced by policy, docs, CI, or release flows but do not actually exist or are not executable.

Missing scripts are treated as launch-truth failures.

---

# Required Baseline Scripts

| Script | Required | Status |
|---|---|---|
| `deps:sanity` | yes | pending audit |
| `lint` | yes | pending audit |
| `typecheck` | yes | pending audit |
| `build` | yes | pending audit |
| `test` | yes | pending audit |
| `validate:all` | yes | pending audit |
| `proof:all` | yes | pending audit |
| `beta:readiness` | yes | pending audit |
| `validate:commercial-launch` | yes | pending audit |

---

# Required Truth Rules

A script may not be counted as implemented unless:

- it exists in package.json or equivalent execution registry
- it runs successfully
- it performs meaningful work
- it is not a placeholder shell
- it returns non-zero on failure
- its evidence output is inspectable

---

# Required Classification Fields

Each missing or invalid script should eventually include:

```text
expected purpose
why it matters
whether CI references it
whether launch claims depend on it
temporary workaround
required implementation
severity
```
