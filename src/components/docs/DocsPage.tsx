import { DocsBrowser } from "@/components/docs/DocsBrowser";
import { getHelpDoc } from "@/lib/docs/content";

interface DocsPageProps {
  activeSectionId?: string;
}

export async function DocsPage({ activeSectionId }: DocsPageProps = {}) {
  const { lastUpdated, sections } = await getHelpDoc();

  return (
    <DocsBrowser
      lastUpdated={lastUpdated}
      sections={sections}
      activeSectionId={activeSectionId}
    />
  );
}
