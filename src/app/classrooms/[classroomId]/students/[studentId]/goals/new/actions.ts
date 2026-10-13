"use server";

import { redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { createGoal } from "@/db/queries/goals";
import { findAuthorizedStudent } from "@/db/queries/students";
import {
  createGoalSchema,
  dateInTimeZone,
  type GoalActionState,
} from "@/domain/goal";

export async function createGoalAction(
  classroomId: string,
  studentId: string,
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    return {
      status: "error",
      message: "You do not have permission to add goals.",
    };
  }

  const parsed = createGoalSchema.safeParse({
    goalArea: formData.get("goalArea"),
    objectiveText: formData.get("objectiveText"),
    targetScore: formData.get("targetScore"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const { db } = await import("@/db/client");
    const student = await findAuthorizedStudent(db, identity, studentId);
    if (!student || student.status !== "ACTIVE") {
      return { status: "error", message: "This student is not available." };
    }

    const goal = await createGoal(
      db,
      identity,
      student,
      parsed.data,
      dateInTimeZone(
        new Date(),
        process.env.DEFAULT_WORKSPACE_TIMEZONE ?? "America/Los_Angeles",
      ),
    );
    if (!goal) {
      throw new Error("Goal creation returned no record.");
    }
  } catch (error) {
    console.error("Goal creation failed", error);
    return {
      status: "error",
      message: "We could not add this goal. Please try again.",
    };
  }

  redirect(classroomPath(classroomId, `/students/${studentId}`));
}
