import { getAuthUser } from "./auth";

export async function isAdmin(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(user.email.toLowerCase());
}

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes(user.email.toLowerCase()))
    throw new Error("Forbidden");
  return user;
}
