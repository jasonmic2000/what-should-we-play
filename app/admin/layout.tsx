import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            403
          </h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-57px)] bg-zinc-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-zinc-950 p-6 sm:ml-56">
        {children}
      </main>
    </div>
  );
}
