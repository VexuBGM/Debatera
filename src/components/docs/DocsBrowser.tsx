'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Search, BookOpen, ArrowUpRight } from "lucide-react";

import type { HelpDocSection } from "@/lib/docs/help";
import { slugifyHeading } from "@/lib/docs/help";
import { cn } from "@/lib/utils";

interface DocsBrowserProps {
  lastUpdated: string | null;
  sections: HelpDocSection[];
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

export function DocsBrowser({ lastUpdated, sections }: DocsBrowserProps) {
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sections;

    return sections.filter((section) =>
      section.searchText.includes(normalizedQuery)
    );
  }, [query, sections]);

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
            Search the full Debatera guide and jump straight into the section
            you need.
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
            On This Page
          </p>
          <div className="space-y-1">
            {sections.map((section) => {
              const matches =
                !query.trim() || filteredSections.some((item) => item.id === section.id);

              return (
                <div key={section.id} className={cn(!matches && "opacity-45")}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-xl px-2 py-2 text-sm font-medium text-foreground/85 transition hover:bg-muted/60 hover:text-foreground"
                  >
                    {section.title}
                  </a>
                  {section.links.length > 0 && (
                    <div className="pb-2 pl-4">
                      {section.links.map((link) => (
                        <a
                          key={link.id}
                          href={`#${link.id}`}
                          className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                        >
                          {link.title}
                        </a>
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
                Organizers, institution admins, judges, and debaters can all use
                this guide to understand the actual workflows implemented in the
                app today.
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
          filteredSections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-20 rounded-[2rem] border border-border/60 bg-background p-6 shadow-sm sm:p-8"
            >
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
                      <table className="min-w-full border-collapse text-sm">
                        {children}
                      </table>
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
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:text-brand/80"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {section.markdown}
              </ReactMarkdown>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
