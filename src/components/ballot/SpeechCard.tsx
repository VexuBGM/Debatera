'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScoreInput } from './ScoreInput';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  participantId: string;
  name: string;
}

interface SpeechCardProps {
  roleLabel: string;
  side: 'PROPOSITION' | 'OPPOSITION';
  isReply: boolean;
  scoreMin: number;
  scoreMax: number;
  members: TeamMember[];
  speakerId: string | null;
  speakerName: string | null;
  score: string;
  comment: string;
  disabled?: boolean;
  onSpeakerChange: (speakerId: string | null, speakerName: string | null) => void;
  onScoreChange: (score: string) => void;
  onCommentChange: (comment: string) => void;
}

export function SpeechCard({
  roleLabel,
  side,
  isReply,
  scoreMin,
  scoreMax,
  members,
  speakerId,
  speakerName,
  score,
  comment,
  disabled,
  onSpeakerChange,
  onScoreChange,
  onCommentChange,
}: SpeechCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-background/80 p-4 shadow-sm space-y-4',
        side === 'PROPOSITION'
          ? 'border-sky-500/25 shadow-sky-500/5'
          : 'border-rose-500/25 shadow-rose-500/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{roleLabel}</span>
            {isReply && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1.5 py-0',
                  side === 'PROPOSITION'
                    ? 'border-sky-400/50 text-sky-600 dark:text-sky-300'
                    : 'border-rose-400/50 text-rose-600 dark:text-rose-300'
                )}
              >
                Reply
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isReply
              ? 'Assign the first or second speaker from this side, then enter the reply score.'
              : 'Assign a speaker and enter the speech score.'}
          </p>
        </div>

        <Badge variant="outline" className="border-border/70 bg-background/70 font-medium">
          {scoreMin}-{scoreMax}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <div>
          <Label className="text-xs text-muted-foreground">Speaker</Label>
          {members.length > 0 ? (
            <Select
              value={speakerId || ''}
              onValueChange={(v) => {
                const member = members.find((m) => m.id === v);
                onSpeakerChange(v || null, member?.name || null);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="mt-1 h-9 text-sm">
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Speaker name"
              value={speakerName || ''}
              onChange={(e) => onSpeakerChange(null, e.target.value)}
              disabled={disabled}
              className="mt-1 h-9 text-sm"
            />
          )}
        </div>

        <ScoreInput
          value={score}
          onChange={onScoreChange}
          min={scoreMin}
          max={scoreMax}
          disabled={disabled}
          label="Score"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Comment</Label>
        <Input
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          disabled={disabled}
          className="mt-1 h-9 text-sm"
          placeholder="Optional note"
        />
      </div>
    </div>
  );
}
