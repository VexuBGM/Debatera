import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { cache } from "react";

import { parseHelpDoc } from "@/lib/docs/help";

export const getHelpDoc = cache(async () => {
  const guidePath = path.join(process.cwd(), "docs", "user-guide.md");
  const markdown = await readFile(guidePath, "utf8");
  return parseHelpDoc(markdown);
});
