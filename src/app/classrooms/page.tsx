import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getApplicationMemberships,
  getVerifiedSupabaseUser,
} from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";

export const dynamic = "force-dynamic";

export default async function ClassroomsPage() {
  const verifiedUser = await getVerifiedSupabaseUser();
  if (!verifiedUser) {
    redirect("/sign-in");
  }
  const memberships = (await getApplicationMemberships()).filter(
    (membership) => membership.status === "ACTIVE",
  );

  if (memberships.length === 0) {
    redirect("/access-denied");
  }
  if (memberships.length === 1) {
    redirect(classroomPath(memberships[0].workspaceId));
  }

  return (
    <main className="auth-shell onboarding-shell">
      <section className="auth-surface" aria-labelledby="classrooms-title">
        <div className="auth-heading">
          <p className="session-kicker">Evidence Loop</p>
          <h1 id="classrooms-title">Choose a classroom</h1>
          <p>Select the classroom you want to open.</p>
        </div>
        <div className="classroom-list">
          {memberships.map((membership) => (
            <Link
              className="student-roster-card"
              href={classroomPath(membership.workspaceId)}
              key={membership.workspaceId}
            >
              <span className="student-avatar" aria-hidden="true">
                {membership.workspaceName.slice(0, 1)}
              </span>
              <div>
                <h2>{membership.workspaceName}</h2>
                <p>{membership.role === "TEACHER" ? "Teacher" : "Assistant"}</p>
              </div>
              <span className="student-card-action">Open →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
