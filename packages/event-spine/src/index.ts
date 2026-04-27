export type SupportedDomain =
  | "web_apps"
  | "websites"
  | "saas_platforms"
  | "mobile_apps"
  | "desktop_apps"
  | "apis"
  | "bots"
  | "ai_agents"
  | "games"
  | "internal_tools"
  | "dirty_repos"
  | "self_upgrades";

export type EventSpineEvent = {
  id: string;
  stream: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
};

export const EVENT_SPINE_SUPPORTED_DOMAINS: SupportedDomain[] = [
  "web_apps",
  "websites",
  "saas_platforms",
  "mobile_apps",
  "desktop_apps",
  "apis",
  "bots",
  "ai_agents",
  "games",
  "internal_tools",
  "dirty_repos",
  "self_upgrades",
];

export function appendEvent(spine: EventSpineEvent[], event: Omit<EventSpineEvent, "id" | "timestamp">): EventSpineEvent[] {
  return [
    ...spine,
    {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...event,
    },
  ];
}

export function readStream(spine: EventSpineEvent[], stream: string): EventSpineEvent[] {
  return spine.filter((event) => event.stream === stream);
}
