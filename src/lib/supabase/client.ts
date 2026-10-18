import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";
import { getAppEnv } from "@/lib/env";

export function createClient() {
  const env = getAppEnv();

  if (env.mode === "preview" || !env.supabaseUrl || !env.supabaseAnonKey) {
    // Return null in preview mode; callers will handle preview fallback explicitly
    return null;
  }

  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
