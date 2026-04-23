import { compileProject, planProject, executeNext } from "@/services/actions";

export default function QuickActionRow({ projectId }: { projectId: string }) {
  async function handleCompile() {
    try {
      await compileProject(projectId);
      location.reload();
    } catch {
      alert("Compile failed.");
    }
  }

  async function handlePlan() {
    try {
      await planProject(projectId);
      location.reload();
    } catch {
      alert("Plan failed.");
    }
  }

  async function handleExecute() {
    try {
      await executeNext(projectId);
      location.reload();
    } catch {
      alert("Execution failed.");
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={handleCompile}>Compile</button>
      <button onClick={handlePlan}>Plan</button>
      <button onClick={() => location.reload()}>Refresh</button>
      <button onClick={handleExecute}>Execute</button>
    </div>
  );
}
