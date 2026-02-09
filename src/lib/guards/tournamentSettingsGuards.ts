
/**
 * Domain guard functions for Tournament Settings.
 */

export interface TournamentSettingsLike {
    registrationOpensAt: Date | null;
    registrationClosesAt: Date | null;
    teamSizeMin: number;
    teamSizeMax: number;
}

/**
 * Checks if registration is currently open based on settings.
 * 
 * Rules:
 * - If registrationOpensAt exists -> now >= registrationOpensAt
 * - If registrationClosesAt exists -> now < registrationClosesAt
 * - If neither exists -> registration is always open
 */
export function isRegistrationOpen(settings: TournamentSettingsLike, now: Date = new Date()): boolean {
    if (settings.registrationOpensAt && now < settings.registrationOpensAt) {
        return false;
    }
    if (settings.registrationClosesAt && now >= settings.registrationClosesAt) {
        return false;
    }
    return true;
}

/**
 * Asserts that registration is open. Throws error if not.
 */
export function assertRegistrationOpen(settings: TournamentSettingsLike, now: Date = new Date()): void {
    if (!isRegistrationOpen(settings, now)) {
        throw new Error('REGISTRATION_CLOSED');
    }
}

/**
 * Checks if the tournament is set to IRL (in-person) mode.
 */
export function isIRLMode(settings: { eventMode: string }): boolean {
    return settings.eventMode === 'IRL';
}

/**
 * Asserts that the tournament is in IRL mode.
 * Throws a descriptive error if the tournament is set to ONLINE.
 */
export function assertIRLMode(settings: { eventMode: string }): void {
    if (!isIRLMode(settings)) {
        throw new Error('Venues are not available for Online tournaments.');
    }
}

/**
 * Asserts that the team member memberCount is within valid range.
 * @param checkMin - whether to enforce the minimum size (default: true). 
 *                   Disable when building teams incrementally.
 */
export function assertValidTeamSize(settings: TournamentSettingsLike, memberCount: number, checkMin = true): void {
    if (checkMin && memberCount < settings.teamSizeMin) {
        throw new Error('TEAM_SIZE_INVALID');
    }
    if (memberCount > settings.teamSizeMax) {
        throw new Error('TEAM_SIZE_INVALID');
    }
}
