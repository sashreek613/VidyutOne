import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { AuthCard, AuthShell, AuthSubmit } from "../../components/auth/AuthShell";
import { useAuth } from "../../hooks/useAuth";
import { mapAuthError, readPendingEmail } from "../../lib/authErrors";

export function VerifyEmailPage() {
  const { resendVerification, user } = useAuth();
  const email = user?.email ?? readPendingEmail() ?? "";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleResend(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email) {
      setError("We do not have an email to resend to. Go back and sign up again.");
      return;
    }
    setSubmitting(true);
    try {
      await resendVerification(email);
      setSent(true);
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <AuthCard>
        <h2 className="text-[28px] font-semibold text-white">Please verify your email</h2>
        <p className="mt-3 text-[14px] leading-6 text-vo-soft">
          We sent a verification link{email ? ` to ${email}` : ""}. Open that email and click the link before you can
          enter the Planner or Driver console.
        </p>
        <p className="mt-3 text-[13px] text-vo-muted">
          Unverified accounts cannot access protected pages. If the link is expired, resend it and try again.
        </p>
        {sent ? <p className="mt-4 text-[13px] text-vo-accent">Verification email sent. Check your inbox.</p> : null}
        {error ? <p className="mt-4 text-[13px] text-vo-red">{error}</p> : null}
        <form onSubmit={(event) => void handleResend(event)}>
          <AuthSubmit disabled={submitting || !email}>{submitting ? "Sending…" : "Resend verification email"}</AuthSubmit>
        </form>
        <p className="mt-4 text-center text-[12px] text-vo-muted">
          <Link to="/" className="text-white hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  );
}
