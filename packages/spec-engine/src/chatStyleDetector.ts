export type ChatStyle =
  | "detailed_spec_heavy"
  | "rambling_brainstorming"
  | "speed_focused"
  | "uncertain_needs_guidance"
  | "decide_for_me"
  | "enterprise_compliance_heavy";

export function detectChatStyle(text: string): ChatStyle {
  const lower = text.toLowerCase();
  if (/(compliance|soc2|hipaa|gdpr|retention|rbac|audit)/.test(lower)) {
    return "enterprise_compliance_heavy";
  }
  if (/(you decide|decide for me|autopilot|take the wheel)/.test(lower)) {
    return "decide_for_me";
  }
  if (/(quick|fast|just build|ship now)/.test(lower)) {
    return "speed_focused";
  }
  if (/(not sure|help me|what should|confused|unsure)/.test(lower)) {
    return "uncertain_needs_guidance";
  }
  if (text.length > 1200 || /(stream of thought|brain dump|random)/.test(lower)) {
    return "rambling_brainstorming";
  }
  return "detailed_spec_heavy";
}
