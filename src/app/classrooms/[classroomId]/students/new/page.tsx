import Link from "next/link";
import { redirect } from "next/navigation";

import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";

import { createStudentAction } from "./actions";
import { StudentForm } from "./student-form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) {
    redirect(classroomPath(classroomId));
  }

  return (
    <main className="auth-shell onboarding-shell">
      <Link className="back-link" href={classroomPath(classroomId)}>
        ← Students
      </Link>
      <section className="auth-surface" aria-labelledby="new-student-title">
        <div className="auth-heading">
          <h1 id="new-student-title">Add a student</h1>
        </div>
        <StudentForm action={createStudentAction.bind(null, classroomId)} />
      </section>
    </main>
  );
}
