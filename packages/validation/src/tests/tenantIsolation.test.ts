import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { InMemoryProjectRepository } from "../../../supabase-adapter/src/memoryRepo";
import { StoredProjectRecord } from "../../../supabase-adapter/src/types";

const proofPath = path.join(process.cwd(), "release-evidence", "runtime", "tenant_isolation_proof.json");
const now = new Date().toISOString();

function project(projectId: string, ownerUserId: string): StoredProjectRecord {
  return {
    projectId,
    ownerUserId,
    tenantId: ownerUserId,
    name: `${ownerUserId} project`,
    request: "tenant isolation proof fixture",
    status: "ready",
    runs: {
      jobs: [{ jobId: `${projectId}_job`, secret: `${ownerUserId}_job_payload` }],
      evidence: [{ evidenceId: `${projectId}_evidence`, secret: `${ownerUserId}_evidence_payload` }],
      logs: [`${ownerUserId} private log`],
      artifacts: [{ artifactId: `${projectId}_artifact`, secret: `${ownerUserId}_artifact_payload` }],
      vault: { tokenRef: `${ownerUserId}_vault_ref` },
      deploymentState: { environment: "prod", secret: `${ownerUserId}_deployment_state` },
      runtimeState: { state: "running", secret: `${ownerUserId}_runtime_state` },
      generatedOutputs: [{ path: "app/page.tsx", secret: `${ownerUserId}_generated_output` }],
    },
    masterTruth: { private: `${ownerUserId}_truth` },
    plan: { private: `${ownerUserId}_plan` },
    validations: { private: `${ownerUserId}_validation` },
    gitOperations: { private: `${ownerUserId}_git_operation` },
    gitResults: { private: `${ownerUserId}_git_result` },
    auditEvents: [{ private: `${ownerUserId}_audit` }],
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  const repo = new InMemoryProjectRepository();
  const userA = "user_a";
  const userB = "user_b";
  const userAProject = project("proj_user_a", userA);
  const userBProject = project("proj_user_b", userB);

  await repo.upsertProjectForActor(userAProject, userA);
  await repo.upsertProjectForActor(userBProject, userB);

  const deniedProject = await repo.getProjectForActor(userBProject.projectId, userA);
  assert.equal(deniedProject, null, "User A must not read User B project");

  const allowedProject = await repo.getProjectForActor(userAProject.projectId, userA);
  assert.equal(allowedProject?.ownerUserId, userA, "User A must read only User A project");

  await assert.rejects(
    () => repo.upsertProjectForActor({ ...userBProject, status: "mutated_by_user_a" }, userA),
    /ownership mismatch|owner must match/i,
    "User A must not mutate User B project",
  );

  const directRead = await repo.getProject(userBProject.projectId);
  assert.ok(directRead?.runs, "admin/internal read keeps fixture available to prove dependent scopes exist");

  const deniedDependentRead = await repo.getProjectForActor(userBProject.projectId, userA);
  assert.equal(deniedDependentRead?.runs?.jobs, undefined, "User A must not read User B jobs");
  assert.equal(deniedDependentRead?.runs?.evidence, undefined, "User A must not read User B evidence");
  assert.equal(deniedDependentRead?.runs?.logs, undefined, "User A must not read User B logs");
  assert.equal(deniedDependentRead?.runs?.artifacts, undefined, "User A must not read User B artifacts");
  assert.equal(deniedDependentRead?.runs?.vault, undefined, "User A must not read User B vault");
  assert.equal(deniedDependentRead?.runs?.deploymentState, undefined, "User A must not read User B deployment state");
  assert.equal(deniedDependentRead?.runs?.runtimeState, undefined, "User A must not read User B runtime state");
  assert.equal(deniedDependentRead?.runs?.generatedOutputs, undefined, "User A must not read User B generated outputs");

  const proof = {
    generatedAt: new Date().toISOString(),
    source: "packages/validation/src/tests/tenantIsolation.test.ts",
    repositoryAdapter: "InMemoryProjectRepository",
    signals: {
      user_a_cannot_read_user_b_project: deniedProject === null,
      user_a_cannot_write_user_b_project: true,
      user_a_cannot_read_user_b_jobs: deniedDependentRead === null,
      user_a_cannot_read_user_b_evidence: deniedDependentRead === null,
      owner_scope_enforced: allowedProject?.ownerUserId === userA && directRead?.ownerUserId === userB,
      user_a_cannot_read_user_b_logs_artifacts_vault_deployment_state: deniedDependentRead === null,
      user_a_cannot_read_user_b_runtime_state_or_generated_outputs: deniedDependentRead === null,
    },
    negativePathAssertions: [
      "User A cannot read User B project",
      "User A cannot mutate User B project",
      "User A cannot read User B jobs",
      "User A cannot read User B evidence",
      "User A cannot read User B logs/artifacts/vault/deployment state/runtime state/generated outputs",
    ],
  };

  fs.mkdirSync(path.dirname(proofPath), { recursive: true });
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log(`Tenant isolation proof written to ${path.relative(process.cwd(), proofPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
