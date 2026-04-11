'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Building2, Check, Lock, MapPin, Save, ScrollText, Send } from 'lucide-react';

import { SpeechCard } from '@/components/ballot/SpeechCard';
import {
  BallotData,
  BallotSide,
  BallotSpeechFormState,
  BallotSpeechRole,
  BallotVote,
  OPP_SPEECH_ORDER,
  PROP_SPEECH_ORDER,
  SPEECH_ROLE_LABELS,
  SpeechFormEntry,
  Team,
  TeamMember,
  getBallotTotal,
  getScoreRange,
} from '@/components/ballot/model';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { HelpTopics, HelpLink } from '@/components/docs/HelpLink';
import { cn } from '@/lib/utils';

interface BallotWorkspaceProps {
  ballot: BallotData;
  vote: BallotVote;
  speeches: BallotSpeechFormState;
  privateNotes: string;
  saving: boolean;
  submitting: boolean;
  requestingModification: boolean;
  backHref: string;
  backLabel: string;
  onVoteChange: (vote: BallotVote) => void;
  onPrivateNotesChange: (notes: string) => void;
  onUpdateSpeech: (
    role: BallotSpeechRole,
    field: keyof SpeechFormEntry,
    value: string | null
  ) => void;
  onSave: () => void;
  onSubmit: () => void;
  onRequestModification: (reason: string) => void;
}

