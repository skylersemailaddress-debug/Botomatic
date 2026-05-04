import { Mission, MissionWave } from "./missionModel.js";

export interface WavePlan {
  orderedWaves: MissionWave[];
  readyWaves: MissionWave[];
  blockedWaves: MissionWave[];
  dependencyMap: Map<string, string[]>;
}

export interface DependencyValidation {
  valid: boolean;
  errors: string[];
  circularPaths: string[][];
}

export function validateWaveDependencies(waves: MissionWave[]): DependencyValidation {
  const ids = new Set(waves.map((w) => w.waveId));
  const errors: string[] = [];
  const circularPaths: string[][] = [];

  for (const wave of waves) {
    for (const dep of wave.dependsOn) {
      if (!ids.has(dep)) {
        errors.push(`Wave "${wave.waveId}" depends on unknown wave "${dep}"`);
      }
    }
  }

  // Detect cycles via DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(waveId: string, path: string[]): boolean {
    if (inStack.has(waveId)) {
      circularPaths.push([...path, waveId]);
      return true;
    }
    if (visited.has(waveId)) return false;

    visited.add(waveId);
    inStack.add(waveId);

    const wave = waves.find((w) => w.waveId === waveId);
    for (const dep of wave?.dependsOn ?? []) {
      if (dfs(dep, [...path, waveId])) return true;
    }

    inStack.delete(waveId);
    return false;
  }

  for (const wave of waves) {
    if (!visited.has(wave.waveId)) dfs(wave.waveId, []);
  }

  return { valid: errors.length === 0 && circularPaths.length === 0, errors, circularPaths };
}

export function planWaves(mission: Mission): WavePlan {
  const waves = mission.waves;
  const dependencyMap = new Map<string, string[]>();
  for (const w of waves) dependencyMap.set(w.waveId, w.dependsOn);

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  for (const w of waves) {
    inDegree.set(w.waveId, w.dependsOn.length);
    adjList.set(w.waveId, []);
  }
  for (const w of waves) {
    for (const dep of w.dependsOn) {
      adjList.get(dep)?.push(w.waveId);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjList.get(current) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  const waveById = new Map(waves.map((w) => [w.waveId, w]));
  const orderedWaves = sorted.map((id) => waveById.get(id)!).filter(Boolean);

  // Waves not included in topological sort (cyclic dependencies or unreachable)
  const sortedSet = new Set(sorted);
  const unsortedWaves = waves.filter((w) => !sortedSet.has(w.waveId));

  const provenIds = new Set(waves.filter((w) => w.status === "proven").map((w) => w.waveId));

  const readyWaves = orderedWaves.filter(
    (w) => (w.status === "pending" || w.status === "ready") && w.dependsOn.every((dep) => provenIds.has(dep))
  );

  const blockedWaves = [
    ...orderedWaves.filter(
      (w) => (w.status === "pending" || w.status === "ready") && !w.dependsOn.every((dep) => provenIds.has(dep))
    ),
    // Cyclic/unsorted waves are always blocked
    ...unsortedWaves.filter((w) => w.status === "pending" || w.status === "ready"),
  ];

  return { orderedWaves, readyWaves, blockedWaves, dependencyMap };
}

export function getNextWave(mission: Mission): MissionWave | null {
  const { readyWaves } = planWaves(mission);
  return readyWaves[0] ?? null;
}

export function canWaveRun(mission: Mission, waveId: string): boolean {
  const wave = mission.waves.find((w) => w.waveId === waveId);
  if (!wave) return false;
  const provenIds = new Set(mission.waves.filter((w) => w.status === "proven").map((w) => w.waveId));
  return wave.dependsOn.every((dep) => provenIds.has(dep));
}
