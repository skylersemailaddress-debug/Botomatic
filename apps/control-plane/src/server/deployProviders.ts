export type DeployTarget = 'local_artifact' | 'external_stub';

export async function runDeploy(target: DeployTarget, payload: any) {
  if (target === 'local_artifact') {
    return { ok: true, target, url: null };
  }

  if (target === 'external_stub') {
    // placeholder for Vercel/Docker/etc
    return {
      ok: false,
      error: 'External deploy not configured'
    };
  }

  return { ok: false, error: 'Unknown target' };
}
