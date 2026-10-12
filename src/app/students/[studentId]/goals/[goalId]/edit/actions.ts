"use server";

import { redirect } from "next/navigation";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { updateGoal } from "@/db/queries/goals";
import { findAuthorizedStudent } from "@/db/queries/students";
import { updateGoalSchema, type GoalActionState } from "@/domain/goal";

export async function updateGoalAction(studentId: string, goalId: string, _previousState: GoalActionState, formData: FormData): Promise<GoalActionState> {
  const identity = await requireCurrentApplicationIdentity();
  if (!canManageClassroom(identity)) return { status: "error", message: "You do not have permission to edit goals." };
  const parsed = updateGoalSchema.safeParse({
    goalArea: formData.get("goalArea"), objectiveText: formData.get("objectiveText"), targetScore: formData.get("targetScore"), status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const { db } = await import("@/db/client");
  const student = await findAuthorizedStudent(db, identity, studentId);
  if (!student) return { status: "error", message: "This student is not available." };
  const goal = await updateGoal(db, identity, student, goalId, parsed.data);
  if (!goal) return { status: "error", message: "This goal is not available." };
  redirect(`/students/${studentId}`);
}
