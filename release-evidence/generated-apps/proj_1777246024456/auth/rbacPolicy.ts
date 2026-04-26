export type Role = 'admin' | 'reviewer' | 'operator' | 'member';
export function canApprove(role: Role) { return role === 'admin' || role === 'reviewer'; }
