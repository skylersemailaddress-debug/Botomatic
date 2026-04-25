export type UIBlueprint = {
  id: string;
  domain: string;
  shell: string;
  requiredViews: string[];
  operationalPanels: string[];
};

const UI_BLUEPRINTS: UIBlueprint[] = [
  {
    id: "ui_web_control_plane",
    domain: "web_apps",
    shell: "nextjs_control_plane",
    requiredViews: ["dashboard", "workflows", "audit", "settings"],
    operationalPanels: ["gate", "deployment", "packet", "artifacts"],
  },
  {
    id: "ui_mobile_ops",
    domain: "mobile_apps",
    shell: "react_native",
    requiredViews: ["home", "tasks", "alerts", "settings"],
    operationalPanels: ["status", "approvals"],
  },
  {
    id: "ui_agent_cockpit",
    domain: "ai_agents",
    shell: "web_cockpit",
    requiredViews: ["world_model", "predictions", "simulations", "interventions"],
    operationalPanels: ["governance", "proof_ledger"],
  },
];

export function getUIBlueprintsForDomain(domain: string): UIBlueprint[] {
  return UI_BLUEPRINTS.filter((blueprint) => blueprint.domain === domain);
}

export function listAllUIBlueprints(): UIBlueprint[] {
  return [...UI_BLUEPRINTS];
}
