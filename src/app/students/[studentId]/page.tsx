import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { listStudentGoals } from "@/db/queries/goals";
import { findAuthorizedStudent } from "@/db/queries/students";

import { archiveStudentAction } from "./actions";
import { ArchiveStudentButton } from "./archive-student-button";

export const dynamic = "force-dynamic";

export default async function StudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const identity = await requireCurrentApplicationIdentity();
  if (!canManageClassroom(identity)) {
    redirect("/dashboard");
  }

  const { studentId } = await params;
  const { db } = await import("@/db/client");
  const student = await findAuthorizedStudent(db, identity, studentId);
  if (!student || student.status !== "ACTIVE") {
    notFound();
  }
  const goals = await listStudentGoals(db, identity, student);
  const activeGoalCount = goals.filter((goal) => goal.status === "ACTIVE").length;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="back-link" href="/dashboard">
          ← Students
        </Link>
      </header>

      <section className="student-plan-heading" aria-labelledby="student-title">
        <div>
          <p className="session-kicker">Student plan</p>
          <h1 id="student-title">{student.displayName}</h1>
        </div>
        <div className="plan-actions">
          <Link className="secondary-action" href={`/students/${studentId}/progress`}>
            Progress
          </Link>
          <Link className="secondary-action" href={`/students/${studentId}/reports`}>
            Parent summary
          </Link>
          <Link className="secondary-action" href={`/students/${studentId}/edit`}>
            Edit student
          </Link>
          <Link
            className="secondary-action"
            href={`/students/${studentId}/goals/new`}
          >
            Add goal
          </Link>
          {activeGoalCount > 0 ? (
            <Link
              className="primary-action"
              href={`/students/${studentId}/sessions/new`}
            >
              Record data
            </Link>
          ) : null}
          <ArchiveStudentButton
            action={archiveStudentAction.bind(null, student.id)}
            studentName={student.displayName}
          />
        </div>
      </section>

      {goals.length === 0 ? (
        <section className="plan-empty" aria-labelledby="plan-empty-title">
          <h2 id="plan-empty-title">No goals yet</h2>
          <Link href={`/students/${studentId}/goals/new`}>
            Add the first goal
          </Link>
        </section>
      ) : (
        <ul className="goal-list" aria-label={`${student.displayName}'s goals`}>
          {goals.map((goal) => (
            <li className="goal-list-item" key={goal.id}>
              <div>
                <span>Goal area</span>
                <h2>{goal.domain}</h2>
                <p>{goal.objectiveText}</p>
                {goal.strategyName ? (
                  <div className="goal-strategy">
                    <strong>{goal.strategyName}</strong>
                    <span>{goal.strategyInstructions}</span>
                  </div>
                ) : null}
              </div>
              <div className="goal-item-actions">
                <span className="student-status">{goal.status}</span>
                <Link
                  href={`/students/${studentId}/goals/${goal.id}/edit`}
                >
                  Edit goal
                </Link>
                <Link
                  href={`/students/${studentId}/goals/${goal.id}/strategy/new`}
                >
                  {goal.strategyName ? "Change strategy" : "Add strategy"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