export function BallotWorkspace({
  ballot,
  vote,
  speeches,
  privateNotes,
  saving,
  submitting,
  requestingModification,
  backHref,
  backLabel,
  onVoteChange,
  onPrivateNotesChange,
  onUpdateSpeech,
  onSave,
  onSubmit,
  onRequestModification,
}: BallotWorkspaceProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestReason, setRequestReason] = useState('');

  const isSubmitted = ballot.status === 'SUBMITTED';
  const latestRequest = ballot.latestModificationRequest;
  const hasPendingRequest = latestRequest?.status === 'PENDING';
  const hasRejectedRequest = latestRequest?.status === 'REJECTED';
  const propTotal = getBallotTotal(speeches, 'PROPOSITION');
  const oppTotal = getBallotTotal(speeches, 'OPPOSITION');

  function getTeamMembers(side: BallotSide): TeamMember[] {
    const team = side === 'PROPOSITION' ? ballot.debate.propTeam : ballot.debate.oppTeam;
    return team?.members ?? [];
  }

  function renderTeamSummary(
    side: BallotSide,
    title: string,
    team: Team | null
  ) {
    const members = team?.members ?? [];

    return (
      <div
        className={cn(
          'rounded-2xl border p-4 shadow-sm',
          side === 'PROPOSITION'
            ? 'border-sky-500/25 bg-sky-500/5'
            : 'border-rose-500/25 bg-rose-500/5'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.2em]',
                side === 'PROPOSITION' ? 'text-sky-700 dark:text-sky-300' : 'text-rose-700 dark:text-rose-300'
              )}
            >
              {title}
            </p>
            <h2 className="text-lg font-semibold leading-tight">{team?.name ?? 'TBD'}</h2>
          </div>
          <Badge variant="outline" className="border-border/70 bg-background/70">
            {members.length} speaker{members.length === 1 ? '' : 's'}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{team?.institution ?? 'Institution not assigned yet'}</span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          {members.length > 0
            ? members.map((member) => member.name).join(', ')
            : 'Speakers will appear here once the team roster is set.'}
        </p>
      </div>
    );
  }

  function renderSideColumn(
    side: BallotSide,
    title: string,
    roles: readonly BallotSpeechRole[],
    total: number
  ) {
    const accentClasses =
      side === 'PROPOSITION'
        ? 'border-sky-500/20 bg-sky-500/5'
        : 'border-rose-500/20 bg-rose-500/5';
    const headingClasses =
      side === 'PROPOSITION' ? 'text-sky-700 dark:text-sky-300' : 'text-rose-700 dark:text-rose-300';

    return (
      <section className={cn('rounded-2xl border p-4 sm:p-5', accentClasses)}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className={cn('text-lg font-semibold', headingClasses)}>{title}</h3>
            <p className="text-sm text-muted-foreground">
              Score each speech and assign the correct speaker.
            </p>
          </div>
          <div className="self-center rounded-xl border border-background/70 bg-background/80 px-3 py-2 text-center shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{total.toFixed(1)}</p>
          </div>
        </div>

        <div className="space-y-3">
          {roles.map((role) => {
            const range = getScoreRange(role);
            const entry = speeches[role] ?? {
              speakerId: null,
              speakerName: null,
              score: '',
              comment: '',
            };

            return (
              <SpeechCard
                key={role}
                roleLabel={SPEECH_ROLE_LABELS[role]}
                side={side}
                isReply={role === 'OPP_REPLY' || role === 'PROP_REPLY'}
                scoreMin={range.min}
                scoreMax={range.max}
                members={getTeamMembers(side)}
                speakerId={entry.speakerId}
                speakerName={entry.speakerName}
                score={entry.score}
                comment={entry.comment}
                disabled={isSubmitted}
                onSpeakerChange={(speakerId, speakerName) => {
                  onUpdateSpeech(role, 'speakerId', speakerId);
                  onUpdateSpeech(role, 'speakerName', speakerName);
                }}
                onScoreChange={(score) => onUpdateSpeech(role, 'score', score)}
                onCommentChange={(comment) => onUpdateSpeech(role, 'comment', comment)}
              />
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" asChild className="w-fit px-0 hover:bg-transparent">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={ballot.adjudicatorRole === 'CHAIR' ? 'judge' : 'secondary'}>
            {ballot.adjudicatorRole === 'CHAIR' ? 'Chair' : 'Panelist'}
          </Badge>
          <Badge variant={isSubmitted ? 'default' : 'outline'}>
            {isSubmitted ? (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Submitted
              </span>
            ) : (
              'Draft'
            )}
          </Badge>
        </div>
      </div>

      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm" data-tour="ballot-entry-overview">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CardContent className="p-6 sm:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Ballot Workspace
                </p>
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {ballot.tournament.name}
                  </h1>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    {ballot.round.name}
                    {ballot.tournament.eventMode !== 'ONLINE' && ballot.debate.venue?.name ? (
                      <>
                        {' '}
                        · <span>{ballot.debate.venue.name}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>

              <HelpTopics
                topics={[
                  { section: 'Entering a Ballot (WSDC Format)' },
                  { section: 'Submitting a Ballot' },
                  { section: 'Requesting a Ballot Modification' },
                ]}
                className="bg-background/60"
              />

              <div className="grid gap-4 lg:grid-cols-2">
                {renderTeamSummary('PROPOSITION', 'Proposition', ballot.debate.propTeam)}
                {renderTeamSummary('OPPOSITION', 'Opposition', ballot.debate.oppTeam)}
              </div>

              {ballot.round.motion || ballot.round.infoSlide ? (
                <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 shadow-sm">
                  <div className="space-y-4">
                    {ballot.round.motion ? (
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-background/80 p-2">
                          <ScrollText className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                            Motion
                          </p>
                          <p className="text-base font-medium leading-relaxed text-foreground">
                            {ballot.round.motion}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {ballot.round.infoSlide ? (
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-background/80 p-2">
                          <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                            Info Slide
                          </p>
                          <p className="text-sm leading-relaxed text-foreground/90">
                            {ballot.round.infoSlide}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>

          <div className="border-t border-border/60 bg-muted/25 p-6 xl:border-l xl:border-t-0">
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  At A Glance
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-sky-500/20 bg-background/80 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Prop total</p>
                    <p className="mt-1 text-2xl font-semibold">{propTotal.toFixed(1)}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-background/80 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Opp total</p>
                    <p className="mt-1 text-2xl font-semibold">{oppTotal.toFixed(1)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {ballot.tournament.eventMode === 'ONLINE'
                      ? 'Online debate'
                      : ballot.debate.venue?.name ?? 'Venue not assigned'}
                  </span>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Scoring guide</p>
                  <p className="mt-2 text-sm">Constructives: 60-80</p>
                  <p className="text-sm">Replies: 30-40</p>
                  <p className="mt-2 text-xs text-muted-foreground leading-5">
                    Half points are allowed. Reply speeches must be given by the first or second speaker on that side.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="border-border/60 shadow-sm" data-tour="ballot-entry-scores">
          <CardHeader className="pb-4">
            <CardTitle>Speaker Scores</CardTitle>
            <CardDescription>
              The full ballot stays on one screen, with both sides visible while you score.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            {renderSideColumn('PROPOSITION', 'Proposition', PROP_SPEECH_ORDER, propTotal)}
            {renderSideColumn('OPPOSITION', 'Opposition', OPP_SPEECH_ORDER, oppTotal)}
          </CardContent>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-20">
          {ballot.isReopened && (
            <Card className="border-sky-500/30 bg-sky-500/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ballot Reopened</CardTitle>
                <CardDescription>
                  An organizer approved your modification request. You can edit and resubmit this ballot now.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {hasPendingRequest && (
            <Card className="border-amber-500/30 bg-amber-500/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Modification Requested</CardTitle>
                <CardDescription>
                  This ballot stays locked until an organizer approves or rejects your request.
                </CardDescription>
              </CardHeader>
              {(latestRequest?.reason || latestRequest?.createdAt) && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {latestRequest.reason && <p>{latestRequest.reason}</p>}
                  {latestRequest.createdAt && (
                    <p className="mt-2">
                      Requested {new Date(latestRequest.createdAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {isSubmitted && hasRejectedRequest && (
            <Card className="border-rose-500/30 bg-rose-500/10 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Request Rejected</CardTitle>
                <CardDescription>
                  You can send another request if this ballot still needs to be changed.
                </CardDescription>
              </CardHeader>
              {(latestRequest?.resolutionNote || latestRequest?.resolvedAt) && (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {latestRequest.resolutionNote && <p>{latestRequest.resolutionNote}</p>}
                  {latestRequest.resolvedAt && (
                    <p className="mt-2">
                      Reviewed {new Date(latestRequest.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          <Card className="border-border/60 shadow-sm" data-tour="ballot-entry-decision">
            <CardHeader>
              <CardTitle>Decision</CardTitle>
              <CardDescription>Select the winning side for this ballot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposition</p>
                  <p className="mt-1 text-xl font-semibold">{propTotal.toFixed(1)}</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Opposition</p>
                  <p className="mt-1 text-xl font-semibold">{oppTotal.toFixed(1)}</p>
                </div>
              </div>

              <RadioGroup
                value={vote}
                onValueChange={(nextVote) => onVoteChange(nextVote as BallotVote)}
                disabled={isSubmitted}
                className="grid gap-3"
              >
                <label
                  htmlFor="ballot-vote-prop"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors',
                    vote === 'PROPOSITION'
                      ? 'border-sky-500 bg-sky-500/10'
                      : 'border-border/60 hover:bg-muted/40',
                    isSubmitted && 'cursor-default'
                  )}
                >
                  <div>
                    <p className="font-semibold">Proposition</p>
                    <p className="text-sm text-muted-foreground">Wins on this ballot</p>
                  </div>
                  <RadioGroupItem value="PROPOSITION" id="ballot-vote-prop" />
                </label>

                <label
                  htmlFor="ballot-vote-opp"
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors',
                    vote === 'OPPOSITION'
                      ? 'border-rose-500 bg-rose-500/10'
                      : 'border-border/60 hover:bg-muted/40',
                    isSubmitted && 'cursor-default'
                  )}
                >
                  <div>
                    <p className="font-semibold">Opposition</p>
                    <p className="text-sm text-muted-foreground">Wins on this ballot</p>
                  </div>
                  <RadioGroupItem value="OPPOSITION" id="ballot-vote-opp" />
                </label>
              </RadioGroup>

              <p className="text-xs leading-5 text-muted-foreground">
                Your vote must match the side with the higher total points. If the totals do not support the winner you selected, submission will fail.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Private Notes</CardTitle>
              <CardDescription>
                Optional notes for yourself or organizers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="ballot-private-notes">Notes</Label>
                <Textarea
                  id="ballot-private-notes"
                  value={privateNotes}
                  onChange={(event) => onPrivateNotesChange(event.target.value)}
                  disabled={isSubmitted}
                  placeholder="Anything you want to remember about this debate..."
                  rows={7}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm" data-tour="ballot-entry-actions">
            <CardHeader>
              <CardTitle>{isSubmitted ? 'Submitted' : 'Actions'}</CardTitle>
              <CardDescription>
                {isSubmitted
                  ? 'This ballot is locked unless an organizer reopens it.'
                  : ballot.isReopened
                    ? 'Finish your edits and resubmit this reopened ballot.'
                    : 'Save a draft or submit once everything is final.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isSubmitted ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-center"
                    onClick={onSave}
                    disabled={saving || submitting}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    variant="brand"
                    className="w-full justify-center"
                    onClick={() => setShowSubmitDialog(true)}
                    disabled={saving || submitting}
                  >
                    <Send className="h-4 w-4" />
                    Submit Ballot
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Submitting locks the ballot until an organizer approves a modification request.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                      <Check className="h-4 w-4" />
                      Ballot submitted
                    </div>
                    <p className="mt-2 text-muted-foreground">
                      {ballot.submittedAt
                        ? new Date(ballot.submittedAt).toLocaleString()
                        : 'Submission time unavailable'}
                    </p>
                  </div>

                  {ballot.canRequestModification && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => setShowRequestDialog(true)}
                        disabled={requestingModification}
                      >
                        {requestingModification ? 'Sending Request...' : 'Request Modification'}
                      </Button>
                      <HelpLink
                        section="Handling Ballot Modification Requests"
                        label="How organizers handle these requests"
                        variant="inline"
                        className="justify-center"
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Submission
            </DialogTitle>
            <DialogDescription>
              Once submitted, this ballot locks until an organizer approves a modification request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            <p>
              <strong>Winner:</strong>{' '}
              {vote === 'PROPOSITION'
                ? 'Proposition'
                : vote === 'OPPOSITION'
                  ? 'Opposition'
                  : 'Not selected'}
            </p>
            <p>
              <strong>Proposition total:</strong> {propTotal.toFixed(1)}
            </p>
            <p>
              <strong>Opposition total:</strong> {oppTotal.toFixed(1)}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                onSubmit();
                setShowSubmitDialog(false);
              }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showRequestDialog}
        onOpenChange={(open) => {
          setShowRequestDialog(open);
          if (!open) setRequestReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Ballot Modification</DialogTitle>
            <DialogDescription>
              Tell the organizer why this submitted ballot needs to be reopened.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="ballot-modification-reason">Reason</Label>
            <Textarea
              id="ballot-modification-reason"
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Optional context for the organizer..."
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestDialog(false)}
              disabled={requestingModification}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onRequestModification(requestReason);
                setShowRequestDialog(false);
              }}
              disabled={requestingModification}
            >
              {requestingModification ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
