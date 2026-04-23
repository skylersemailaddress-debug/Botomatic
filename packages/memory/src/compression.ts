export function compressProjectState(state: any): { summary: string; reduced: any } {
  const summaryParts: string[] = [];

  if (state.masterTruth) {
    summaryParts.push(`Intent: ${state.masterTruth.productIntent}`);
  }

  if (state.plan?.packets?.length) {
    summaryParts.push(`Packets: ${state.plan.packets.length}`);
  }

  if (state.validations) {
    summaryParts.push(`Validations: ${Object.keys(state.validations).length}`);
  }

  const summary = summaryParts.join(" | ");

  const reduced = {
    masterTruth: state.masterTruth,
    plan: state.plan,
    lastValidation: state.validations ? Object.values(state.validations).slice(-1)[0] : null,
  };

  return { summary, reduced };
}
