export function writeLaunchPacket(input: { projectId: string; blockers: string[]; validatorSummary: string }): string {
  return [
    `Launch Packet for ${input.projectId}`,
    `Validator summary: ${input.validatorSummary}`,
    `Remaining blockers: ${input.blockers.length}`,
  ].join("\n");
}
