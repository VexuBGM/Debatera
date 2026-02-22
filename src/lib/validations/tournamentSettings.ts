import { z } from 'zod';

export const DebateFormatEnum = z.enum(['WSDC', 'BP']);
export const EventModeEnum = z.enum(['ONLINE', 'IRL']);

export const TournamentSettingsInputSchema = z.object({
    registrationOpensAt: z.string().datetime().nullable().optional(),
    registrationClosesAt: z.string().datetime().nullable().optional(),
    teamSizeMin: z.number().int().min(1).default(2),
    teamSizeMax: z.number().int().min(1).default(5),
    debateFormat: DebateFormatEnum.default('WSDC'),
    showDebaterNames: z.boolean().optional(),
    // BP-specific settings (optional; only meaningful when debateFormat === 'BP')
    speakerScaleMin: z.number().int().min(0).nullable().optional(),
    speakerScaleMax: z.number().int().min(0).nullable().optional(),
    rankPointsFirst: z.number().int().min(0).nullable().optional(),
    rankPointsSecond: z.number().int().min(0).nullable().optional(),
    rankPointsThird: z.number().int().min(0).nullable().optional(),
    rankPointsFourth: z.number().int().min(0).nullable().optional(),
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
}).refine((data) => {
    // BP tournaments must have team size 2
    if (data.debateFormat === 'BP') {
        return data.teamSizeMin === 2 && data.teamSizeMax === 2;
    }
    return true;
}, {
    message: "BP format requires team size of exactly 2",
    path: ["teamSizeMin"],
}).refine((data) => {
    // Speaker scale: min < max if both set
    if (data.speakerScaleMin != null && data.speakerScaleMax != null) {
        return data.speakerScaleMin < data.speakerScaleMax;
    }
    return true;
}, {
    message: "speakerScaleMin must be less than speakerScaleMax",
    path: ["speakerScaleMin"],
});

export type TournamentSettingsInput = z.infer<typeof TournamentSettingsInputSchema>;

