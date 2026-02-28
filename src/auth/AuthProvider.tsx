import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

interface UserProfile {
  id: string;
  username: string | null;
  pc_balance: number;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithDiscord: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureCurrentUserProfile(currentUser: User): Promise<void> {
  const { error } = await supabase.rpc("ensure_current_user_profile", {
    p_user_id: currentUser.id,
  });

  if (error) {
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = user?.id;

  const invalidateUserQueries = useCallback(async () => {
    if (!userId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["collection", userId],
        refetchType: "active",
      }),
      queryClient.invalidateQueries({
        queryKey: ["leaderboard"],
        refetchType: "active",
      }),
      queryClient.invalidateQueries({
        refetchType: "active",
        predicate: (query) => {
          const rootKey = query.queryKey[0];
          return (
            rootKey === "legendex-owned" ||
            rootKey === "legendex-cards" ||
            rootKey === "booster-list" ||
            rootKey === "series-boosters" ||
            rootKey === "daily-booster-opened-today"
          );
        },
      }),
    ]);
  }, [queryClient, userId]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, username, pc_balance")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setProfile(data);
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (error) {
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    if (!user) {
      setProfile(null);
      return;
    }

    const syncProfile = async () => {
      await ensureCurrentUserProfile(user);
      await refreshProfile();
    };

    void syncProfile();
  }, [refreshProfile, user]);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) {
      return;
    }

    const channel = supabase
      .channel(`realtime-user-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${userId}`,
        },
        async () => {
          await refreshProfile();
          await invalidateUserQueries();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_cards",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await invalidateUserQueries();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_cards",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await invalidateUserQueries();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booster_openings",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await invalidateUserQueries();
          await refreshProfile();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [invalidateUserQueries, refreshProfile, userId]);

  const loginWithDiscord = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    const redirectTo = `${window.location.origin}/collection`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      loginWithDiscord,
      logout,
      refreshProfile,
    }),
    [loading, loginWithDiscord, logout, profile, refreshProfile, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
