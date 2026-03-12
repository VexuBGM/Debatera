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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScoreInput } from './ScoreInput';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface TeamMember {
  id: string;
  participantId: string;
  name: string;
}

interface SpeechCardProps {
  role: string;
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
  role,
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
  const [commentOpen, setCommentOpen] = useState(!!comment);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border space-y-2',
        side === 'PROPOSITION'
          ? 'border-blue-500/30 bg-blue-500/5'
          : 'border-red-500/30 bg-red-500/5'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{roleLabel}</span>
          {isReply && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                side === 'PROPOSITION'
                  ? 'border-blue-400/50 text-blue-400'
                  : 'border-red-400/50 text-red-400'
              )}
            >
              Reply
            </Badge>
          )}
        </div>
      </div>

      {/* Speaker Selection */}
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
            <SelectTrigger className="mt-1 h-8 text-sm">
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
            className="mt-1 h-8 text-sm"
          />
        )}
      </div>

      {/* Score */}
      <ScoreInput
        value={score}
        onChange={onScoreChange}
        min={scoreMin}
        max={scoreMax}
        disabled={disabled}
        label="Score"
      />

      {/* Collapsible Comment */}
      <Collapsible open={commentOpen} onOpenChange={setCommentOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={cn('h-3 w-3 transition-transform', commentOpen && 'rotate-180')} />
          Comment
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Input
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={disabled}
            className="mt-1 h-8 text-sm"
            placeholder="Optional feedback"
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
