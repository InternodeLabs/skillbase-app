CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profile_username_unique" UNIQUE("username")
);
