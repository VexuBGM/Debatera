export type BallotSide = 'PROPOSITION' | 'OPPOSITION';
export type BallotVote = BallotSide | '';

export const WSDC_SPEECH_ORDER = [
  'PROP_1',
  'OPP_1',
  'PROP_2',
  'OPP_2',
  'PROP_3',
  'OPP_3',
  'OPP_REPLY',
  'PROP_REPLY',
] as const;

export type BallotSpeechRole = (typeof WSDC_SPEECH_ORDER)[number];

export const PROP_SPEECH_ORDER = [
  'PROP_1',
  'PROP_2',
  'PROP_3',
  'PROP_REPLY',
] as const satisfies readonly BallotSpeechRole[];

export const OPP_SPEECH_ORDER = [
  'OPP_1',
  'OPP_2',
  'OPP_3',
  'OPP_REPLY',
] as const satisfies readonly BallotSpeechRole[];

export const REPLY_ROLES = [
  'OPP_REPLY',
  'PROP_REPLY',
] as const satisfies readonly BallotSpeechRole[];

export const SPEECH_ROLE_LABELS: Record<BallotSpeechRole, string> = {
  PROP_1: '1st Speaker',
  OPP_1: '1st Speaker',
  PROP_2: '2nd Speaker',
  OPP_2: '2nd Speaker',
  PROP_3: '3rd Speaker',
  OPP_3: '3rd Speaker',
  OPP_REPLY: 'Reply',
  PROP_REPLY: 'Reply',
};

export function getScoreRange(role: BallotSpeechRole) {
  return role === 'OPP_REPLY' || role === 'PROP_REPLY'
    ? { min: 30, max: 40 }
    : { min: 60, max: 80 };
}

export interface TeamMember {
  id: string;
  participantId: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  institution: string;
  members: TeamMember[];
}

export interface BallotSpeech {
  id: string;
  role: BallotSpeechRole;
  side: BallotSide;
  speakerId: string | null;
  speakerName: string | null;
  score: number | null;
  comment: string | null;
}

export interface BallotModificationRequestSummary {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface BallotData {
  id: string;
  status: 'DRAFT' | 'SUBMITTED';
  isReopened: boolean;
  canRequestModification: boolean;
  latestModificationRequest: BallotModificationRequestSummary | null;
  vote: Exclude<BallotVote, ''> | null;
  propTotal: number | null;
  oppTotal: number | null;
  privateNotes: string | null;
  submittedAt: string | null;
  adjudicatorRole: 'CHAIR' | 'PANELIST';
  adjudicator: { id: string; name: string };
  tournament: { id: string; name: string; eventMode?: string };
  round: {
    id: string;
    number: number;
    name: string;
    status: string;
    motion?: string | null;
    infoSlide?: string | null;
  };
  debate: {
    id: string;
    propTeam: Team | null;
    oppTeam: Team | null;
    venue: { id: string; name: string } | null;
  };
  speeches: BallotSpeech[];
}

export interface SpeechFormEntry {
  speakerId: string | null;
  speakerName: string | null;
  score: string;
  comment: string;
}

export type BallotSpeechFormState = Partial<Record<BallotSpeechRole, SpeechFormEntry>>;

export function createEmptySpeechFormEntry(): SpeechFormEntry {
  return {
    speakerId: null,
    speakerName: null,
    score: '',
    comment: '',
  };
}

export function getBallotTotal(
  speeches: BallotSpeechFormState,
  side: BallotSide
) {
  return WSDC_SPEECH_ORDER.filter((role) => role.startsWith(side === 'PROPOSITION' ? 'PROP' : 'OPP')).reduce(
    (sum, role) => {
      const score = speeches[role]?.score;
      return sum + (score ? parseFloat(score) || 0 : 0);
    },
    0
  );
}
