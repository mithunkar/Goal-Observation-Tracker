import Link from "next/link";

import { getVerifiedSupabaseUser } from "@/auth/application-session";
import { getPendingInvitationToken } from "@/auth/invitation-cookie";
import { signInWithGoogle } from "@/app/sign-in/actions";
import { acceptPendingInvitation } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvitationPage() {
  const [token, user] = await Promise.all([
    getPendingInvitationToken(),
    getVerifiedSupabaseUser(),
  ]);

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/" aria-label="Goal Observation Tracker home">
        <span className="brand-mark" aria-hidden="true">GO</span>
        <span>Goal Observation Tracker</span>
      </Link>
      <section className="auth-surface" aria-labelledby="invite-title">
        <div className="auth-heading">
          <h1 id="invite-title">Join your classroom</h1>
          <p>
            {token
              ? "Continue with the Google account named in your invitation."
              : "This invitation link is missing or has expired."}
          </p>
        </div>
        {token ? (
          <form
            className="account-form"
            action={user ? acceptPendingInvitation : signInWithGoogle}
          >
            <button className="form-submit" type="submit">
              {user ? `Join as ${user.email}` : "Continue with Google"}
            </button>
          </form>
        ) : (
          <Link className="form-submit" href="/sign-in">
            Return to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
