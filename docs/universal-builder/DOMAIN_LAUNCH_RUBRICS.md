# Domain Launch Rubrics

Status: Active (universal-builder P0 scope)
Purpose: Define per-domain launch requirements and runtime-proof expectations used by Botomatic universal launch gating.

## Universal per-domain baseline

Every supported domain must satisfy all of the following:
- Product truth compiled from messy input
- Build contract generated
- Build graph generated
- Implementation plan generated with packet depth >= 10
- Generated code plan emitted
- Validation proof emitted
- Launch packet emitted
- Runtime proof route succeeds (`POST /api/projects/:projectId/universal/capability-pipeline`)
- No placeholder/fake production signals in generated launch artifact contract

Runtime proof command:
- `npm run -s proof:universal-pipeline`

Runtime evidence artifacts:
- `release-evidence/runtime/universal_pipeline_runtime_proof.json`
- `release-evidence/runtime/domain_runtime_depth_matrix.json`

## Domain coverage set

The following domains are required in domain-depth runtime proof:
- web_apps
- websites
- saas_platforms
- mobile_apps
- desktop_apps
- browser_extensions
- apis
- bots
- ai_agents
- automations
- steam_pc_games
- roblox_games
- unity_games
- unreal_games
- godot_games
- minecraft_mods
- cli_tools
- libraries_sdks
- data_pipelines

## Launch closure rule

Universal-builder launch-gate depth is not considered closed unless:
- Every domain in the coverage set is exercised by runtime proof
- Every domain passes required output-contract depth checks
- Domain-depth matrix shows zero failed domains
