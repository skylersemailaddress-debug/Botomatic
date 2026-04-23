export type UserRole = "operator" | "reviewer" | "admin";

export type AuthContext = {
  userId: string;
  role: UserRole;
};

export function resolveRole(headers: Record<string, any>): AuthContext {
  const role = headers["x-role"] as UserRole | undefined;
  const userId = headers["x-user-id"] || "anonymous";

  return {
    userId,
    role: role || "operator",
  };
}
