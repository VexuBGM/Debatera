'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { updateProfileAction } from '@/actions/profile.actions';
import { toast } from 'sonner';
import type { MyProfileData } from '@/lib/services/profile';

interface ProfileEditFormProps {
  user: MyProfileData;
}

export default function ProfileEditForm({ user }: ProfileEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [pronouns, setPronouns] = useState(user?.pronouns ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [publicEmail, setPublicEmail] = useState(user?.publicEmail ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const result = await updateProfileAction({
      displayName: displayName || null,
      pronouns: pronouns || null,
      bio: bio || null,
      publicEmail,
    });

    setSaving(false);

    if (result.success) {
      toast.success('Profile updated');
      router.push('/me');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Failed to save');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Edit profile</CardTitle>
          <CardDescription className="text-white/50">
            Update your public profile information.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-white/80">
              Display name
            </Label>
            <Input
              id="displayName"
              placeholder="How you want to be called"
              maxLength={128}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <p className="text-xs text-white/40">
              If empty, your first + last name will be used.
            </p>
          </div>

          {/* Pronouns */}
          <div className="space-y-1.5">
            <Label htmlFor="pronouns" className="text-white/80">
              Pronouns
            </Label>
            <Input
              id="pronouns"
              placeholder="e.g. she/her, he/him, they/them"
              maxLength={64}
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-white/80">
              Bio
            </Label>
            <Textarea
              id="bio"
              placeholder="Tell others about yourself…"
              maxLength={1000}
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
            />
            <p className="text-xs text-white/40">{bio.length}/1000</p>
          </div>

          {/* Public email toggle */}
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
            <div>
              <Label className="text-white/80">Show email on public profile</Label>
              <p className="text-xs text-white/40 mt-0.5">
                When enabled, your email will be visible to other logged-in users.
              </p>
            </div>
            <Switch
              checked={publicEmail}
              onCheckedChange={setPublicEmail}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="border-white/10 text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
