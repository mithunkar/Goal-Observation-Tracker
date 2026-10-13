CREATE TYPE "invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED');--> statement-breakpoint

CREATE TABLE "classroom_memberships" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE'::"user_status" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_memberships_primary_key" PRIMARY KEY("workspace_id","user_id")
);--> statement-breakpoint

CREATE TABLE "classroom_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'TEACHER'::"user_role" NOT NULL,
	"token_hash" text UNIQUE,
	"status" "invitation_status" DEFAULT 'PENDING'::"invitation_status" NOT NULL,
	"invited_by_user_id" uuid,
	"accepted_by_user_id" uuid,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classroom_invitations_email_normalized" CHECK ("email" = lower(trim("email"))),
	CONSTRAINT "classroom_invitations_state_consistency" CHECK (("status" = 'PENDING' and "accepted_at" is null and "accepted_by_user_id" is null and "revoked_at" is null) or ("status" = 'ACCEPTED' and "accepted_at" is not null and "accepted_by_user_id" is not null and "revoked_at" is null) or ("status" = 'REVOKED' and "revoked_at" is not null and "accepted_at" is null and "accepted_by_user_id" is null))
);--> statement-breakpoint

-- Preserve every existing user's classroom role and status before the user
-- profile becomes global.
INSERT INTO "classroom_memberships" (
	"workspace_id", "user_id", "role", "status", "joined_at", "updated_at"
)
SELECT "workspace_id", "id", "role", "status", "created_at", "updated_at"
FROM "users";--> statement-breakpoint

-- Unused entries from the original Bears allowlist remain eligible for their
-- first Google sign-in. These exceptional invitations have no token or expiry.
INSERT INTO "classroom_invitations" (
	"workspace_id", "email", "role", "token_hash", "expires_at", "created_at", "updated_at"
)
SELECT
	'f0000000-0000-4000-8000-000000000001',
	approved."email",
	'TEACHER',
	null,
	null,
	approved."created_at",
	now()
FROM "approved_emails" approved
WHERE NOT EXISTS (
	SELECT 1 FROM "users" existing WHERE existing."email" = approved."email"
);--> statement-breakpoint

CREATE UNIQUE INDEX "classroom_invitations_pending_email_unique" ON "classroom_invitations" ("workspace_id","email") WHERE "status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "classroom_invitations_email_status_index" ON "classroom_invitations" ("email","status");--> statement-breakpoint
CREATE INDEX "classroom_memberships_user_status_index" ON "classroom_memberships" ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email");--> statement-breakpoint

ALTER TABLE "classroom_memberships" ADD CONSTRAINT "classroom_memberships_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "classroom_memberships" ADD CONSTRAINT "classroom_memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "classroom_invitations" ADD CONSTRAINT "classroom_invitations_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "classroom_invitations" ADD CONSTRAINT "classroom_invitations_accepted_by_user_id_users_id_fkey" FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "classroom_invitations" ADD CONSTRAINT "classroom_invitations_inviter_foreign_key" FOREIGN KEY ("workspace_id","invited_by_user_id") REFERENCES "classroom_memberships"("workspace_id","user_id") ON DELETE RESTRICT;--> statement-breakpoint

-- Move immutable authorship constraints to classroom memberships before the
-- old workspace columns are removed from users.
ALTER TABLE "goal_revisions" DROP CONSTRAINT "goal_revisions_creator_foreign_key";--> statement-breakpoint
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_recorder_foreign_key";--> statement-breakpoint
ALTER TABLE "strategies" DROP CONSTRAINT "strategies_creator_foreign_key";--> statement-breakpoint
ALTER TABLE "goal_revisions" ADD CONSTRAINT "goal_revisions_creator_foreign_key" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "classroom_memberships"("workspace_id","user_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_recorder_foreign_key" FOREIGN KEY ("workspace_id","recorded_by_user_id") REFERENCES "classroom_memberships"("workspace_id","user_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_creator_foreign_key" FOREIGN KEY ("workspace_id","created_by_user_id") REFERENCES "classroom_memberships"("workspace_id","user_id") ON DELETE RESTRICT;--> statement-breakpoint

ALTER TABLE "users" DROP CONSTRAINT "users_workspace_id_workspaces_id_fkey";--> statement-breakpoint
DROP TABLE "approved_emails";--> statement-breakpoint
DROP TABLE "user_student_assignments";--> statement-breakpoint
DROP INDEX "users_workspace_email_unique";--> statement-breakpoint
DROP INDEX "users_workspace_id_id_unique";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_normalized" CHECK ("email" = lower(trim("email")));--> statement-breakpoint

-- The app continues to use a server-only Postgres connection. New tables are
-- not available to browser roles, while Supabase Auth can only read pending
-- invitations through the before-user-created hook.
ALTER TABLE "classroom_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "classroom_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "classroom_memberships" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "classroom_invitations" FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE "classroom_invitations" TO supabase_auth_admin;--> statement-breakpoint
CREATE POLICY "Supabase Auth reads pending invitations"
ON "classroom_invitations"
FOR SELECT
TO supabase_auth_admin
USING ("status" = 'PENDING');--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.before_user_created_allowlist(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
	requested_email text := lower(trim(event -> 'user' ->> 'email'));
	provider text := event -> 'user' -> 'app_metadata' ->> 'provider';
BEGIN
	IF provider IS DISTINCT FROM 'google' THEN
		RETURN jsonb_build_object(
			'error', jsonb_build_object(
				'http_code', 403,
				'message', 'Only Google sign-in is available for this classroom.'
			)
		);
	END IF;

	IF requested_email IS NULL OR NOT EXISTS (
		SELECT 1
		FROM public.classroom_invitations invitation
		WHERE invitation.email = requested_email
			AND invitation.status = 'PENDING'
			AND (invitation.expires_at IS NULL OR invitation.expires_at > now())
	) THEN
		RETURN jsonb_build_object(
			'error', jsonb_build_object(
				'http_code', 403,
				'message', 'Use a valid classroom invitation before signing in.'
			)
		);
	END IF;

	RETURN '{}'::jsonb;
END;
$$;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.before_user_created_allowlist(jsonb) TO supabase_auth_admin;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.before_user_created_allowlist(jsonb) FROM anon, authenticated, public;
