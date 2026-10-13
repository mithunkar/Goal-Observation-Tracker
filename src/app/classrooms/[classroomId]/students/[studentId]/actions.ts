"use server";

import { redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { archiveStudent } from "@/db/queries/students";

export async function archiveStudentAction(classroomId: string, studentId: string) {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    redirect(classroomPath(classroomId));
  }

  const { db } = await import("@/db/client");
  await archiveStudent(db, identity, studentId);
  redirect(classroomPath(classroomId));
}
