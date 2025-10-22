'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical,
  Users,
  Gavel,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
}

interface Judge {
  id: string;
  username: string;
}

interface DebateAssignment {
  id: string;
  room?: string;
  propTeam: Team | null;
  oppTeam: Team | null;
  judges: Judge[];
  warnings: string[];
}

interface RoundBuilderProps {
  debates: DebateAssignment[];
  availableJudges: Judge[];
  isPublished: boolean;
  onSaveDraft: (debates: DebateAssignment[]) => Promise<void>;
  onReset: () => void;
  onConfirm: () => Promise<void>;
}

export function RoundBuilder({
  debates: initialDebates,
  availableJudges,
  isPublished,
  onSaveDraft,
  onReset,
  onConfirm,
}: RoundBuilderProps) {
  const [debates, setDebates] = useState<DebateAssignment[]>(initialDebates);
  const [draggedItem, setDraggedItem] = useState<{
    type: 'team' | 'judge';
    data: Team | Judge;
    fromDebateId?: string;
    side?: 'PROP' | 'OPP';
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleTeamDragStart = (
    team: Team,
    debateId: string,
    side: 'PROP' | 'OPP'
  ) => {
    setDraggedItem({ type: 'team', data: team, fromDebateId: debateId, side });
  };

  const handleJudgeDragStart = (judge: Judge, debateId?: string) => {
    setDraggedItem({ type: 'judge', data: judge, fromDebateId: debateId });
  };

  const handleDrop = (targetDebateId: string, targetSide?: 'PROP' | 'OPP') => {
    if (!draggedItem) return;

    setDebates((prev) => {
      const newDebates = [...prev];

      if (draggedItem.type === 'team' && targetSide) {
        // Remove team from source debate
        if (draggedItem.fromDebateId) {
          const sourceDebate = newDebates.find(
            (d) => d.id === draggedItem.fromDebateId
          );
          if (sourceDebate) {
            if (draggedItem.side === 'PROP') {
              sourceDebate.propTeam = null;
            } else {
              sourceDebate.oppTeam = null;
            }
          }
        }

        // Add team to target debate
        const targetDebate = newDebates.find((d) => d.id === targetDebateId);
        if (targetDebate) {
          if (targetSide === 'PROP') {
            targetDebate.propTeam = draggedItem.data as Team;
          } else {
            targetDebate.oppTeam = draggedItem.data as Team;
          }
        }
      } else if (draggedItem.type === 'judge') {
        // Remove judge from source
        if (draggedItem.fromDebateId) {
          const sourceDebate = newDebates.find(
            (d) => d.id === draggedItem.fromDebateId
          );
          if (sourceDebate) {
            sourceDebate.judges = sourceDebate.judges.filter(
              (j) => j.id !== (draggedItem.data as Judge).id
            );
          }
        }

        // Add judge to target
        const targetDebate = newDebates.find((d) => d.id === targetDebateId);
        if (targetDebate) {
          const judgeExists = targetDebate.judges.some(
            (j) => j.id === (draggedItem.data as Judge).id
          );
          if (!judgeExists) {
            targetDebate.judges.push(draggedItem.data as Judge);
          }
        }
      }

      return newDebates;
    });

    setDraggedItem(null);
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await onSaveDraft(debates);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
    } finally {
      setConfirming(false);
    }
  };

  const swapSides = (debateId: string) => {
    setDebates((prev) =>
      prev.map((d) =>
        d.id === debateId
          ? { ...d, propTeam: d.oppTeam, oppTeam: d.propTeam }
          : d
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      {!isPublished && (
        <Card className="border-white/10 bg-white/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm text-white/70">
              <GripVertical className="h-4 w-4" />
              <span>Drag teams and judges to rearrange</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onReset}
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Auto
              </Button>
              <Button
                onClick={handleSaveDraft}
                disabled={saving}
                variant="outline"
                className="gap-2 border-white/20 text-white hover:bg-white/10"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirming}
                className="gap-2 bg-cyan-500 text-black hover:bg-cyan-400"
              >
                {confirming ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirm & Lock
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debates Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {debates.map((debate, idx) => (
          <Card
            key={debate.id}
            className="border-white/10 bg-white/5 backdrop-blur-sm"
            onDragOver={(e) => e.preventDefault()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Debate {idx + 1}</CardTitle>
                {debate.room && (
                  <Badge variant="outline" className="border-white/20 text-white/70">
                    {debate.room}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Proposition */}
              <div
                className="rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 p-3"
                onDrop={() => handleDrop(debate.id, 'PROP')}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-cyan-400">
                    Proposition
                  </span>
                  {!isPublished && debate.propTeam && (
                    <button
                      onClick={() => swapSides(debate.id)}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Swap
                    </button>
                  )}
                </div>
                {debate.propTeam ? (
                  <div
                    draggable={!isPublished}
                    onDragStart={() =>
                      handleTeamDragStart(debate.propTeam!, debate.id, 'PROP')
                    }
                    className={`flex items-center gap-2 ${
                      !isPublished ? 'cursor-move' : ''
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-cyan-400/50" />
                    <Users className="h-4 w-4 text-cyan-400" />
                    <span className="font-medium text-white">
                      {debate.propTeam.name}
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-sm text-white/40">
                    Drop team here
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="text-center text-sm font-bold text-white/50">
                VS
              </div>

              {/* Opposition */}
              <div
                className="rounded-lg border-2 border-red-500/30 bg-red-500/10 p-3"
                onDrop={() => handleDrop(debate.id, 'OPP')}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-red-400">
                    Opposition
                  </span>
                </div>
                {debate.oppTeam ? (
                  <div
                    draggable={!isPublished}
                    onDragStart={() =>
                      handleTeamDragStart(debate.oppTeam!, debate.id, 'OPP')
                    }
                    className={`flex items-center gap-2 ${
                      !isPublished ? 'cursor-move' : ''
                    }`}
                  >
                    <GripVertical className="h-4 w-4 text-red-400/50" />
                    <Users className="h-4 w-4 text-red-400" />
                    <span className="font-medium text-white">
                      {debate.oppTeam.name}
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-sm text-white/40">
                    Drop team here
                  </div>
                )}
              </div>

              {/* Judges */}
              <div
                className="rounded-lg border border-white/10 bg-white/5 p-3"
                onDrop={() => handleDrop(debate.id)}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/70">
                  <Gavel className="h-4 w-4" />
                  Judges ({debate.judges.length})
                </div>
                {debate.judges.length > 0 ? (
                  <div className="space-y-1">
                    {debate.judges.map((judge) => (
                      <div
                        key={judge.id}
                        draggable={!isPublished}
                        onDragStart={() =>
                          handleJudgeDragStart(judge, debate.id)
                        }
                        className={`flex items-center gap-2 rounded bg-white/5 p-2 text-sm text-white ${
                          !isPublished ? 'cursor-move' : ''
                        }`}
                      >
                        <GripVertical className="h-3 w-3 text-white/30" />
                        {judge.username}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-white/40">
                    No judges assigned
                  </div>
                )}
              </div>

              {/* Warnings */}
              {debate.warnings.length > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  {debate.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-yellow-400"
                    >
                      <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Available Judges Pool */}
      {!isPublished && availableJudges.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-white">Available Judges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {availableJudges.map((judge) => (
                <div
                  key={judge.id}
                  draggable
                  onDragStart={() => handleJudgeDragStart(judge)}
                  className="flex cursor-move items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-white hover:border-white/20"
                >
                  <GripVertical className="h-3 w-3 text-white/30" />
                  <Gavel className="h-4 w-4 text-cyan-400" />
                  {judge.username}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
