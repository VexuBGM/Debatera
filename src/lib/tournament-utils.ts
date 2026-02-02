/**
 * Checks if tournament registration is closed based on the closing date.
 * If no date is set, registration is considered open.
 */
export function isRegistrationClosed(closesAt: Date | null | undefined): boolean {
    if (!closesAt) return false;
    return new Date() > new Date(closesAt);
}
