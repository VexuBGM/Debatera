import { readFile } from "fs/promises";
import path from "path";

import { DocsBrowser } from "@/components/docs/DocsBrowser";
import { parseHelpDoc } from "@/lib/docs/help";

export async function DocsPage() {
  const guidePath = path.join(process.cwd(), "docs", "user-guide.md");
  const markdown = await readFile(guidePath, "utf8");
  const { lastUpdated, sections } = parseHelpDoc(markdown);

  return <DocsBrowser lastUpdated={lastUpdated} sections={sections} />;
}
