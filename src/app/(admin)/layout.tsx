import { verifyAdminSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/lib/auth/auth-context";
import { SketchRepository } from "@/lib/supabase/repository";
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

  const isPreview = SketchRepository.isPreview();
  let eventCount: number | null = null;
  try {
    eventCount = await SketchRepository.getEventCount();
  } catch (err) {
    console.warn("[AdminLayout] Failed to load event count for sidebar badge:", err);
    eventCount = null;
  }

  return (
    <AuthProvider initialUser={sessionResult.user}>
      <AdminLayoutClient
        user={sessionResult.user}
        eventCount={eventCount}
        isPreview={isPreview}
      >
        {children}
      </AdminLayoutClient>
    </AuthProvider>
  );
}

