import slugify from "slugify";

/** File-stem slug for a skill name (unique per owner, not globally). */
export function skillSlugFromName(name: string): string {
  return slugify(name.trim(), { lower: true, strict: true }) || "skill";
}
