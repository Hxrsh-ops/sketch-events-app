import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "@/types/database";
import { getAppEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

/**
 * Standard server client scoped to current user session (RLS enforced)
 */
export async function createClient() {
  const env = getAppEnv();

  if (env.mode === "preview" || !env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  let cookieStore: any;
  try {
    cookieStore = await cookies();
  } catch {
    cookieStore = {
      getAll: () => [],
      set: () => {},
    };
  }

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any)
          );
        } catch {
          // May be called from a Server Component where setting cookies is restricted
        }
      },
    },
  });
}

/**
 * Service role client for privileged backend operations (outbox worker, system jobs)
 * STRICTLY restricted to server environments. NEVER expose to client.
 */
export function createAdminClient() {
  const env = getServerEnv();

  if (env.mode === "preview" || !env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
