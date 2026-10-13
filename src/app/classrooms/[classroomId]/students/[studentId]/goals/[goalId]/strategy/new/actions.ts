"use server";

import { redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { findAuthorizedStudent } from "@/db/queries/students";
import {
  createAndAssignStrategy,
  findAuthorizedGoal,
} from "@/db/queries/strategies";
import { dateInTimeZone } from "@/domain/goal";
import {
  assignStrategySchema,
  type StrategyActionState,
} from "@/domain/strategy";

export async function assignStrategyAction(
  classroomId: string,
  studentId: string,
  goalId: string,
  existingStrategyId: string | undefined,
  _previousState: StrategyActionState,
  formData: FormData,
): Promise<StrategyActionState> {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    return {
      status: "error",
      message: "You do not have permission to assign strategies.",
    };
  }

  const parsed = assignStrategySchema.safeParse({
    name: formData.get("name"),
    instructions: formData.get("instructions"),
    fidelityPrompt: formData.get("fidelityPrompt"),
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

    const goal = await findAuthorizedGoal(db, identity, student, goalId);
    if (!goal || goal.status !== "ACTIVE") {
      return { status: "error", message: "This goal is not available." };
    }

    const assignment = await createAndAssignStrategy(
      db,
      identity,
      student,
      goal,
      parsed.data,
      dateInTimeZone(
        new Date(),
        process.env.DEFAULT_WORKSPACE_TIMEZONE ?? "America/Los_Angeles",
      ),
      existingStrategyId,
    );
    if (!assignment) {
      throw new Error("Strategy assignment returned no record.");
    }
  } catch (error) {
    console.error("Strategy assignment failed", error);
    return {
      status: "error",
      message: "We could not assign this strategy. Please try again.",
    };
  }

  redirect(classroomPath(classroomId, `/students/${studentId}`));
}
