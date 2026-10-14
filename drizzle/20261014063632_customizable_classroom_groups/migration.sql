ALTER TYPE "skill_area" ADD VALUE 'Focus';--> statement-breakpoint
CREATE TABLE "classroom_groups" (
	"workspace_id" uuid,
	"key" text,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_groups_primary_key" PRIMARY KEY("workspace_id","key"),
	CONSTRAINT "classroom_groups_name_valid" CHECK ("name" = trim("name") and char_length("name") between 1 and 40),
	CONSTRAINT "classroom_groups_position_nonnegative" CHECK ("position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "group" SET DATA TYPE text USING "group"::text;--> statement-breakpoint
-- Preserve the current schedule folders for every classroom before adding the
-- student-to-group foreign key. This also gives classrooms without students
-- the same useful starting folders.
INSERT INTO "classroom_groups" (
	"workspace_id", "key", "name", "position"
)
SELECT
	workspace."id",
	default_group."key",
	default_group."name",
	default_group."position"
FROM "workspaces" workspace
CROSS JOIN (
	VALUES
		('AM_MW', 'AM (M/W)', 0),
		('AM_TTH', 'AM (T/Th)', 1),
		('PM', 'PM', 2)
) AS default_group("key", "name", "position");--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_groups_workspace_name_unique" ON "classroom_groups" ("workspace_id",lower("name"));--> statement-breakpoint
ALTER TABLE "classroom_groups" ADD CONSTRAINT "classroom_groups_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "classroom_groups" ADD CONSTRAINT "classroom_groups_creator_foreign_key" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "classroom_memberships"("workspace_id","user_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_group_foreign_key" FOREIGN KEY ("workspace_id","group") REFERENCES "classroom_groups"("workspace_id","key") ON DELETE RESTRICT;--> statement-breakpoint
DROP TYPE "student_group";--> statement-breakpoint
-- The application reads and writes groups through its server-only Postgres
-- connection. Keep the table closed to Supabase browser roles.
ALTER TABLE "classroom_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "classroom_groups" FROM anon, authenticated;
