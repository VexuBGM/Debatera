import { z } from 'zod';

export const addGuestParticipantSchema = z.object({
  tournamentId: z.string().min(1),
  role: z.enum(['DEBATER', 'JUDGE']),
  displayName: z.string().min(1, 'Name is required').max(128),
  institutionId: z.string().optional(),
  institutionName: z.string().max(200).optional(),
});

export const bulkAddGuestParticipantsSchema = z.object({
  tournamentId: z.string().min(1),
  role: z.enum(['DEBATER', 'JUDGE']),
  names: z.string().min(1, 'At least one name is required'),
  institutionId: z.string().optional(),
  institutionName: z.string().max(200).optional(),
});

/** Bulk-add debaters directly into a team (names only, institution inherited). */
export const bulkAddDebatersToTeamSchema = z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
  names: z.string().min(1, 'At least one name is required'),
});

export const bulkAddGuestDebatersToInstitutionSchema = z.object({
  tournamentId: z.string().min(1),
  names: z.string().min(1, 'At least one name is required'),
  institutionId: z.string().optional(),
  institutionName: z.string().max(200).optional(),
});

/** Create a team with institution resolution (id or inline name). */
export const createTeamWithInstitutionSchema = z.object({
  tournamentId: z.string().min(1),
  institutionId: z.string().optional(),
  institutionName: z.string().max(200).optional(),
  teamName: z.string().max(200).optional(),
});

export type AddGuestParticipantInput = z.infer<typeof addGuestParticipantSchema>;
export type BulkAddGuestParticipantsInput = z.infer<typeof bulkAddGuestParticipantsSchema>;

export interface ParticipantWithUser {
  id: string;
  role: 'DEBATER' | 'JUDGE';
  institutionId: string;
  createdAt: Date;
  user: {
    id: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
  institution: {
    id: string;
    name: string;
  };
  teamMembership: { id: string; teamId: string } | null;
}
