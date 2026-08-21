import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { AuthContext, type AuthContextValue } from "../hooks/useAuth";
import { clearPendingEmail, logAuthError, mapAuthError, storePendingEmail } from "../lib/authErrors";
import { getAuthCallbackUrl, getPasswordResetRedirectUrl } from "../lib/siteUrl";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { getMe } from "../services/api";
import type { Profile, UserRole } from "../types";

function isAppRole(value: string | undefined): value is UserRole {
  return value === "planner" || value === "driver";
}

function isEmailVerified(user: User | null): boolean {
  if (!user) {
    return false;
  }
  return Boolean(user.email_confirmed_at);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user || !isEmailVerified(nextSession.user)) {
      setProfile(null);
      return null;
    }
    try {
      const me = await getMe(nextSession.access_token);
      if (!isAppRole(me.role)) {
        setProfile(null);
        return null;
      }
      setProfile(me);
      return me;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      return loadProfile(nextSession);
    },
    [loadProfile],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) {
          throw error;
        }
        if (!cancelled) {
          await applySession(data.session);
        }
      } catch {
        if (!cancelled) {
          await applySession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        await applySession(nextSession);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      session,
      user,
      profile,
      loading,
      emailVerified: isEmailVerified(user),
      configured: supabaseConfigured,
      signIn: async (email: string, password: string) => {
        if (!supabase) {
          throw new Error("Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(mapAuthError(error));
        }
        if (data.user && !isEmailVerified(data.user)) {
          storePendingEmail(email);
          await supabase.auth.signOut();
          throw new Error("Please verify your email before signing in.");
        }
        storePendingEmail(email);
        const me = await applySession(data.session);
        if (!me) {
          throw new Error("Please verify your email before signing in.");
        }
        return me;
      },
      signUp: async ({ fullName, email, password, role }) => {
        if (!supabase) {
          throw new Error("Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
        }
        if (!isAppRole(role)) {
          throw new Error("Choose Planner or Driver.");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role },
            emailRedirectTo: getAuthCallbackUrl(),
          },
        });
        if (error) {
          logAuthError("signup-error", error);
          throw new Error(mapAuthError(error));
        }
        if (data.user?.identities && data.user.identities.length === 0) {
          throw new Error("An account with this email already exists. Sign in or reset your password.");
        }
        storePendingEmail(email);
        const verified = isEmailVerified(data.user);
        if (data.session && verified) {
          const me = await applySession(data.session);
          return { needsVerification: false, profile: me };
        }
        // Do not signOut here. signOut clears PKCE verifiers from storage, which
        // breaks same-browser email confirmation for this signup.
        return { needsVerification: true, profile: null };
      },
      signOut: async () => {
        clearPendingEmail();
        if (supabase) {
          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              logAuthError("signout-error", error);
              const local = await supabase.auth.signOut({ scope: "local" });
              if (local.error) {
                logAuthError("signout-local-error", local.error);
              }
            }
          } catch (err) {
            logAuthError("signout-error", err);
            try {
              await supabase.auth.signOut({ scope: "local" });
            } catch (localErr) {
              logAuthError("signout-local-error", localErr);
            }
          }
        }
        await applySession(null);
      },
      requestPasswordReset: async (email: string) => {
        if (!supabase) {
          throw new Error("Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getPasswordResetRedirectUrl(),
        });
        if (error) {
          throw new Error(mapAuthError(error));
        }
        storePendingEmail(email);
      },
      updatePassword: async (password: string) => {
        if (!supabase) {
          throw new Error("Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          throw new Error(mapAuthError(error));
        }
      },
      resendVerification: async (email: string) => {
        if (!supabase) {
          throw new Error("Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
        }
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: getAuthCallbackUrl() },
        });
        if (error) {
          logAuthError("resend-error", error);
          throw new Error(mapAuthError(error));
        }
      },
      refreshProfile: async () => {
        if (!supabase) {
          await applySession(null);
          return;
        }
        const { data } = await supabase.auth.getSession();
        await applySession(data.session);
      },
    };
  }, [applySession, loading, profile, session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
