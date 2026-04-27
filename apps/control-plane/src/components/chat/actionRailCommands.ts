export type ActionRailCommandKey =
  | "continue_build"
  | "inspect_failure"
  | "resolve_blocker"
  | "validate"
  | "show_proof"
  | "configure_keys"
  | "prepare_deployment"
  | "approve_contract"
  | "generate_plan";

export const ACTION_RAIL_COMMANDS: Record<ActionRailCommandKey, string> = {
  continue_build: "continue current generated app build",
  inspect_failure: "inspect failed milestone and recommend repair",
  resolve_blocker: "explain blocker and propose safe default",
  validate: "run validate all and summarize proof",
  show_proof: "show latest proof and launch readiness",
  configure_keys: "show missing secrets and recommended setup",
  prepare_deployment: "prepare deployment readiness, no live deployment",
  approve_contract: "approve current generated app build contract",
  generate_plan: "generate execution plan from uploaded build contract",
};
