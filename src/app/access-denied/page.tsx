import Link from "next/link";

import { signOut } from "@/app/sign-in/actions";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = reason === "email_mismatch"
    ? "This invitation belongs to a different Google account. Sign out and use the email named in the invitation."
    : reason === "invalid_invitation"
      ? "This invitation is invalid, expired, or has already been used. Ask a classroom teacher for a new link."
      : reason === "classroom"
        ? "You do not have active access to that classroom."
        : "Ask a classroom teacher to send you an invitation link before trying again.";
  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/" aria-label="Goal Observation Tracker home">
        <span className="brand-mark" aria-hidden="true">GOT</span>
        <span>Goal Observation Tracker</span>
      </Link>

      <section className="auth-surface" aria-labelledby="access-denied-title">
        <div className="auth-heading">
          <h1 id="access-denied-title">Access not approved</h1>
          <p>{message}</p>
        </div>
        <form className="account-form" action={signOut}>
          <button className="form-submit" type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
