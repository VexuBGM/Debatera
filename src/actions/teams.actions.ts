'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { assertRegistrationOpen, assertValidTeamSize, TournamentSettingsLike } from '@/lib/guards/tournamentSettingsGuards';
import { isTournamentAdmin } from '@/lib/tournamentRounds/authorization';
import {
  ensureInstitutionForTournament,
  isIndependentAdjudicatorsInstitutionName,
} from '@/lib/services/institutions';
import {
  bulkAddGuestDebatersToInstitutionSchema,
  bulkAddDebatersToTeamSchema,
} from '@/lib/validations/participants';
import {
  generateGuestUserId,
  parseGuestParticipantNames,
  splitGuestDisplayName,
} from '@/lib/domains/participants/guestParticipants';
import {
  assertCanManageInstitution,
  resolveTeamManagementScope,
} from '@/lib/domains/teams/teamManagementScope';
import { createTournamentParticipantForUser } from '@/lib/participants/createTournamentParticipant';

export type TeamWithMembers = Prisma.TournamentTeamGetPayload<{
    include: {
        institution: { select: { id: true; name: true } };
        members: {
            include: {
                participant: {
                    include: {
                        user: true;
                    };
                };
            };
        };
    };
}>;

export type DebaterParticipant = Prisma.TournamentParticipantGetPayload<{
    include: {
        user: true;
        teamMembership: true;
    };
}>;

interface ActionResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

const TEAM_FEEDBACK_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TEAM_FEEDBACK_CODE_LENGTH = 6;

function generateTeamFeedbackCodeCandidate() {
    let code = '';
    for (let i = 0; i < TEAM_FEEDBACK_CODE_LENGTH; i++) {
        const index = Math.floor(Math.random() * TEAM_FEEDBACK_CODE_ALPHABET.length);
        code += TEAM_FEEDBACK_CODE_ALPHABET[index];
    }
    return code;
}

async function generateUniqueTeamFeedbackCode(tournamentId: string) {
    for (let attempt = 0; attempt < 10; attempt++) {
        const feedbackCode = generateTeamFeedbackCodeCandidate();
        const existingTeam = await prisma.tournamentTeam.findFirst({
            where: { tournamentId, feedbackCode },
            select: { id: true },
        });

        if (!existingTeam) {
            return feedbackCode;
        }
    }

    throw new Error('Unable to generate a unique feedback code');
}

