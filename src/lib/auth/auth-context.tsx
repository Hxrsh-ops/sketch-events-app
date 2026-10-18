"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AdminUser } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { MOCK_ADMIN_USER } from "@/lib/mock-data";
import { isPreviewMode } from "@/lib/env";
import { Permission, hasPermission } from "@/lib/auth/permissions";

interface AuthContextType {
  user: AdminUser | null;
  role: AdminUser["role"] | null;
  loading: boolean;
  isPreview: boolean;
  can: (permission: Permission) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  isPreview: false,
  can: () => false,
  signOut: async () => {},
});

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: AdminUser | null;
}) {
  const [user, setUser] = useState<AdminUser | null>(initialUser || null);
  const [loading, setLoading] = useState<boolean>(!initialUser);
  const [isPreview, setIsPreview] = useState<boolean>(false);

  useEffect(() => {
    const isLocalPreview = isPreviewMode();
    setIsPreview(isLocalPreview);

    if (isLocalPreview) {
      if (initialUser) {
        setUser(initialUser);
      }
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Fetch user and profile in production
    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase!.auth.getUser();

        if (!authUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: profile } = await (supabase as any)
          .from("admin_profiles")
          .select("id, email, full_name, role, avatar_url")
          .eq("id", authUser.id)
          .single();

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.full_name,
            email: profile.email,
            role: profile.role,
            avatarUrl: profile.avatar_url || undefined,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("[Sketch Auth] Error loading admin user:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    if (!initialUser) {
      loadUser();
    } else {
      setLoading(false);
    }

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser]);

  const handleSignOut = async () => {
    try {
      if (isPreview) {
        // Destroy preview session cookie via server route
        await fetch("/api/auth/preview-logout", { method: "POST" });
      } else {
        const supabase = createClient();
        if (supabase) {
          await supabase.auth.signOut();
        }
      }
    } catch (err) {
      console.error("[Sketch Auth] Logout error:", err);
    } finally {
      setUser(null);
      // Replace location so back button does not retain previous state in history
      window.location.replace("/login");
    }
  };

  const checkPermission = (permission: Permission): boolean => {
    return hasPermission(user?.role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        isPreview,
        can: checkPermission,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
