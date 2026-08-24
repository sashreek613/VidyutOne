import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  AuthCard,
  AuthField,
  AuthShell,
  AuthSubmit,
  authInputClassName,
} from "../../components/auth/AuthShell";
import { homeForRole } from "../../lib/authRoutes";
import { useAuth } from "../../hooks/useAuth";
import { mapAuthError } from "../../lib/authErrors";
import { supabaseConfigured } from "../../lib/supabase";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notice =
    searchParams.get("reset") === "1"
      ? "Password updated. Sign in with your new password."
      : searchParams.get("verified") === "1"
        ? "Email verified. You can sign in now."
        : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const me = await signIn(email.trim(), password);
      void navigate(homeForRole(me), { replace: true });

    } catch (err: unknown) {
      const mapped = mapAuthError(err);
      setError(mapped);
      if (mapped.toLowerCase().includes("verify your email")) {
        void navigate("/verify-email");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <AuthCard>
          <h2 className="text-[28px] font-semibold text-white">Sign in</h2>
          <p className="mt-1 text-[13px] text-vo-muted">Use the account you registered. Your role comes from your profile, not this form.</p>

          {!supabaseConfigured ? (
            <p className="mt-4 text-[13px] text-vo-red">
              Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.
            </p>
          ) : null}
          {notice ? <p className="mt-4 text-[13px] text-vo-accent">{notice}</p> : null}
          {error ? <p className="mt-4 text-[13px] text-vo-red">{error}</p> : null}

          <AuthField label="EMAIL">
            <input
              className={authInputClassName()}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@organisation.gov.in"
            />
          </AuthField>
          <AuthField label="PASSWORD">
            <input
              className={authInputClassName()}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </AuthField>

          <AuthSubmit disabled={submitting || !supabaseConfigured}>
            {submitting ? "Signing in…" : "Sign in"}
          </AuthSubmit>
          <div className="mt-4 flex justify-between text-[12px] text-vo-muted">
            <Link to="/forgot-password" className="hover:text-white">
              Forgot password?
            </Link>
            <Link to="/get-started" className="hover:text-white">
              Create account
            </Link>

          </div>
        </AuthCard>
      </form>
    </AuthShell>
  );
}
