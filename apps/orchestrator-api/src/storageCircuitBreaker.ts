/**
 * StorageCircuitBreaker — Decision 2: Post-startup Supabase failover
 *
 * Tracks durable storage health AFTER startup. When Supabase becomes
 * unavailable during normal operation, the circuit opens (DEGRADED mode)
 * and blocks all writes/builds to prevent data loss. Reads fall back to
 * an in-memory cache populated on each successful getProject call.
 *
 * Circuit closes automatically when a storage operation succeeds again.
 */

export type CircuitState = "CLOSED" | "DEGRADED";

export type StorageHealthPayload = {
  state: CircuitState;
  consecutiveFailures: number;
  degradedAt: string | null;
  recoveredAt: string | null;
  cachedProjectIds: number;
};

const FAILURE_THRESHOLD = 3;

export class StorageCircuitBreaker {
  private state: CircuitState = "CLOSED";
  private consecutiveFailures = 0;
  private degradedAt: string | null = null;
  private recoveredAt: string | null = null;
  /** Best-effort last-known project cache (projectId → record snapshot). */
  private cache = new Map<string, unknown>();

  recordSuccess(projectId?: string, record?: unknown): void {
    if (this.state === "DEGRADED") {
      this.recoveredAt = new Date().toISOString();
      console.log(
        JSON.stringify({
          event: "storage_recovered",
          previousConsecutiveFailures: this.consecutiveFailures,
          recoveredAt: this.recoveredAt,
        })
      );
    }
    this.consecutiveFailures = 0;
    this.state = "CLOSED";
    if (projectId !== undefined && record !== undefined) {
      this.cache.set(projectId, record);
    }
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === "CLOSED" && this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this.state = "DEGRADED";
      this.degradedAt = new Date().toISOString();
      console.error(
        JSON.stringify({
          event: "storage_degraded",
          consecutiveFailures: this.consecutiveFailures,
          degradedAt: this.degradedAt,
        })
      );
    }
  }

  isDegraded(): boolean {
    return this.state === "DEGRADED";
  }

  getCachedProject(projectId: string): unknown | null {
    return this.cache.get(projectId) ?? null;
  }

  getHealthPayload(): StorageHealthPayload {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      degradedAt: this.degradedAt,
      recoveredAt: this.recoveredAt,
      cachedProjectIds: this.cache.size,
    };
  }
}

/** Singleton instance shared across server_app.ts */
export const storageCircuit = new StorageCircuitBreaker();
