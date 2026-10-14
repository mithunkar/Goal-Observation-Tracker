"use server";

import { redirect } from "next/navigation";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { classroomPath } from "@/classroom/routes";
import { classroomGroupExists } from "@/db/queries/classroom-groups";
import { updateStudent } from "@/db/queries/students";
import { updateStudentSchema, type StudentActionState } from "@/domain/student";

export async function updateStudentAction(
  classroomId: string,
  studentId: string,
  _previousState: StudentActionState,
  formData: FormData,
): Promise<StudentActionState> {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    return { status: "error", message: "You do not have permission to edit students." };
  }
  const parsed = updateStudentSchema.safeParse({
    displayName: formData.get("displayName"),
    group: formData.get("group"),
    teacherNotes: formData.get("teacherNotes"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }
  const { db } = await import("@/db/client");
  if (!(await classroomGroupExists(db, identity, parsed.data.group))) {
    return { status: "error", message: "Choose a group from this classroom." };
  }
  const student = await updateStudent(db, identity, studentId, parsed.data);
  if (!student) return { status: "error", message: "This student is not available." };
  redirect(classroomPath(classroomId, `/students/${studentId}`));
}
