# Domain Builder Registry

Status: Active

Botomatic supports domain-specific builder declarations through:
- `packages/domain-builders/src/types.ts`
- `packages/domain-builders/src/registry.ts`

Each domain builder declares:
- required specs
- supported stacks
- default architecture
- risky decisions
- required clarifying questions
- build commands
- test commands
- validation commands
- deployment/export path
- commercial-readiness rubric
- no-placeholder rules
- repair strategy

Supported domains include:
- web apps/websites/SaaS
- mobile/desktop/extensions
- APIs/bots/AI agents/automations
- games (Steam/PC, Roblox, Unity, Unreal, Godot, Minecraft mods)
- CLI tools/libraries/SDKs/data pipelines
