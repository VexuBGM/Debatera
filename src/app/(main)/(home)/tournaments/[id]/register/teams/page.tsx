import {
    getTournamentTeamsPageData,
    getInstitutionTeamState,
} from '@/actions/teams.actions';
import { isRegistrationClosed } from '@/lib/tournament-utils';
import { notFound } from 'next/navigation';
import { ManageTeamsBoard } from './_components/ManageTeamsBoard';
import { AllTeamsList } from './_components/AllTeamsList';
import { HelpTopics } from '@/components/docs/HelpLink';

interface TeamsPageProps {
    params: Promise<{ id: string }>;
}

/**
 * Tournament Teams Page
 *
 * Shows:
 * - Team management board (if user can manage any institution)
 * - Read-only list of all teams
 */
export default async function TeamsPage({ params }: TeamsPageProps) {
    const { id: tournamentId } = await params;

    const result = await getTournamentTeamsPageData(tournamentId);

    if (!result.success || !result.data) {
        notFound();
    }

    const {
        tournament,
        allTeams,
        manageableInstitutions,
        currentUserParticipantInstitutionId,
        isOrganizer,
        canCreateInstitutions,
    } = result.data;

    const isLocked = isRegistrationClosed(tournament.registrationClosesAt);

    // Determine default institution to manage:
    // 1. If user is a participant, use their institution (if manageable)
    // 2. Otherwise, use the first manageable institution
    let defaultInstitutionId: string | null = null;
    if (manageableInstitutions.length > 0) {
        const participantInst = manageableInstitutions.find(
            i => i.id === currentUserParticipantInstitutionId
        );
        defaultInstitutionId = participantInst?.id ?? manageableInstitutions[0].id;
    }

    // Fetch initial state for default institution (if any)
    let initialTeamState = null;
    if (defaultInstitutionId) {
        const stateResult = await getInstitutionTeamState(tournamentId, defaultInstitutionId);
        if (stateResult.success && stateResult.data) {
            initialTeamState = stateResult.data;
        }
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-5">
            {/* Header */}
            <div className="space-y-1.5">
                <h1 className="text-2xl font-bold text-white">
                    Team Management - {tournament.name}
                </h1>
                <p className="text-sm text-white/70">
                    Teams must have {tournament.teamMinSize}-{tournament.teamMaxSize} members.
                    {isLocked && (
                        <span className="ml-2 text-red-400 font-medium">
                            (Registration closed - read-only mode)
                        </span>
                    )}
                </p>
            </div>

            <HelpTopics
                topics={[
                    { section: 'Registering for a Tournament' },
                    { section: 'Creating Teams' },
                ]}
                className="bg-background/60"
            />

            {/* Management Board (if user can manage at least one institution) */}
            {(manageableInstitutions.length > 0 || canCreateInstitutions) && (
                <ManageTeamsBoard
                    tournamentId={tournamentId}
                    tournament={tournament}
                    manageableInstitutions={manageableInstitutions}
                    defaultInstitutionId={defaultInstitutionId}
                    initialTeamState={initialTeamState}
                    isLocked={isLocked}
                    isOrganizer={isOrganizer}
                    canCreateInstitutions={canCreateInstitutions}
                />
            )}

            {/* All Teams (read-only) */}
            <AllTeamsList
                allTeams={allTeams}
                teamMinSize={tournament.teamMinSize}
                teamMaxSize={tournament.teamMaxSize}
            />
        </div>
    );
}
