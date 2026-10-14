import { z } from "zod";

export const createClassroomGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a group name.")
    .max(40, "Group names must be 40 characters or fewer."),
});

export type CreateClassroomGroupInput = z.output<
  typeof createClassroomGroupSchema
>;

export type ClassroomGroupActionState = {
  status: "idle" | "error";
  message?: string;
};

export const initialClassroomGroupActionState: ClassroomGroupActionState = {
  status: "idle",
};
