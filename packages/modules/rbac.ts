export type Role = "admin" | "manager" | "user" | "viewer";

export type Permission =
  | "read"
  | "write"
  | "delete"
  | "approve"
  | "admin";

const rolePermissions: Record<Role, Permission[]> = {
  admin: ["read", "write", "delete", "approve", "admin"],
  manager: ["read", "write", "approve"],
  user: ["read", "write"],
  viewer: ["read"],
};

export function can(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}
