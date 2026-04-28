import { canApprove, Role } from '../auth/rbacPolicy';
export function runApprovalFlow(role: Role) { return { allowed: canApprove(role) }; }
