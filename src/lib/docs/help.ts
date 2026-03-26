export interface HelpSectionLink {
  id: string;
  title: string;
}

export interface HelpDocSection {
  id: string;
  title: string;
  excerpt: string;
  markdown: string;
  links: HelpSectionLink[];
  searchText: string;
}

export interface ParsedHelpDoc {
  lastUpdated: string | null;
  sections: HelpDocSection[];
}

export interface ResolvedHelpTarget {
  section: HelpDocSection;
  anchorId?: string;
}

export function slugifyHeading(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function buildHelpHref(section: string) {
  return `/docs/${slugifyHeading(section)}`;
}

export function findHelpTargetBySlug(
  sections: HelpDocSection[],
  slug: string
): ResolvedHelpTarget | null {
  const sectionMatch = sections.find((section) => section.id === slug);
  if (sectionMatch) {
    return { section: sectionMatch };
  }

  for (const section of sections) {
    const linkMatch = section.links.find((link) => link.id === slug);
    if (linkMatch) {
      return { section, anchorId: linkMatch.id };
    }
  }

  return null;
}

export function resolveHelpHref(
  sections: HelpDocSection[],
  href?: string | null
) {
  if (!href?.startsWith("#")) {
    return href;
  }

  const slug = href.slice(1);
  const target = findHelpTargetBySlug(sections, slug);
  if (!target) {
    return href;
  }

  return target.anchorId
    ? `/docs/${target.section.id}#${target.anchorId}`
    : `/docs/${target.section.id}`;
}

export function parseHelpDoc(markdown: string): ParsedHelpDoc {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const lastUpdatedLine = lines.find((line) =>
    line.trim().toLowerCase().startsWith("> last updated:")
  );

  const headingIndexes = lines.reduce<number[]>((indexes, line, index) => {
    if (/^##\s+/.test(line)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  const sections = headingIndexes
    .map((startIndex, index) => {
      const endIndex = headingIndexes[index + 1] ?? lines.length;
      const title = lines[startIndex].replace(/^##\s+/, "").trim();
      if (/^table of contents$/i.test(title)) {
        return null;
      }
      const body = lines.slice(startIndex + 1, endIndex).join("\n").trim();
      const markdownBlock = `## ${title}\n\n${body}`.trim();
      const links = Array.from(markdownBlock.matchAll(/^###\s+(.+)$/gm)).map(
        (headingMatch) => {
          const heading = headingMatch[1].trim();
          return { id: slugifyHeading(heading), title: heading };
        }
      );

      const excerptSource = body
        .split("\n")
        .map((line) => line.trim())
        .find(
          (line) =>
            line &&
            !line.startsWith("#") &&
            !line.startsWith("- ") &&
            !line.startsWith("* ") &&
            !/^\d+\.\s/.test(line) &&
            !line.startsWith("|") &&
            !line.startsWith(">") &&
            !line.startsWith("---")
        );

      return {
        id: slugifyHeading(title),
        title,
        excerpt: excerptSource ?? "",
        markdown: markdownBlock,
        links,
        searchText: `${title}\n${body}`.toLowerCase(),
      } satisfies HelpDocSection;
    })
    .filter((section): section is HelpDocSection => section !== null);

  return {
    lastUpdated: lastUpdatedLine
      ? lastUpdatedLine.replace(/^>\s*last updated:\s*/i, "").trim()
      : null,
    sections,
  };
}
