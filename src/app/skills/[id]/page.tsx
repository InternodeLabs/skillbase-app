import type { Metadata } from "next";

import {
  SkillDetailView,
  skillDetailMetadata,
} from "@/components/SkillDetailView";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string | string[]; code?: string | string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const query = await searchParams;
  return skillDetailMetadata(id, query);
}

export default async function SkillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return <SkillDetailView skillId={id} searchParams={query} />;
}
