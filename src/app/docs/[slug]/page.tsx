import { notFound, redirect } from "next/navigation";

import { DocsPage } from "@/components/docs/DocsPage";
import { getHelpDoc } from "@/lib/docs/content";
import { findHelpTargetBySlug } from "@/lib/docs/help";

interface DocsSectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { sections } = await getHelpDoc();

  return sections.map((section) => ({
    slug: section.id,
  }));
}

export default async function DocsSectionPage({
  params,
}: DocsSectionPageProps) {
  const { slug } = await params;
  const { sections } = await getHelpDoc();
  const target = findHelpTargetBySlug(sections, slug);

  if (!target) {
    notFound();
  }

  if (target.anchorId) {
    redirect(`/docs/${target.section.id}#${target.anchorId}`);
  }

  return <DocsPage activeSectionId={target.section.id} />;
}
