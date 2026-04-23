export type PacketDependency = {
  packetId: string;
  dependsOn?: string[];
};

export function canRunPacket(packet: PacketDependency, completed: Set<string>): boolean {
  const deps = packet.dependsOn || [];
  return deps.every((dep) => completed.has(dep));
}

export function filterRunnablePackets<T extends PacketDependency>(packets: T[], completed: Set<string>): T[] {
  return packets.filter((packet) => canRunPacket(packet, completed));
}
