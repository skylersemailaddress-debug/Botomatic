"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProjectLiveState = {
  execution: any | null;
  runtime: any | null;
  launchProof: any | null;
};

const cache = new Map<string, ProjectLiveState>();
const inflight = new Map<string, Promise<ProjectLiveState>>();

async function fetchJsonOrNull(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function loadProjectLiveState(projectId: string): Promise<ProjectLiveState> {
  const key = `project-live-state:${projectId}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = Promise.all([
    fetchJsonOrNull(`/api/projects/${projectId}/execution`),
    fetchJsonOrNull(`/api/projects/${projectId}/runtime`),
    fetchJsonOrNull(`/api/projects/${projectId}/launch-proof`),
  ])
    .then(([execution, runtime, launchProof]) => {
      const next = { execution, runtime, launchProof };
      cache.set(key, next);
      return next;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

export function useProjectLiveState(projectId: string, intervalMs = 1500) {
  const key = `project-live-state:${projectId}`;
  const [state, setState] = useState<ProjectLiveState>(() => cache.get(key) ?? { execution: null, runtime: null, launchProof: null });
  const [isLoading, setIsLoading] = useState(!cache.has(key));
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await loadProjectLiveState(projectId);
      if (!stopped.current) setState(next);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Project state refresh failed";
      if (!stopped.current) setError(message);
      return cache.get(key) ?? state;
    } finally {
      if (!stopped.current) setIsLoading(false);
    }
  }, [projectId, key, state]);

  const mutate = useCallback((patch: Partial<ProjectLiveState>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      cache.set(key, next);
      return next;
    });
  }, [key]);

  useEffect(() => {
    stopped.current = false;
    refresh();
    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      stopped.current = true;
      window.clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { ...state, isLoading, error, refresh, mutate };
}
