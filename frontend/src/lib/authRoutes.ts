import type { UserRole } from "../types";

export function homeForRole(role: UserRole | string | undefined): string {
  if (role === "planner") {
    return "/planner";
  }
  if (role === "driver") {
    return "/driver";
  }
  return "/";
}
