import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getPublicProfile } from '@/lib/services/profile';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSections from '@/components/profile/ProfileSections';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) redirect('/sign-in');

  const { userId } = await params;

  const user = await getPublicProfile(userId);

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-white">User not found</h1>
        <p className="mt-2 text-sm text-white/50">
          The user you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
      </div>
    );
  }

  const isOwner = currentUserId === userId;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-2 py-6 sm:px-4">
      <ProfileHeader user={user} isOwner={isOwner} />
      <ProfileSections user={user} isOwner={isOwner} />
    </div>
  );
}
