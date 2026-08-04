ALTER TABLE "skill" DROP CONSTRAINT "skill_slug_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "skill_owner_user_id_slug_idx" ON "skill" USING btree ("owner_user_id","slug");