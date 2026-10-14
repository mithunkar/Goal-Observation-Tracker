import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StudentForm } from "../../new/student-form";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { classroomPath } from "@/classroom/routes";
import { listClassroomGroups } from "@/db/queries/classroom-groups";
import { findAuthorizedStudent } from "@/db/queries/students";
import { updateStudentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: Promise<{ classroomId: string; studentId: string }> }) {
  const { classroomId, studentId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) redirect(classroomPath(classroomId));
  const { db } = await import("@/db/client");
  const [student, groups] = await Promise.all([
    findAuthorizedStudent(db, identity, studentId),
    listClassroomGroups(db, identity),
  ]);
  if (!student) notFound();
  return (
    <main className="auth-shell onboarding-shell">
      <Link className="back-link" href={classroomPath(classroomId, `/students/${studentId}`)}>← {student.displayName}</Link>
      <section className="auth-surface" aria-labelledby="edit-student-title">
        <div className="auth-heading"><h1 id="edit-student-title">Edit student</h1></div>
        <StudentForm action={updateStudentAction.bind(null, classroomId, studentId)} groups={groups} submitLabel="Save changes" initialStudent={student} />
      </section>
    </main>
  );
}
