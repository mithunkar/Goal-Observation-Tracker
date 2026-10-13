import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canInviteMembers } from "@/auth/authorization";
import { classroomPath } from "@/classroom/routes";
import { listClassroomStaff } from "@/db/queries/invitations";
import {
  createInvitationAction,
  regenerateInvitationAction,
  revokeInvitationAction,
} from "./actions";
import {
  InviteMemberForm,
  RegenerateInvitationButton,
} from "./invite-controls";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  params,
}: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canInviteMembers(identity)) {
    redirect(classroomPath(classroomId));
  }

  const { db } = await import("@/db/client");
  const staff = await listClassroomStaff(db, identity);

  return (
    <main className="dashboard-shell staff-shell">
      <header className="dashboard-header">
        <Link className="back-link" href={classroomPath(classroomId)}>
          ← Students
        </Link>
        <strong>{identity.workspaceName}</strong>
      </header>

      <section className="student-plan-heading">
        <div>
          <p className="session-kicker">Classroom access</p>
          <h1>Staff</h1>
          <p>Teachers and assistants have the same classroom access. Only teachers can invite people.</p>
        </div>
      </section>

      <section className="auth-surface staff-invite" aria-labelledby="invite-heading">
        <div className="auth-heading">
          <h2 id="invite-heading">Invite a staff member</h2>
          <p>Create a one-time link, then send it to the email shown.</p>
        </div>
        <InviteMemberForm action={createInvitationAction.bind(null, classroomId)} />
      </section>

      <section aria-labelledby="members-heading">
        <h2 id="members-heading">Current staff</h2>
        <ul className="staff-list">
          {staff.members.map((member) => (
            <li key={member.id}>
              <div>
                <strong>{member.displayName}</strong>
                <span>{member.email}</span>
              </div>
              <span>{member.role === "TEACHER" ? "Teacher" : "Assistant"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pending-heading">
        <h2 id="pending-heading">Pending invitations</h2>
        {staff.invitations.length === 0 ? (
          <p>No pending invitations.</p>
        ) : (
          <ul className="staff-list">
            {staff.invitations.map((invitation) => (
              <li key={invitation.id}>
                <div>
                  <strong>{invitation.email}</strong>
                  <span>
                    {invitation.role === "TEACHER" ? "Teacher" : "Assistant"}
                    {" · Expires "}
                    {invitation.expiresAt?.toLocaleDateString()}
                  </span>
                </div>
                <div className="staff-actions">
                  <RegenerateInvitationButton
                    action={regenerateInvitationAction.bind(
                      null,
                      classroomId,
                      invitation.id,
                    )}
                  />
                  <form action={revokeInvitationAction.bind(null, classroomId, invitation.id)}>
                    <button className="secondary-action" type="submit">Revoke</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
