import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getMyProfile } from '@/lib/services/profile';
import ProfileEditForm from '@/components/profile/ProfileEditForm';

export default async function EditProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getMyProfile(userId);
  if (!user) redirect('/sign-in');

  return (
    <div className="mx-auto max-w-2xl px-2 py-6 sm:px-4">
      <ProfileEditForm user={user} />
    </div>
  );
}
