export type AuthorizationActor = {
  id: string;
  workspaceId: string;
  role: "TEACHER" | "ASSISTANT";
  status: "ACTIVE" | "INACTIVE";
};

export type StudentAuthorizationScope = {
  id: string;
  workspaceId: string;
  status: "ACTIVE" | "ARCHIVED";
};

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN";

  constructor() {
    super("The current user is not authorized for this action.");
    this.name = "AuthorizationError";
  }
}

const isActiveActor = (
  actor: AuthorizationActor | null,
): actor is AuthorizationActor => actor?.status === "ACTIVE";

export function canViewStudent(
  actor: AuthorizationActor | null,
  student: StudentAuthorizationScope,
) {
  return isActiveActor(actor) && actor.workspaceId === student.workspaceId;
}

export function canCreateStudentSession(
  actor: AuthorizationActor | null,
  student: StudentAuthorizationScope,
) {
  return (
    student.status === "ACTIVE" &&
    canViewStudent(actor, student)
  );
}

export function canManageClassroom(actor: AuthorizationActor | null) {
  return isActiveActor(actor);
}

export function canInviteMembers(actor: AuthorizationActor | null) {
  return isActiveActor(actor) && actor.role === "TEACHER";
}

export function canManageGroups(actor: AuthorizationActor | null) {
  return isActiveActor(actor) && actor.role === "TEACHER";
}

export function assertCanViewStudent(
  actor: AuthorizationActor | null,
  student: StudentAuthorizationScope,
) {
  if (!canViewStudent(actor, student)) {
    throw new AuthorizationError();
  }
}

export function filterAuthorizedStudents<
  Student extends StudentAuthorizationScope,
>(
  actor: AuthorizationActor | null,
  students: readonly Student[],
) {
  return students.filter((student) =>
    canViewStudent(actor, student),
  );
}
