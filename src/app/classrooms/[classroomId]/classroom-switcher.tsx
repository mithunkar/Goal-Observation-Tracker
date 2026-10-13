import Link from "next/link";

import { getApplicationMemberships } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";

export async function ClassroomSwitcher({
  classroomId,
  classroomName,
}: {
  classroomId: string;
  classroomName: string;
}) {
  const memberships = (await getApplicationMemberships()).filter(
    (membership) => membership.status === "ACTIVE",
  );

  if (memberships.length < 2) {
    return <span className="classroom-name">{classroomName}</span>;
  }

  return (
    <details className="classroom-switcher">
      <summary>{classroomName}</summary>
      <nav aria-label="Switch classroom">
        {memberships.map((membership) => (
          <Link
            aria-current={membership.workspaceId === classroomId ? "page" : undefined}
            href={classroomPath(membership.workspaceId)}
            key={membership.workspaceId}
          >
            {membership.workspaceName}
          </Link>
        ))}
      </nav>
    </details>
  );
}
