'use server';

import { auth } from '@clerk/nextjs/server';
import { updateMyProfile } from '@/lib/services/profile';
import { UpdateProfileSchema, type UpdateProfileInput } from '@/lib/validations/profile';

export type ProfileActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Server action: update the current user's profile fields.
 */
export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<ProfileActionResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  const parsed = UpdateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid input';
    return { success: false, error: firstError };
  }

  try {
    await updateMyProfile(userId, parsed.data);
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to update profile' };
  }
}
