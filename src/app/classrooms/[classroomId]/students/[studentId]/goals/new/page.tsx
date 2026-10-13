import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { findAuthorizedStudent } from "@/db/queries/students";

import { createGoalAction } from "./actions";
import { GoalForm } from "./goal-form";

export const dynamic = "force-dynamic";

export default async function NewGoalPage({
  params,
}: {
  params: Promise<{ classroomId: string; studentId: string }>;
}) {
  const { classroomId, studentId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    redirect(classroomPath(classroomId));
  }

  const { db } = await import("@/db/client");
  const student = await findAuthorizedStudent(db, identity, studentId);
  if (!student) {
    notFound();
  }

  const action = createGoalAction.bind(null, classroomId, studentId);

  return (
    <main className="auth-shell onboarding-shell">
      <Link className="back-link" href={classroomPath(classroomId, `/students/${studentId}`)}>
        ← {student.displayName}
      </Link>
      <section className="auth-surface" aria-labelledby="new-goal-title">
        <div className="auth-heading">
          <h1 id="new-goal-title">Add a goal</h1>
        </div>
        <GoalForm action={action} />
      </section>
    </main>
  );
}
