import { z } from "zod";
import { goalAreaSchema } from "@/domain/catalog";

const targetScoreSchema = z
  .union([z.literal(""), z.enum(["0", "1", "2", "3", "4"])])
  .transform((value) => (value === "" ? null : Number(value)));

const goalFieldsSchema = z.object({
  goalArea: goalAreaSchema,
  objectiveText: z
    .string()
    .trim()
    .min(5, "Describe what the student should do.")
    .max(1000, "Objective must be 1,000 characters or fewer."),
  targetScore: targetScoreSchema,
});

function withCompatibilityFields<T extends z.output<typeof goalFieldsSchema>>(
  value: T,
) {
  const { goalArea, ...fields } = value;
  return { ...fields, title: goalArea, domain: goalArea };
}

export const createGoalSchema = goalFieldsSchema.transform(
  withCompatibilityFields,
);

export type CreateGoalInput = z.output<typeof createGoalSchema>;

export const updateGoalSchema = goalFieldsSchema
  .extend({ status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]) })
  .transform(withCompatibilityFields);
export type UpdateGoalInput = z.output<typeof updateGoalSchema>;

export type GoalActionState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string[]>;
};

export const initialGoalActionState: GoalActionState = {
  status: "idle",
};

export function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
