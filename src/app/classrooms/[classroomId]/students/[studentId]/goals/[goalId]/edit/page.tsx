import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GoalForm } from "../../new/goal-form";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { classroomPath } from "@/classroom/routes";
import { listStudentGoals } from "@/db/queries/goals";
import { findAuthorizedStudent } from "@/db/queries/students";
import { updateGoalAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditGoalPage({ params }: { params: Promise<{ classroomId: string; studentId: string; goalId: string }> }) {
  const { classroomId, studentId, goalId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) redirect(classroomPath(classroomId));
  const { db } = await import("@/db/client");
  const student = await findAuthorizedStudent(db, identity, studentId);
  if (!student) notFound();
  const goal = (await listStudentGoals(db, identity, student)).find((candidate) => candidate.id === goalId);
  if (!goal) notFound();
  return <main className="auth-shell onboarding-shell"><Link className="back-link" href={classroomPath(classroomId, `/students/${studentId}`)}>← {student.displayName}</Link><section className="auth-surface" aria-labelledby="edit-goal-title"><div className="auth-heading"><h1 id="edit-goal-title">Edit goal</h1></div><GoalForm action={updateGoalAction.bind(null, classroomId, studentId, goalId)} submitLabel="Save changes" initialGoal={{ ...goal, status: goal.status === "DRAFT" ? "PAUSED" : goal.status }} /></section></main>;
}
