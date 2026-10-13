import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { findAuthorizedStudent } from "@/db/queries/students";
import { findActiveStrategyForGoal, findAuthorizedGoal } from "@/db/queries/strategies";

import { assignStrategyAction } from "./actions";
import { StrategyForm } from "./strategy-form";

export const dynamic = "force-dynamic";

export default async function NewStrategyPage({
  params,
}: {
  params: Promise<{ classroomId: string; studentId: string; goalId: string }>;
}) {
  const { classroomId, studentId, goalId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    redirect(classroomPath(classroomId));
  }

  const { db } = await import("@/db/client");
  const student = await findAuthorizedStudent(db, identity, studentId);
  if (!student) {
    notFound();
  }
  const goal = await findAuthorizedGoal(db, identity, student, goalId);
  if (!goal) {
    notFound();
  }
  const activeStrategy = await findActiveStrategyForGoal(db, identity, goal.id);

  const action = assignStrategyAction.bind(null, classroomId, studentId, goalId, activeStrategy?.id);

  return (
    <main className="auth-shell onboarding-shell">
      <Link className="back-link" href={classroomPath(classroomId, `/students/${studentId}`)}>
        ← {student.displayName}
      </Link>
      <section className="auth-surface" aria-labelledby="strategy-title">
        <div className="auth-heading">
          <p className="session-kicker">{goal.goalArea}</p>
          <h1 id="strategy-title">{activeStrategy ? "Edit strategy" : "Assign a strategy"}</h1>
        </div>
        <StrategyForm action={action} initialStrategy={activeStrategy ?? undefined} submitLabel={activeStrategy ? "Save new version" : "Assign strategy"} />
      </section>
    </main>
  );
}
