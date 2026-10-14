"use server";

import { redirect } from "next/navigation";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageGroups } from "@/auth/authorization";
import { classroomPath } from "@/classroom/routes";
import { createClassroomGroup } from "@/db/queries/classroom-groups";
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
