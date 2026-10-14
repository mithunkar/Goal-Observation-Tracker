import Link from "next/link";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { signOut } from "@/app/sign-in/actions";
import { canManageGroups } from "@/auth/authorization";
import { loadAuthorizedStudentRoster } from "@/data/student-roster";
import { classroomPath } from "@/classroom/routes";
import { ClassroomSwitcher } from "../classroom-switcher";
import { createClassroomGroupAction } from "./actions";
import { CreateGroupFolder } from "./create-group-folder";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params, searchParams }: { params: Promise<{ classroomId: string }>; searchParams: Promise<{ group?: string }> }) {
  const { classroomId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  const [roster, query] = await Promise.all([loadAuthorizedStudentRoster(identity), searchParams]);
  const selectedGroup = roster.groups.some((group) => group.key === query.group)
    ? query.group
    : roster.groups[0]?.key;
  const selectedGroupName = roster.groups.find(
    (group) => group.key === selectedGroup,
  )?.name;
  const groupCounts = new Map<string, number>();
  for (const student of roster.students) {
    groupCounts.set(student.group, (groupCounts.get(student.group) ?? 0) + 1);
  }
  const visibleStudents = selectedGroup
    ? roster.students.filter((student) => student.group === selectedGroup)
    : [];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <Link className="demo-brand" href={classroomPath(classroomId)} aria-label="Student roster">
          <span className="brand-mark" aria-hidden="true">
            GOT
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
        {roster.groups.map((group) => {
          const count = groupCounts.get(group.key) ?? 0;
          return (
            <Link
              key={group.key}
              href={`${classroomPath(classroomId)}?group=${encodeURIComponent(group.key)}`}
              className="group-folder"
              aria-current={selectedGroup === group.key ? "page" : undefined}
              data-selected={selectedGroup === group.key}
            >
              <span aria-hidden="true">▰</span>
              <strong>{group.name}</strong>
              <small>{count} {count === 1 ? "student" : "students"}</small>
            </Link>
          );
        })}
        {canManageGroups(identity) ? (
          <CreateGroupFolder
            action={createClassroomGroupAction.bind(null, classroomId)}
          />
        ) : null}
      </nav>

      {roster.students.length === 0 ? (
        <section className="roster-empty" aria-labelledby="roster-empty-title">
          <span aria-hidden="true">0</span>
          <h2 id="roster-empty-title">No students yet</h2>
          <p>Add your first student to begin collecting data.</p>
        </section>
      ) : visibleStudents.length === 0 ? (
        <section className="roster-empty"><span aria-hidden="true">0</span><h2>No students in {selectedGroupName ?? "this group"}</h2><p>Add a student or choose another schedule group.</p></section>
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
