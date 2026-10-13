"use server";

import { redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { createStudent } from "@/db/queries/students";
import {
  createStudentSchema,
  type StudentActionState,
} from "@/domain/student";

export async function createStudentAction(
  classroomId: string,
  _previousState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    return {
      status: "error",
      message: "You do not have permission to add students.",
    };
  }

  const parsed = createStudentSchema.safeParse({
    displayName: formData.get("displayName"),
    group: formData.get("group"),
    teacherNotes: formData.get("teacherNotes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let studentId: string;
  try {
    const { db } = await import("@/db/client");
    const student = await createStudent(db, identity, parsed.data);
    if (!student) {
      throw new Error("Student creation returned no record.");
    }
    studentId = student.id;
  } catch (error) {
    console.error("Student creation failed", error);
    return {
      status: "error",
      message: "We could not add this student. Please try again.",
    };
  }

  redirect(classroomPath(classroomId, `/students/${studentId}/goals/new`));
}
