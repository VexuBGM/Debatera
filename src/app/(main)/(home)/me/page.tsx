import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getMyProfile, type PublicProfileData } from '@/lib/services/profile';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileSections from '@/components/profile/ProfileSections';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';

export default async function MyProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await getMyProfile(userId);

  if (!user) {
    redirect('/sign-in');
  }

  // Cast is safe — MyProfileData is a superset of PublicProfileData
  const publicView = user as unknown as PublicProfileData;

  return (
    <PageContainer size="sm">
      <div className="flex items-start justify-between">
        <ProfileHeader user={publicView} isOwner />
        <Link href="/me/edit">
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-white hover:bg-white/5"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
      </div>
      <ProfileSections user={publicView} isOwner />
    </PageContainer>
  );
}
