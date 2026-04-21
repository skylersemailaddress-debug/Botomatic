import { Packet } from "../../core-contracts/src/packet";

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
};

export function canAutoProceed(packet: Packet): PolicyDecision {
  if (packet.riskLevel === "high") {
    return { allowed: false, reason: "High-risk packet requires approval" };
  }

  if (packet.retryCount >= packet.maxRetries) {
    return { allowed: false, reason: "Retry limit reached" };
  }

  return { allowed: true };
}