export async function getTournamentTeamsPageData(
    tournamentId: string
): Promise<ActionResponse<{
    tournament: {
        id: string;
        name: string;
        registrationClosesAt: Date | null;
        teamMinSize: number;
        teamMaxSize: number;
    };
    allTeams: {
        institution: { id: string; name: string };
        teams: TeamWithMembers[];
    }[];
    manageableInstitutions: { id: string; name: string }[];
    currentUserParticipantInstitutionId: string | null;
    isOrganizer: boolean;
    canCreateInstitutions: boolean;
}>> {
    try {
        const { userId } = await auth();

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });

        if (!tournament) {
            return { success: false, error: 'Tournament not found' };
        }

        // Fetch all teams grouped by institution
        const teams = await prisma.tournamentTeam.findMany({
            where: { tournamentId },
            include: {
                institution: { select: { id: true, name: true } },
                members: {
                    include: {
                        participant: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                institution: {
                    name: 'asc',
                },
            },
        });

        const groupedTeamsMap = new Map<string, { institution: { id: string; name: string }; teams: TeamWithMembers[] }>();

        for (const team of teams) {
            if (!groupedTeamsMap.has(team.institutionId)) {
                groupedTeamsMap.set(team.institutionId, {
                    institution: { id: team.institution.id, name: team.institution.name },
                    teams: [],
                });
            }
            groupedTeamsMap.get(team.institutionId)!.teams.push(team);
        }

        const allTeams = Array.from(groupedTeamsMap.values()).filter(
            ({ institution }) => !isIndependentAdjudicatorsInstitutionName(institution.name)
        );

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        const tournamentData = {
            id: tournament.id,
            name: tournament.name,
            registrationClosesAt: settings.registrationClosesAt,
            teamMinSize: settings.teamSizeMin,
            teamMaxSize: settings.teamSizeMax,
            createdByUserId: tournament.createdByUserId,
        };

        // Unauthenticated users get read-only data (no management capabilities)
        if (!userId) {
            return {
                success: true,
                data: {
                    tournament: tournamentData,
                    allTeams,
                    manageableInstitutions: [],
                    currentUserParticipantInstitutionId: null,
                    isOrganizer: false,
                    canCreateInstitutions: false,
                },
            };
        }

        const participatingInstitutions = await prisma.tournamentInstitution.findMany({
            where: {
                tournamentId,
                status: 'APPROVED',
            },
            include: {
                institution: true,
            },
        });

        const scope = await resolveTeamManagementScope(tournamentId, userId);
        const manageableInstitutionIdSet = new Set(scope.manageableInstitutionIds);
        const manageableInstitutions = participatingInstitutions
            .filter((institution) => (
                (scope.isOrganizer || manageableInstitutionIdSet.has(institution.institutionId))
                && !isIndependentAdjudicatorsInstitutionName(institution.institution.name)
            ))
            .map((institution) => ({
                id: institution.institution.id,
                name: institution.institution.name,
            }));

        const participantInfo = await prisma.tournamentParticipant.findUnique({
            where: {
                tournamentId_userId: {
                    tournamentId,
                    userId,
                },
            },
            select: { institutionId: true },
        });

        return {
            success: true,
            data: {
                tournament: tournamentData,
                allTeams,
                manageableInstitutions,
                currentUserParticipantInstitutionId: participantInfo?.institutionId ?? null,
                isOrganizer: scope.isOrganizer,
                canCreateInstitutions: scope.canCreateInstitutions,
            },
        };

    } catch (error) {
        console.error('Error fetching tournament teams page data:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * Get the current state of teams and debaters for a specific institution in a tournament
 */
export async function getInstitutionTeamState(
    tournamentId: string,
    institutionId: string
): Promise<ActionResponse<{ teams: TeamWithMembers[]; debaters: DebaterParticipant[] }>> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const scope = await resolveTeamManagementScope(tournamentId, userId);
        assertCanManageInstitution(scope, institutionId);

        // Fetch teams
        const teams = await prisma.tournamentTeam.findMany({
            where: {
                tournamentId,
                institutionId,
            },
            include: {
                institution: { select: { id: true, name: true } },
                members: {
                    include: {
                        participant: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Fetch debaters (participants from this institution in this tournament with role DEBATER)
        const debaters = await prisma.tournamentParticipant.findMany({
            where: {
                tournamentId,
                institutionId,
                role: 'DEBATER',
            },
            include: {
                user: true,
                teamMembership: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        return {
            success: true,
            data: {
                teams,
                debaters,
            },
        };
    } catch (error: any) {
        if (error.message === 'Forbidden') {
            return { success: false, error: 'Forbidden' };
        }
        console.error('Error fetching team state:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * Create a new team for an institution in a tournament
 */
export async function createTeam({
    tournamentId,
    institutionId,
}: {
    tournamentId: string;
    institutionId: string;
}): Promise<ActionResponse<{ team: TeamWithMembers }>> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const scope = await resolveTeamManagementScope(tournamentId, userId);
        assertCanManageInstitution(scope, institutionId);

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });

        if (!tournament) return { success: false, error: 'Tournament not found' };

        // Get institution name for auto-naming
        const institution = await prisma.institution.findUnique({
            where: { id: institutionId },
            select: { name: true },
        });

        if (!institution) return { success: false, error: 'Institution not found' };

        // Check registration
        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }

        // Generate team name: "InstName 1", "InstName 2", etc.
        // Find all current teams to determine the next number
        // We can't rely just on count because of deletions, so we should try to find the lowest available number or just max + 1.
        // Simple approach: count existing teams and add 1. If that conflicts, increment.
        // Better approach: Regex match existing names to find max N.

        const existingTeams = await prisma.tournamentTeam.findMany({
            where: {
                tournamentId,
                institutionId,
            },
            select: { name: true },
        });

        let nextNum = 1;
        let potentialName = `${institution.name} ${nextNum}`;
        const usedNames = new Set(existingTeams.map(t => t.name));

        while (usedNames.has(potentialName)) {
            nextNum++;
            potentialName = `${institution.name} ${nextNum}`;
        }

        const feedbackCode = await generateUniqueTeamFeedbackCode(tournamentId);

        const team = await prisma.tournamentTeam.create({
            data: {
                tournamentId,
                institutionId,
                name: potentialName,
                feedbackCode,
                createdByUserId: userId,
            },
            include: {
                institution: { select: { id: true, name: true } },
                members: {
                    include: {
                        participant: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        revalidatePath(`/tournaments/${tournamentId}/register/teams`);

        return { success: true, data: { team } };
    } catch (error: any) {
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('Error creating team:', error);
        return { success: false, error: error.message || 'Failed to create team' };
    }
}

/**
 * Delete a team
 */
export async function deleteTeam({
    teamId,
}: {
    teamId: string;
}): Promise<ActionResponse> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const team = await prisma.tournamentTeam.findUnique({
            where: { id: teamId },
        });

        if (!team) return { success: false, error: 'Team not found' };

        const scope = await resolveTeamManagementScope(team.tournamentId, userId);
        assertCanManageInstitution(scope, team.institutionId);

        const tournament = await prisma.tournament.findUnique({
            where: { id: team.tournamentId },
            include: { settings: true },
        });

        if (!tournament) return { success: false, error: 'Tournament not found' };

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }

        await prisma.tournamentTeam.delete({
            where: { id: teamId },
        });

        revalidatePath(`/tournaments/${team.tournamentId}/register/teams`);

        return { success: true };
    } catch (error: any) {
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('Error deleting team:', error);
        return { success: false, error: error.message || 'Failed to delete team' };
    }
}

/**
 * Move a participant (debater) to a different team or unassign them
 */
export async function moveParticipant({
    tournamentId,
    participantId,
    toTeamId, // null means unassign
}: {
    tournamentId: string;
    participantId: string;
    toTeamId: string | null;
}): Promise<ActionResponse> {
    try {
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'Unauthorized' };
        }

        // Perform checks
        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            include: { institution: true },
        });

        if (!participant) return { success: false, error: 'Participant not found' };
        if (participant.tournamentId !== tournamentId) {
            return { success: false, error: 'Participant not found' };
        }
        if (participant.role !== 'DEBATER') {
            return { success: false, error: 'Only debaters can be assigned to teams' };
        }

        const scope = await resolveTeamManagementScope(tournamentId, userId);
        assertCanManageInstitution(scope, participant.institutionId);

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });

        if (!tournament) return { success: false, error: 'Tournament not found' };

        if (toTeamId) {
            // Assigning to a team
            const targetTeam = await prisma.tournamentTeam.findUnique({
                where: { id: toTeamId },
                include: { members: true },
            });

            if (!targetTeam) return { success: false, error: 'Target team not found' };

            // Validate constraints
            if (targetTeam.tournamentId !== tournamentId) {
                return { success: false, error: 'Team is in a different tournament' };
            }
            assertCanManageInstitution(scope, targetTeam.institutionId);
            if (targetTeam.institutionId !== participant.institutionId) {
                return { success: false, error: 'Cannot assign to a team from a different institution' };
            }

            const settings: TournamentSettingsLike = tournament.settings ?? {
                registrationOpensAt: null,
                registrationClosesAt: null,
                teamSizeMin: 2,
                teamSizeMax: 5,
            };

            try {
                assertRegistrationOpen(settings);
                // Check Max size only for incremental build
                assertValidTeamSize(settings, targetTeam.members.length + 1, false);
            } catch (error: any) {
                if (error.message === 'REGISTRATION_CLOSED') return { success: false, error: 'Registration is closed' };
                if (error.message === 'TEAM_SIZE_INVALID') return { success: false, error: `Team is full (max ${settings.teamSizeMax})` };
                throw error;
            }

            // Upsert membership (create or update if somehow exists but shouldn't due to unique constraint)
            // Actually, because of the unique constraint on participantId, we can just upsert or delete/create.
            // Using upsert on specific field might be tricky if key is ID.
            // The constraint is `participantId` unique on `TournamentTeamMember`.
            // So we can find existing membership and update, or create.

            const existingMembership = await prisma.tournamentTeamMember.findUnique({
                where: { participantId },
            });

            if (existingMembership) {
                await prisma.tournamentTeamMember.update({
                    where: { participantId },
                    data: { teamId: toTeamId },
                });
            } else {
                await prisma.tournamentTeamMember.create({
                    data: {
                        teamId: toTeamId,
                        participantId,
                    },
                });
            }

        } else {
            // Unassigning (removing from team)
            try {
                await prisma.tournamentTeamMember.delete({
                    where: { participantId },
                });
            } catch (e) {
                // Ignore if record not found (already unassigned)
                if ((e as any).code !== 'P2025') {
                    throw e;
                }
            }
        }

        revalidatePath(`/tournaments/${tournamentId}/register/teams`);
        return { success: true };

    } catch (error: any) {
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('Error moving participant:', error);
        return { success: false, error: error.message || 'Failed to move participant' };
    }
}

export async function bulkAddGuestDebatersToInstitution(input: {
    tournamentId: string;
    names: string;
    institutionId?: string;
    institutionName?: string;
}): Promise<ActionResponse<{
    results: Array<{ line: number; name: string; success: boolean; error?: string }>;
    totalCreated: number;
    institution: { id: string; name: string; created: boolean };
}>> {
    try {
        const parsed = bulkAddGuestDebatersToInstitutionSchema.parse(input);
        const { userId } = await auth();
        if (!userId) {
            return { success: false, error: 'Unauthorized' };
        }

        const scope = await resolveTeamManagementScope(parsed.tournamentId, userId);
        if (!scope.isOrganizer && scope.manageableInstitutionIds.length === 0) {
            return { success: false, error: 'Forbidden' };
        }

        if (parsed.institutionName && !scope.canCreateInstitutions) {
            return { success: false, error: 'Only tournament organizers can create institutions here' };
        }

        if (!parsed.institutionId && !parsed.institutionName) {
            return { success: false, error: 'Institution is required' };
        }

        if (parsed.institutionId && !scope.isOrganizer) {
            assertCanManageInstitution(scope, parsed.institutionId);
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: parsed.tournamentId },
            include: { settings: true },
        });

        if (!tournament) {
            return { success: false, error: 'Tournament not found' };
        }

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }

        const resolvedInstitution = await ensureInstitutionForTournament(parsed.tournamentId, userId, {
            institutionId: parsed.institutionId,
            institutionName: parsed.institutionName,
        });

        if (!scope.isOrganizer) {
            assertCanManageInstitution(scope, resolvedInstitution.institutionId);
        }

        const names = parseGuestParticipantNames(parsed.names);
        if (names.length === 0) {
            return { success: false, error: 'No valid names provided' };
        }

        const results: Array<{ line: number; name: string; success: boolean; error?: string }> = [];
        let totalCreated = 0;

        for (const entry of names) {
            if (entry.name.length > 128) {
                results.push({
                    line: entry.line,
                    name: entry.name,
                    success: false,
                    error: 'Name too long (max 128 characters)',
                });
                continue;
            }

            try {
                const guestUserId = generateGuestUserId();
                const { firstName, lastName } = splitGuestDisplayName(entry.name);

                await prisma.user.create({
                    data: {
                        id: guestUserId,
                        email: null,
                        displayName: entry.name,
                        firstName,
                        lastName,
                    },
                });

                await createTournamentParticipantForUser(prisma, {
                    tournamentId: parsed.tournamentId,
                    userId: guestUserId,
                    institutionId: resolvedInstitution.institutionId,
                    role: 'DEBATER',
                });

                results.push({
                    line: entry.line,
                    name: entry.name,
                    success: true,
                });
                totalCreated++;
            } catch (error: any) {
                results.push({
                    line: entry.line,
                    name: entry.name,
                    success: false,
                    error: error.message || 'Failed to create participant',
                });
            }
        }

        revalidatePath(`/tournaments/${parsed.tournamentId}/register/teams`);
        revalidatePath(`/tournaments/${parsed.tournamentId}/participants`);

        return {
            success: true,
            data: {
                results,
                totalCreated,
                institution: {
                    id: resolvedInstitution.institutionId,
                    name: resolvedInstitution.institutionName,
                    created: resolvedInstitution.created,
                },
            },
        };
    } catch (error: any) {
        if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('bulkAddGuestDebatersToInstitution error:', error);
        return { success: false, error: error.message || 'Failed to add debaters' };
    }
}

