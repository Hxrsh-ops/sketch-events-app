import { verifyAdminSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionResult = await verifyAdminSession();

  // If unauthenticated (in either production or preview mode without active session), redirect to login
  if (!sessionResult.isAuthenticated) {
    redirect("/login");
  }

  // If authenticated in Supabase but lacks admin_profiles entry in database
  if (!sessionResult.isAdmin) {
    redirect("/login?error=not_an_admin");
  }

  return (
    <AuthProvider initialUser={sessionResult.user}>
      <AdminLayoutClient user={sessionResult.user}>{children}</AdminLayoutClient>
    </AuthProvider>
  );
}
