import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { AlertTriangle, MessageCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { isSupabaseConfigured } from "../lib/supabase";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const { user, loginWithDiscord } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    const urlReferralCode = searchParams.get("ref")?.trim().toUpperCase() ?? "";
    if (urlReferralCode) {
      setReferralCode(urlReferralCode);
    }
  }, [searchParams]);

  if (user) {
    return <Navigate to="/legendex" replace />;
  }

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithDiscord(referralCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
        <ShieldCheck className="h-6 w-6 text-cyan-300" />
        Login
      </h1>
      <p className="text-sm text-slate-300">
        Authentification OAuth Discord via Supabase.
      </p>

      {!isSupabaseConfigured ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <span className="mb-1 inline-flex items-center gap-1 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Configuration requise
          </span>
          <br />
          Configure `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans ton
          `.env`.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-rose-500/50 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor="referral-code"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
        >
          Code de parrainage (optionnel)
        </label>
        <input
          id="referral-code"
          type="text"
          value={referralCode}
          onChange={(event) => {
            setReferralCode(event.target.value.toUpperCase().trim());
          }}
          placeholder="Ex: A1B2C3D4E5F6"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400"
          maxLength={40}
          autoComplete="off"
        />
      </div>

      <button
        onClick={() => void handleLogin()}
        disabled={loading || !isSupabaseConfigured}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {loading ? "Redirection..." : "Continuer avec Discord"}
      </button>
    </section>
  );
}
