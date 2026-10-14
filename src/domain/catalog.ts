import { z } from "zod";

export const DEFAULT_STUDENT_GROUPS = [
  { key: "AM_MW", name: "AM (M/W)", position: 0 },
  { key: "AM_TTH", name: "AM (T/Th)", position: 1 },
  { key: "PM", name: "PM", position: 2 },
] as const;

export type StudentGroup = string;

export const GOAL_AREAS = [
  "Social Communication",
  "Social Emotional",
  "Fine Motor",
  "Gross Motor",
  "Adaptive",
  "Cognitive",
  "Receptive Communication",
  "Focus",
] as const;
export type GoalArea = (typeof GOAL_AREAS)[number];

// Database columns retain their original domain/skill-area names for
// compatibility. New UI and application code should use GoalArea.
export const SKILL_AREAS = GOAL_AREAS;
export type SkillArea = GoalArea;

export const studentGroupSchema = z
  .string()
  .trim()
  .min(1, "Choose a schedule group.")
  .max(80, "The selected schedule group is invalid.");
export const goalAreaSchema = z.enum(GOAL_AREAS);
export const skillAreaSchema = goalAreaSchema;
