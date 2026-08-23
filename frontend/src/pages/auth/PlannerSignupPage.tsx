import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft } from "lucide-react";

import {
  AuthCard,
  AuthField,
  AuthShell,
  AuthSubmit,
  authInputClassName,
} from "../../components/auth/AuthShell";
import { useAuth } from "../../hooks/useAuth";
import { mapAuthError } from "../../lib/authErrors";
import { supabaseConfigured } from "../../lib/supabase";

export function PlannerSignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!organization.trim()) {
      setError("Enter your organization or agency name.");
      return;
    }
    if (!email.trim()) {
      setError("Enter a valid official email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role: "planner",
        organization: organization.trim(),
      });

      if (result.needsVerification || !result.profile) {
        void navigate("/verify-email");
        return;
      }
      void navigate("/planner", { replace: true });
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <AuthCard>
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-semibold mb-2">
            <MapPin className="w-4 h-4" />
            <span>Planner Registration</span>
          </div>

          <h2 className="text-[26px] font-bold text-white">Create Planner Account</h2>
          <p className="mt-1 text-[13px] text-vo-muted">
            For DISCOM, municipal agency, or charging infrastructure analysts.
          </p>

          {!supabaseConfigured ? (
            <p className="mt-4 text-[13px] text-vo-red">
              Supabase configuration error. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
            </p>
          ) : null}
          {error ? <p className="mt-4 text-[13px] text-vo-red">{error}</p> : null}

          <AuthField label="FULL NAME">
            <input
              className={authInputClassName()}
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ananya Sharma"
            />
          </AuthField>

          <AuthField label="ORGANIZATION / AGENCY">
            <input
              className={authInputClassName()}
              type="text"
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. BESCOM / Bengaluru Smart City Ltd"
            />
          </AuthField>

          <AuthField label="OFFICIAL EMAIL">
            <input
              className={authInputClassName()}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ananya@bescom.gov.in"
            />
          </AuthField>

          <AuthField label="PASSWORD">
            <input
              className={authInputClassName()}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </AuthField>

          <AuthField label="CONFIRM PASSWORD">
            <input
              className={authInputClassName()}
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </AuthField>

          <AuthSubmit disabled={submitting || !supabaseConfigured}>
            {submitting ? "Registering Account…" : "Register Planner Account"}
          </AuthSubmit>

          <div className="mt-4 flex items-center justify-between text-[12px] text-vo-muted">
            <Link to="/get-started" className="flex items-center space-x-1 hover:text-white">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change Role</span>
            </Link>
            <Link to="/login" className="hover:text-white">
              Already registered? Sign in
            </Link>
          </div>
        </AuthCard>
      </form>
    </AuthShell>
  );
}
