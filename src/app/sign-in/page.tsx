import Link from "next/link";
import { redirect } from "next/navigation";

import { getApplicationMemberships } from "@/auth/application-session";
import { signInWithGoogle } from "./actions";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessage = (error: string | undefined) => {
  if (error === "configuration") {
    return "Google sign-in is not configured yet.";
  }
  if (error === "google") {
    return "We could not start Google sign-in. Please try again.";
  }
  return null;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const memberships = await getApplicationMemberships();
  if (memberships.some((membership) => membership.status === "ACTIVE")) {
    redirect("/classrooms");
  }

  const { error } = await searchParams;
  const message = errorMessage(error);

  return (
    <main className="auth-shell">
      <Link className="auth-brand" href="/" aria-label="Goal Observation Tracker home">
        <span className="brand-mark" aria-hidden="true">GO</span>
        <span>Goal Observation Tracker</span>
      </Link>

      <section className="auth-surface" aria-labelledby="sign-in-title">
        <div className="auth-heading">
          <h1 id="sign-in-title">Sign in to your classroom</h1>
          <p>Use the Google account named in your classroom invitation.</p>
        </div>
        <form className="account-form" action={signInWithGoogle}>
          {message ? <p className="form-error" role="alert">{message}</p> : null}
          <button className="form-submit" type="submit">Continue with Google</button>
        </form>
      </section>
    </main>
  );
}
