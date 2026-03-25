import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type RoundStatus = "DRAFT" | "PUBLISHED" | "IN_PROGRESS" | "COMPLETED";

const STATUS_VARIANTS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
} as const;

const STATUS_LABELS = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
} as const;

const STATUS_DESCRIPTIONS = {
  DRAFT: "Organizer-only setup stage. Pairings and motion can still be edited.",
  PUBLISHED: "Participants can see pairings and motion, but ballot entry is not open yet.",
  IN_PROGRESS: "Debates are live and judges can enter and submit ballots.",
  COMPLETED: "The round is finalized and standings can update from its results.",
} as const;

interface RoundStatusBadgeProps {
  status: RoundStatus;
  showChevron?: boolean;
  className?: string;
}

export function getRoundStatusLabel(status: RoundStatus) {
  return STATUS_LABELS[status];
}

export function getRoundStatusDescription(status: RoundStatus) {
  return STATUS_DESCRIPTIONS[status];
}

export function RoundStatusBadge({
  status,
  showChevron = false,
  className,
}: RoundStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={className}
      title={STATUS_DESCRIPTIONS[status]}
      aria-label={`${STATUS_LABELS[status]}: ${STATUS_DESCRIPTIONS[status]}`}
    >
      {STATUS_LABELS[status]}
      {showChevron && <ChevronDown className="ml-1 h-3 w-3" />}
    </Badge>
  );
}
