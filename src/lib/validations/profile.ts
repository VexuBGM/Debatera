import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  displayName: z
    .string()
    .max(128, 'Display name must be at most 128 characters')
    .trim()
    .optional()
    .nullable(),
  pronouns: z
    .string()
    .max(64, 'Pronouns must be at most 64 characters')
    .trim()
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(1000, 'Bio must be at most 1000 characters')
    .trim()
    .optional()
    .nullable(),
  publicEmail: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
