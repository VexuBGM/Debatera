import { z } from 'zod';

export const DebateFormatEnum = z.enum(['WSDC']);
export const EventModeEnum = z.enum(['ONLINE', 'IRL']);

export const TournamentSettingsInputSchema = z.object({
    registrationOpensAt: z.string().datetime().nullable().optional(),
    registrationClosesAt: z.string().datetime().nullable().optional(),
    teamSizeMin: z.number().int().min(1).default(2),
    teamSizeMax: z.number().int().min(1).default(5),
    debateFormat: DebateFormatEnum.default('WSDC'),
    showDebaterNames: z.boolean().optional(),
    speakerTopN: z.number().int().min(1).nullable().optional(),
    hideSpeakerPoints: z.boolean().optional(),
}).refine((data) => {
    // teamSizeMax >= teamSizeMin
    return data.teamSizeMax >= data.teamSizeMin;
}, {
    message: "teamSizeMax must be greater than or equal to teamSizeMin",
    path: ["teamSizeMax"],
}).refine((data) => {
    // if both timestamps set, opens < closes
    if (data.registrationOpensAt && data.registrationClosesAt) {
        return new Date(data.registrationOpensAt) < new Date(data.registrationClosesAt);
    }
    return true;
}, {
    message: "registrationOpensAt must be before registrationClosesAt",
    path: ["registrationOpensAt"],
});

export type TournamentSettingsInput = z.infer<typeof TournamentSettingsInputSchema>;

