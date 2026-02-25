import { useState } from "react";
import { Navigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../lib/supabase";

export function LoginPage() {
  const { user, loginWithDiscord } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/collection" replace />;
  }

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithDiscord();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-2xl font-semibold text-white">Login</h1>
      <p className="text-sm text-slate-300">
        Authentification OAuth Discord via Supabase.
      </p>

      {!isSupabaseConfigured ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Configure `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans ton
          `.env`.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-500/50 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <button
        onClick={() => void handleLogin()}
        disabled={loading || !isSupabaseConfigured}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {loading ? "Redirecting..." : "Continue with Discord"}
      </button>
    </section>
  );
}
