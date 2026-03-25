'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  LayoutGrid,
  Search,
} from "lucide-react";

import type { HelpDocSection } from "@/lib/docs/help";
import { resolveHelpHref, slugifyHeading } from "@/lib/docs/help";
import { cn } from "@/lib/utils";

interface DocsBrowserProps {
  lastUpdated: string | null;
  sections: HelpDocSection[];
  activeSectionId?: string;
}

function flattenText(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(flattenText).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    const childProps = children.props as { children?: React.ReactNode };
    return flattenText(childProps.children);
  }

  return "";
}

function DocsMarkdown({
  markdown,
  sections,
}: {
  markdown: string;
  sections: HelpDocSection[];
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => {
          const title = flattenText(children);
          return (
            <h2
              id={slugifyHeading(title)}
              className="scroll-mt-20 text-2xl font-semibold tracking-tight text-foreground"
            >
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          const title = flattenText(children);
          return (
            <h3
              id={slugifyHeading(title)}
              className="mt-8 scroll-mt-20 text-xl font-semibold text-foreground"
            >
              {children}
            </h3>
          );
        },
        p: ({ children }) => (
          <p className="mt-4 leading-7 text-foreground/90">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mt-4 list-disc space-y-2 pl-5 text-foreground/90">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-foreground/90">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mt-4 rounded-2xl border-l-4 border-brand/40 bg-brand/5 px-4 py-3 text-sm text-foreground/85">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border/70">
            <table className="min-w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50 text-left">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-border/70 px-4 py-3 font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-t border-border/60 px-4 py-3 align-top text-foreground/90">
            {children}
          </td>
        ),
        hr: () => <div className="my-8 border-t border-border/70" />,
        code: ({ className, children }) =>
          className ? (
            <code className={cn("text-sm", className)}>{children}</code>
          ) : (
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">
              {children}
            </code>
          ),
        pre: ({ children }) => <pre className="mt-5">{children}</pre>,
        a: ({ href, children }) => {
          const resolvedHref = resolveHelpHref(sections, href);

          if (resolvedHref?.startsWith("/docs/")) {
            return (
              <Link
                href={resolvedHref}
                className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:text-brand/80"
              >
                {children}
              </Link>
            );
          }

          return (
            <a
              href={resolvedHref ?? undefined}
              className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:text-brand/80"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

export function DocsBrowser({
  lastUpdated,
  sections,
  activeSectionId,
}: DocsBrowserProps) {
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sections;

    return sections.filter((section) =>
      section.searchText.includes(normalizedQuery)
    );
  }, [query, sections]);

  const selectedSection = activeSectionId
    ? sections.find((section) => section.id === activeSectionId) ?? null
    : null;

  const selectedIndex = selectedSection
    ? sections.findIndex((section) => section.id === selectedSection.id)
    : -1;
  const previousSection = selectedIndex > 0 ? sections[selectedIndex - 1] : null;
  const nextSection =
    selectedIndex >= 0 && selectedIndex < sections.length - 1
      ? sections[selectedIndex + 1]
      : null;
  const selectedSectionMarkdown = selectedSection
    ? selectedSection.markdown.replace(/^##\s+.+(?:\n\n|\n)?/, "")
    : "";

  const totalTopics = sections.reduce(
    (count, section) => count + 1 + section.links.length,
    0
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
      <aside className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
        <div className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-brand" />
            Help Center
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the full Debatera guide by workflow, then open each topic on
            its own page.
          </p>
          {lastUpdated && (
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
              Updated {lastUpdated}
            </p>
          )}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the guide"
              className="h-11 w-full rounded-2xl border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-brand/50"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {filteredSections.length} of {sections.length} sections shown, {totalTopics} topics
            total.
          </p>
        </div>

        <nav className="rounded-3xl border border-border/60 bg-background/80 p-3 shadow-sm">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Guide Sections
          </p>
          <Link
            href="/docs"
            className={cn(
              "mb-2 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition",
              !selectedSection
                ? "bg-brand/10 text-foreground"
                : "text-foreground/85 hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Overview
          </Link>
          <div className="space-y-1">
            {sections.map((section) => {
              const matches =
                !query.trim() || filteredSections.some((item) => item.id === section.id);

              return (
                <div key={section.id} className={cn(!matches && "opacity-45")}>
                  <Link
                    href={`/docs/${section.id}`}
                    className={cn(
                      "block rounded-xl px-2 py-2 text-sm font-medium transition",
                      selectedSection?.id === section.id
                        ? "bg-brand/10 text-foreground"
                        : "text-foreground/85 hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {section.title}
                  </Link>
                  {section.links.length > 0 && (
                    <div className="pb-2 pl-4">
                      {section.links.map((link) => (
                        <Link
                          key={link.id}
                          href={`/docs/${section.id}#${link.id}`}
                          className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                        >
                          {link.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </aside>

      <section className="space-y-6">
        {selectedSection ? (
          <>
            <div className="rounded-[2rem] border border-border/60 bg-linear-to-br from-background via-background to-muted/20 p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-brand/80"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    All sections
                  </Link>
                  <p className="mt-4 text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Documentation
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    {selectedSection.title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                    {selectedSection.excerpt ||
                      "Open the detailed guide for this workflow and jump between related subtopics."}
                  </p>
                </div>
                {selectedSection.links.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSection.links.map((link) => (
                      <Link
                        key={link.id}
                        href={`#${link.id}`}
                        className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-brand/50 hover:text-foreground"
                      >
                        {link.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <article className="scroll-mt-20 rounded-[2rem] border border-border/60 bg-background p-6 shadow-sm sm:p-8">
              <DocsMarkdown markdown={selectedSectionMarkdown} sections={sections} />
            </article>

            {(previousSection || nextSection) && (
              <div className="grid gap-4 md:grid-cols-2">
                {previousSection ? (
                  <Link
                    href={`/docs/${previousSection.id}`}
                    className="rounded-[2rem] border border-border/60 bg-background p-5 shadow-sm transition hover:border-brand/40 hover:bg-muted/20"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Previous
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <ArrowLeft className="h-4 w-4 text-brand" />
                      <div>
                        <p className="font-semibold text-foreground">
                          {previousSection.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {previousSection.excerpt || "Open the previous guide section."}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}

                {nextSection ? (
                  <Link
                    href={`/docs/${nextSection.id}`}
                    className="rounded-[2rem] border border-border/60 bg-background p-5 shadow-sm transition hover:border-brand/40 hover:bg-muted/20"
                  >
                    <p className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Next
                    </p>
                    <div className="mt-3 flex items-center justify-end gap-3 text-right">
                      <div>
                        <p className="font-semibold text-foreground">{nextSection.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {nextSection.excerpt || "Open the next guide section."}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-brand" />
                    </div>
                  </Link>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-[2rem] border border-border/60 bg-linear-to-br from-background via-background to-muted/20 p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                    Documentation
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Debatera User Guide
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Organizers, institution admins, judges, and debaters can all
                    browse the guide section by section and open the exact page
                    they need.
                  </p>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-brand/80"
                >
                  Back to app
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {filteredSections.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center">
                <p className="text-lg font-semibold text-foreground">No matching topics</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a role, feature, or workflow like "pairings", "portal", or
                  "standings".
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredSections.map((section, index) => (
                  <Link
                    key={section.id}
                    href={`/docs/${section.id}`}
                    className="group rounded-[2rem] border border-border/60 bg-background p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Section {index + 1}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                          {section.title}
                        </h2>
                      </div>
                      <ArrowUpRight className="mt-1 h-5 w-5 text-brand transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {section.excerpt ||
                        "Open this section for the full workflow, related steps, and reference details."}
                    </p>
                    {section.links.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {section.links.slice(0, 3).map((link) => (
                          <span
                            key={link.id}
                            className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                          >
                            {link.title}
                          </span>
                        ))}
                        {section.links.length > 3 && (
                          <span className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            +{section.links.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
