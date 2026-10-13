import { describe, expect, it } from "vitest";

import {
  assertCanViewStudent,
  AuthorizationError,
  canCreateStudentSession,
  canInviteMembers,
  canManageClassroom,
  canViewStudent,
  filterAuthorizedStudents,
  type AuthorizationActor,
} from "@/auth/authorization";
import {
  SYNTHETIC_SEED_IDS,
  syntheticSeedData,
  syntheticIdentity,
} from "@/db/seed-data";

const actor = (userId: string): AuthorizationActor => syntheticIdentity(userId);

const river = syntheticSeedData.students[0];
const micah = syntheticSeedData.students[2];
describe("student authorization", () => {
  it("allows an active teacher to view every student in the workspace", () => {
    const teacher = actor(SYNTHETIC_SEED_IDS.teacher);

    expect(
      filterAuthorizedStudents(teacher, syntheticSeedData.students),
    ).toEqual(syntheticSeedData.students);
    expect(canManageClassroom(teacher)).toBe(true);
    expect(canInviteMembers(teacher)).toBe(true);
  });

  it("gives an assistant the same classroom access without invitation rights", () => {
    const assistant = actor(SYNTHETIC_SEED_IDS.assignedAssistant);

    expect(canViewStudent(assistant, river)).toBe(true);
    expect(canViewStudent(assistant, micah)).toBe(true);
    expect(canManageClassroom(assistant)).toBe(true);
    expect(canInviteMembers(assistant)).toBe(false);
  });

  it("gives every active assistant access to the classroom roster", () => {
    const assistant = actor(SYNTHETIC_SEED_IDS.unassignedAssistant);

    expect(
      filterAuthorizedStudents(assistant, syntheticSeedData.students),
    ).toEqual(syntheticSeedData.students);
  });

  it("rejects cross-workspace access even for a teacher", () => {
    const teacher = actor(SYNTHETIC_SEED_IDS.teacher);

    expect(
      canViewStudent(
        teacher,
        { ...river, workspaceId: "90000000-0000-4000-8000-000000000001" },
      ),
    ).toBe(false);
  });

  it("rejects inactive users", () => {
    const inactiveTeacher = {
      ...actor(SYNTHETIC_SEED_IDS.teacher),
      status: "INACTIVE" as const,
    };

    expect(canViewStudent(inactiveTeacher, river)).toBe(false);
    expect(canManageClassroom(inactiveTeacher)).toBe(false);
    expect(canInviteMembers(inactiveTeacher)).toBe(false);
  });

  it("prevents new sessions for archived students", () => {
    const teacher = actor(SYNTHETIC_SEED_IDS.teacher);

    expect(
      canCreateStudentSession(
        teacher,
        { ...river, status: "ARCHIVED" },
      ),
    ).toBe(false);
  });

  it("throws a stable authorization error when access is denied", () => {
    const outsider = { ...actor(SYNTHETIC_SEED_IDS.assignedAssistant), workspaceId: "90000000-0000-4000-8000-000000000001" };

    expect(() =>
      assertCanViewStudent(outsider, micah),
    ).toThrow(AuthorizationError);
  });
});
