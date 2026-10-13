import Link from "next/link";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { signOut } from "@/app/sign-in/actions";
import { loadAuthorizedStudentRoster } from "@/data/student-roster";
import { STUDENT_GROUP_LABELS, STUDENT_GROUPS, type StudentGroup } from "@/domain/catalog";
import { classroomPath } from "@/classroom/routes";
import { ClassroomSwitcher } from "../classroom-switcher";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ classroomId: string }>; searchParams: Promise<{ group?: string }> }) {
  const { classroomId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  const [roster, query] = await Promise.all([loadAuthorizedStudentRoster(identity), searchParams]);
  const selectedGroup = STUDENT_GROUPS.includes(query.group as StudentGroup)
    ? (query.group as StudentGroup)
    : STUDENT_GROUPS[0];
  const groupCounts = Object.fromEntries(STUDENT_GROUPS.map((group) => [group, roster.students.filter((student) => student.group === group).length])) as Record<StudentGroup, number>;
  const visibleStudents = roster.students.filter((student) => student.group === selectedGroup);

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="demo-brand" href={classroomPath(classroomId)} aria-label="Student roster">
          <span className="brand-mark" aria-hidden="true">
            GO
          </span>
          <span>Goal Observation Tracker</span>
        </Link>
        <ClassroomSwitcher classroomId={classroomId} classroomName={identity.workspaceName} />
        <div className="dashboard-account">
          <span>
            <strong>{identity.displayName}</strong>
            <small>{identity.role === "TEACHER" ? "Teacher" : "Assistant"}</small>
          </span>
          <form action={signOut}>
            <button className="dashboard-sign-out" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="roster-heading" aria-labelledby="roster-title">
        <div>
          <h1 id="roster-title">Your students</h1>
        </div>
        <div className="roster-tools">
          <Link className="secondary-action" href={classroomPath(classroomId, "/dashboard/analytics")}>Classroom insights</Link>
          {identity.role === "TEACHER" ? <Link className="secondary-action" href={classroomPath(classroomId, "/staff")}>Staff</Link> : null}
          <Link className="add-student-link" href={classroomPath(classroomId, "/students/new")}>
            Add student
          </Link>
          <div className="roster-count">
            <strong>{roster.students.length}</strong>
            <span>
              {roster.students.length === 1 ? "student" : "students"}
            </span>
          </div>
        </div>
      </section>

      <nav className="group-folders" aria-label="Student schedule groups">
        {STUDENT_GROUPS.map((group) => (
          <Link key={group} href={`${classroomPath(classroomId)}?group=${group}`} className="group-folder" aria-current={selectedGroup === group ? "page" : undefined} data-selected={selectedGroup === group}>
            <span aria-hidden="true">▰</span><strong>{STUDENT_GROUP_LABELS[group]}</strong><small>{groupCounts[group]} {groupCounts[group] === 1 ? "student" : "students"}</small>
          </Link>
        ))}
      </nav>

      {roster.students.length === 0 ? (
        <section className="roster-empty" aria-labelledby="roster-empty-title">
          <span aria-hidden="true">0</span>
          <h2 id="roster-empty-title">No students yet</h2>
          <p>Add your first student to begin collecting data.</p>
        </section>
      ) : visibleStudents.length === 0 ? (
        <section className="roster-empty"><span aria-hidden="true">0</span><h2>No students in {STUDENT_GROUP_LABELS[selectedGroup]}</h2><p>Add a student or choose another schedule group.</p></section>
      ) : (
        <ul className="student-roster" aria-label="Authorized students">
          {visibleStudents.map((student) => (
            <li key={student.id}>
              <Link
                className="student-roster-card"
                href={classroomPath(classroomId, `/students/${student.id}`)}
                aria-label={`Open ${student.displayName}`}
              >
                <span className="student-avatar" aria-hidden="true">
                  {student.displayName.slice(0, 1)}
                </span>
                <div>
                  <h2>{student.displayName}</h2>
                </div>
                <span className="student-status">{student.status}</span>
                <span className="student-card-action">
                  Open <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
