"use server";

import { redirect } from "next/navigation";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageGroups } from "@/auth/authorization";
import { classroomPath } from "@/classroom/routes";
import {
  ClassroomGroupDeletionError,
  createClassroomGroup,
  deleteClassroomGroup,
} from "@/db/queries/classroom-groups";
import {
  createClassroomGroupSchema,
  type ClassroomGroupActionState,
} from "@/domain/classroom-group";

export async function createClassroomGroupAction(
  classroomId: string,
  _previousState: ClassroomGroupActionState,
  formData: FormData,
): Promise<ClassroomGroupActionState> {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageGroups(identity)) {
    return {
      status: "error",
      message: "Only teachers can create groups.",
    };
  }

  const parsed = createClassroomGroupSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a group name.",
    };
  }

  let groupKey: string;
  try {
    const { db } = await import("@/db/client");
    const group = await createClassroomGroup(db, identity, parsed.data);
    if (!group) throw new Error("Group creation returned no record.");
    groupKey = group.key;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        status: "error",
        message: "A group with that name already exists.",
      };
    }
    console.error("Classroom group creation failed", error);
    return {
      status: "error",
      message: "We could not create this group. Please try again.",
    };
  }

  redirect(`${classroomPath(classroomId)}?group=${encodeURIComponent(groupKey)}`);
}

export async function deleteClassroomGroupAction(
  classroomId: string,
  groupKey: string,
  previousState: ClassroomGroupActionState,
  formData: FormData,
): Promise<ClassroomGroupActionState> {
  void previousState;
  void formData;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageGroups(identity)) {
    return {
      status: "error",
      message: "Only teachers can remove groups.",
    };
  }

  try {
    const { db } = await import("@/db/client");
    await deleteClassroomGroup(db, identity, groupKey);
  } catch (error) {
    if (error instanceof ClassroomGroupDeletionError) {
      const messages = {
        GROUP_NOT_EMPTY: "Move every student to another group before removing this one.",
        LAST_GROUP: "Create another group before removing the final group.",
        GROUP_NOT_FOUND: "This group has already been removed.",
      } as const;
      return { status: "error", message: messages[error.code] };
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    ) {
      return {
        status: "error",
        message: "Move every student to another group before removing this one.",
      };
    }
    console.error("Classroom group deletion failed", error);
    return {
      status: "error",
      message: "We could not remove this group. Please try again.",
    };
  }

  redirect(classroomPath(classroomId));
}