// =============================================================================
// Organizer-level team management (Step 1 - Manual Roster)
// =============================================================================

/**
 * Helper to check if user is tournament creator or institution admin.
 */
async function requireTeamManager(
    tournamentId: string,
    institutionId?: string,
): Promise<string> {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const isCreator = await isTournamentAdmin(tournamentId, userId);
    if (isCreator) return userId;

    // If an institutionId is provided, check admin membership
    if (institutionId) {
        const membership = await prisma.institutionMember.findUnique({
            where: {
                institutionId_userId: { institutionId, userId },
            },
        });
        if (membership?.role === 'ADMIN') return userId;
    }

    throw new Error('Forbidden');
}

/**
 * Create a team for the organizer (tournament creator can create for any institution).
 * Unlike `createTeam`, this doesn't require registration to be open.
 * Now supports inline institution creation via `institutionName`.
 */
export async function createTeamAsOrganizer({
    tournamentId,
    institutionId,
    institutionName,
    name,
}: {
    tournamentId: string;
    institutionId?: string;
    institutionName?: string;
    name?: string;
}): Promise<ActionResponse<{ team: TeamWithMembers }>> {
    try {
        // Validate: must have either institutionId or institutionName
        if (!institutionId && !institutionName) {
            return { success: false, error: 'Institution is required' };
        }

        const { userId } = await auth();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });
        if (!tournament) return { success: false, error: 'Tournament not found' };

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }

        // Tournament creator can create for any institution
        const isCreator = await isTournamentAdmin(tournamentId, userId);
        if (!isCreator) {
            // Non-creators need to be admin of the given institution
            if (institutionId) {
                const membership = await prisma.institutionMember.findUnique({
                    where: { institutionId_userId: { institutionId, userId } },
                });
                if (membership?.role !== 'ADMIN') {
                    return { success: false, error: 'Forbidden' };
                }
            } else {
                return { success: false, error: 'Forbidden: Only tournament creators can create new institutions inline' };
            }
        }

        // Resolve / create institution
        const resolved = await ensureInstitutionForTournament(tournamentId, userId, {
            institutionId,
            institutionName,
        });
        const resolvedInstId = resolved.institutionId;
        const resolvedInstName = resolved.institutionName;

        // Auto-generate name if not provided
        let teamName = name?.trim();
        if (!teamName) {
            const existingTeams = await prisma.tournamentTeam.findMany({
                where: { tournamentId, institutionId: resolvedInstId },
                select: { name: true },
            });

            let nextNum = 1;
            teamName = `${resolvedInstName} ${nextNum}`;
            const usedNames = new Set(existingTeams.map((t) => t.name));
            while (usedNames.has(teamName)) {
                nextNum++;
                teamName = `${resolvedInstName} ${nextNum}`;
            }
        }

        const feedbackCode = await generateUniqueTeamFeedbackCode(tournamentId);

        const team = await prisma.tournamentTeam.create({
            data: {
                tournamentId,
                institutionId: resolvedInstId,
                name: teamName,
                feedbackCode,
                createdByUserId: userId,
            },
            include: {
                institution: { select: { id: true, name: true } },
                members: {
                    include: {
                        participant: {
                            include: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        revalidatePath(`/tournaments/${tournamentId}/teams`);
        revalidatePath(`/tournaments/${tournamentId}/register/teams`);
        return { success: true, data: { team } };
    } catch (error: any) {
        if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('Error creating team as organizer:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: 'A team with that name already exists for this institution' };
        }
        return { success: false, error: 'Failed to create team' };
    }
}

/**
 * Delete a team as organizer.
 */
export async function deleteTeamAsOrganizer({
    teamId,
}: {
    teamId: string;
}): Promise<ActionResponse> {
    try {
        const team = await prisma.tournamentTeam.findUnique({
            where: { id: teamId },
            select: { tournamentId: true, institutionId: true },
        });
        if (!team) return { success: false, error: 'Team not found' };

        await requireTeamManager(team.tournamentId, team.institutionId);

        const tournament = await prisma.tournament.findUnique({
            where: { id: team.tournamentId },
            include: { settings: true },
        });
        if (!tournament) return { success: false, error: 'Tournament not found' };

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }

        await prisma.tournamentTeam.delete({ where: { id: teamId } });

        revalidatePath(`/tournaments/${team.tournamentId}/teams`);
        revalidatePath(`/tournaments/${team.tournamentId}/register/teams`);
        return { success: true };
    } catch (error: any) {
        if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('Error deleting team:', error);
        return { success: false, error: 'Failed to delete team' };
    }
}

/**
 * Assign a debater to a team (organizer-level, no registration check).
 * Enforces team size max and single-team constraint.
 */
export async function assignDebaterToTeam({
    tournamentId,
    participantId,
    teamId,
}: {
    tournamentId: string;
    participantId: string;
    teamId: string | null; // null = unassign
}): Promise<ActionResponse> {
    try {
        const participant = await prisma.tournamentParticipant.findUnique({
            where: { id: participantId },
            select: { id: true, tournamentId: true, institutionId: true, role: true },
        });
        if (!participant || participant.tournamentId !== tournamentId) {
            return { success: false, error: 'Participant not found' };
        }
        if (participant.role !== 'DEBATER') {
            return { success: false, error: 'Only debaters can be assigned to teams' };
        }

        await requireTeamManager(tournamentId, participant.institutionId);

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });
        if (!tournament) return { success: false, error: 'Tournament not found' };

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }

        if (teamId) {
            // Assigning to a team
            const targetTeam = await prisma.tournamentTeam.findUnique({
                where: { id: teamId },
                include: { members: true },
            });
            if (!targetTeam || targetTeam.tournamentId !== tournamentId) {
                return { success: false, error: 'Team not found' };
            }

            // Count current members excluding the participant being moved (if already in this team)
            const existingMembership = await prisma.tournamentTeamMember.findUnique({
                where: { participantId },
            });

            if (existingMembership?.teamId === teamId) {
                return { success: false, error: 'Debater is already assigned to this team' };
            }

            const newCount = existingMembership?.teamId === teamId
                ? targetTeam.members.length // no change
                : targetTeam.members.length + 1;

            if (existingMembership?.teamId !== teamId) {
                try {
                    assertValidTeamSize(settings, newCount, false);
                } catch {
                    return { success: false, error: `Team is full (max ${settings.teamSizeMax})` };
                }
            }

            // Upsert team membership
            if (existingMembership) {
                await prisma.tournamentTeamMember.update({
                    where: { participantId },
                    data: { teamId },
                });
            } else {
                await prisma.tournamentTeamMember.create({
                    data: { teamId, participantId },
                });
            }
        } else {
            // Unassign from team
            try {
                await prisma.tournamentTeamMember.delete({
                    where: { participantId },
                });
            } catch (e: any) {
                if (e.code !== 'P2025') throw e;
            }
        }

        revalidatePath(`/tournaments/${tournamentId}/teams`);
        revalidatePath(`/tournaments/${tournamentId}/register/teams`);
        revalidatePath(`/tournaments/${tournamentId}/participants`);
        return { success: true };
    } catch (error: any) {
        if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('Error assigning debater:', error);
        return { success: false, error: 'Failed to assign debater' };
    }
}

