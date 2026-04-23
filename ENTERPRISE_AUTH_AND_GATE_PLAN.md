# Enterprise Gate + Auth Plan

## Goal
Move Botomatic from enterprise-ready core to true enterprise launch readiness.

## Final phase workstreams
1. Enterprise identity and access
2. Approval and governance layer
3. Audit and trace surface
4. Validator gate UI
5. Promotion and deployment surface

## Immediate implementation order

### Step 1: Identity scaffold
- introduce user identity model
- define roles: operator, reviewer, admin
- add role-aware request context
- preserve current bearer token path as temporary fallback only

### Step 2: Gate state model
- define launch gate states: not_started, blocked, ready
- define approval states: pending, approved, rejected
- expose gate summary API

### Step 3: UI surfaces
- auth status / role display
- validator gate panel
- audit timeline panel
- approval queue panel

### Step 4: Promotion
- environment model: dev, staging, prod
- promote action contract
- rollback placeholder contract

## Launch requirement
Botomatic is not 10/10 enterprise launch ready until these workstreams are implemented and wired.
