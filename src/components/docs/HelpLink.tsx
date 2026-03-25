import Link from "next/link";
import { BookOpen } from "lucide-react";

import { buildHelpHref } from "@/lib/docs/help";
import { cn } from "@/lib/utils";

interface HelpLinkProps {
  section: string;
  label?: string;
  className?: string;
  variant?: "pill" | "inline";
}

export function HelpLink({
  section,
  label,
  className,
  variant = "pill",
}: HelpLinkProps) {
  return (
    <Link
      href={buildHelpHref(section)}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors",
        variant === "pill"
          ? "rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand/50 hover:text-foreground"
          : "text-sm text-brand hover:text-brand/80",
        className
      )}
    >
      <BookOpen className="h-3.5 w-3.5" />
      <span>{label ?? section}</span>
    </Link>
  );
}

interface HelpTopic {
  section: string;
  label?: string;
}

interface HelpTopicsProps {
  topics: HelpTopic[];
  label?: string;
  className?: string;
}

export function HelpTopics({
  topics,
  label = "Help",
  className,
}: HelpTopicsProps) {
  if (topics.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2",
        className
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {topics.map((topic) => (
        <HelpLink
          key={`${topic.section}:${topic.label ?? topic.section}`}
          section={topic.section}
          label={topic.label}
        />
      ))}
    </div>
  );
}
