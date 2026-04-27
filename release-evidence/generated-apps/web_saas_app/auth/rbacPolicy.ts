export type Role='admin'|'reviewer'|'operator'|'member';
export const canDeploy=(role:Role)=>role==='admin'||role==='reviewer';
