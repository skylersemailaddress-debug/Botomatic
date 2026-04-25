export type ArchitectureMap = {
  frontendPaths: string[];
  backendPaths: string[];
  dataPaths: string[];
  infraPaths: string[];
};

export function mapArchitecture(files: string[]): ArchitectureMap {
  const frontendPaths = files.filter((f) => /apps\/|src\/.*(page|component|ui)/i.test(f)).slice(0, 100);
  const backendPaths = files.filter((f) => /(api|server|orchestrator|backend)/i.test(f)).slice(0, 100);
  const dataPaths = files.filter((f) => /(schema|migration|prisma|sql|db)/i.test(f)).slice(0, 100);
  const infraPaths = files.filter((f) => /(docker|vercel|terraform|k8s|deploy)/i.test(f)).slice(0, 100);
  return { frontendPaths, backendPaths, dataPaths, infraPaths };
}
