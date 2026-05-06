export type UserRole = "operator" | "reviewer" | "admin";

export type AuthContext = {
  userId: string;
  role: UserRole;
};