/**
 * Get all teams + unassigned debaters for the admin team management page.
 */
export async function getTeamManagementData(
    tournamentId: string,
): Promise<ActionResponse<{
    teams: TeamWithMembers[];
    unassignedDebaters: DebaterParticipant[];
    institutions: Array<{ id: string; name: string }>;
    tournament: { id: string; name: string; createdByUserId: string };
    teamSizeMin: number;
    teamSizeMax: number;
    isOrganizer: boolean;
}>> {
    try {
        const { userId } = await auth();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { settings: true },
        });
        if (!tournament) return { success: false, error: 'Tournament not found' };

        const isCreator = tournament.createdByUserId === userId;
        if (!isCreator) {
            // Check institution admin
            const adminMemberships = await prisma.institutionMember.findMany({
                where: { userId, role: 'ADMIN' },
                select: { institutionId: true },
            });
            const approvedLink = await prisma.tournamentInstitution.findFirst({
                where: {
                    tournamentId,
                    status: 'APPROVED',
                    institutionId: { in: adminMemberships.map((m) => m.institutionId) },
                },
            });
            if (!approvedLink) return { success: false, error: 'Forbidden' };
        }

        const teams = await prisma.tournamentTeam.findMany({
            where: { tournamentId },
            include: {
                institution: { select: { id: true, name: true } },
                members: {
                    include: {
                        participant: {
                            include: { user: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        // All debaters in this tournament
        const allDebaters = await prisma.tournamentParticipant.findMany({
            where: { tournamentId, role: 'DEBATER' },
            include: {
                user: true,
                teamMembership: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        const unassignedDebaters = allDebaters.filter((d) => !d.teamMembership);

        const approvedInstitutions = await prisma.tournamentInstitution.findMany({
            where: { tournamentId, status: 'APPROVED' },
            include: { institution: { select: { id: true, name: true } } },
        });

        const settings = tournament.settings;

        return {
            success: true,
            data: {
                teams,
                unassignedDebaters,
                institutions: approvedInstitutions.map((ai) => ai.institution),
                tournament: { id: tournament.id, name: tournament.name, createdByUserId: tournament.createdByUserId },
                teamSizeMin: settings?.teamSizeMin ?? tournament.teamMinSize,
                teamSizeMax: settings?.teamSizeMax ?? tournament.teamMaxSize,
                isOrganizer: isCreator,
            },
        };
    } catch (error) {
        console.error('Error fetching team management data:', error);
        return { success: false, error: 'Internal server error' };
    }
}

// =============================================================================
// Bulk-add debaters directly into a team
// =============================================================================

/**
 * Bulk-add guest debaters directly into an existing team.
 * Creates guest User + TournamentParticipant (inheriting team.institutionId) + TournamentTeamMember.
 */
export async function bulkAddDebatersToTeam(
    input: { tournamentId: string; teamId: string; names: string },
): Promise<ActionResponse<{
    results: Array<{ line: number; name: string; success: boolean; error?: string }>;
    totalCreated: number;
}>> {
    try {
        const parsed = bulkAddDebatersToTeamSchema.parse(input);
        const { userId } = await auth();
        if (!userId) return { success: false, error: 'Unauthorized' };

        // Load team
        const team = await prisma.tournamentTeam.findUnique({
            where: { id: parsed.teamId },
            include: { members: true },
        });
        if (!team || team.tournamentId !== parsed.tournamentId) {
            return { success: false, error: 'Team not found' };
        }

        const scope = await resolveTeamManagementScope(parsed.tournamentId, userId);
        assertCanManageInstitution(scope, team.institutionId);

        // Team size constraints
        const tournament = await prisma.tournament.findUnique({
            where: { id: parsed.tournamentId },
            include: { settings: true },
        });
        if (!tournament) return { success: false, error: 'Tournament not found' };

        const settings: TournamentSettingsLike = tournament.settings ?? {
            registrationOpensAt: null,
            registrationClosesAt: null,
            teamSizeMin: 2,
            teamSizeMax: 5,
        };

        try {
            assertRegistrationOpen(settings);
        } catch (error: any) {
            if (error.message === 'REGISTRATION_CLOSED') {
                return { success: false, error: 'Registration is closed' };
            }
            throw error;
        }
        const maxSize = settings.teamSizeMax;
        let currentMemberCount = team.members.length;

        // Parse lines
        const lines = parseGuestParticipantNames(parsed.names);
        if (lines.length === 0) return { success: false, error: 'No valid names provided' };

        const results: Array<{ line: number; name: string; success: boolean; error?: string }> = [];
        let totalCreated = 0;

        for (let i = 0; i < lines.length; i++) {
            const { line, name } = lines[i];

            if (name.length > 128) {
                results.push({ line, name, success: false, error: 'Name too long (max 128)' });
                continue;
            }

            if (currentMemberCount >= maxSize) {
                results.push({ line, name, success: false, error: `Team full (max ${maxSize})` });
                continue;
            }

            try {
                const guestUserId = generateGuestUserId();
                const { firstName, lastName } = splitGuestDisplayName(name);

                await prisma.user.create({
                    data: {
                        id: guestUserId,
                        email: null,
                        displayName: name,
                        firstName,
                        lastName,
                    },
                });

                const participant = await createTournamentParticipantForUser(prisma, {
                    tournamentId: parsed.tournamentId,
                    userId: guestUserId,
                    institutionId: team.institutionId,
                    role: 'DEBATER',
                });

                await prisma.tournamentTeamMember.create({
                    data: {
                        teamId: team.id,
                        participantId: participant.participantId,
                    },
                });

                currentMemberCount++;
                totalCreated++;
                results.push({ line, name, success: true });
            } catch (error: any) {
                results.push({ line, name, success: false, error: error.message || 'Failed' });
            }
        }

        revalidatePath(`/tournaments/${parsed.tournamentId}/teams`);
        revalidatePath(`/tournaments/${parsed.tournamentId}/register/teams`);
        revalidatePath(`/tournaments/${parsed.tournamentId}/participants`);
        return { success: true, data: { results, totalCreated } };
    } catch (error: any) {
        if (error.message === 'Unauthorized') return { success: false, error: 'Unauthorized' };
        if (error.message === 'Forbidden') return { success: false, error: 'Forbidden' };
        console.error('bulkAddDebatersToTeam error:', error);
        return { success: false, error: error.message || 'Failed to add debaters' };
    }
}
