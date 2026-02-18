import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { computeDisplayName, computeInitials, type PublicProfileData } from '@/lib/services/profile';
import { Building2, Mail } from 'lucide-react';

interface ProfileHeaderProps {
  user: PublicProfileData;
  /** If true, shows the edit button / private label. */
  isOwner?: boolean;
}

export default function ProfileHeader({ user, isOwner }: ProfileHeaderProps) {
  const name = computeDisplayName(user);
  const initials = computeInitials(user);
  const institutions = user.institutionMemberships ?? [];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
      {/* Avatar */}
      <Avatar className="h-24 w-24 text-2xl">
        {user.imageUrl && <AvatarImage src={user.imageUrl} alt={name} />}
        <AvatarFallback className="bg-slate-700 text-white text-xl">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Name & meta */}
      <div className="flex flex-col items-center gap-1.5 sm:items-start">
        <h1 className="text-2xl font-bold">{name}</h1>

        {user.pronouns && (
          <span className="text-sm text-white/60">{user.pronouns}</span>
        )}

        {user.email && (
          <span className="flex items-center gap-1.5 text-sm text-white/60">
            <Mail className="h-3.5 w-3.5" />
            {user.email}
          </span>
        )}

        {/* Institution badges */}
        {institutions.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {institutions.map((m) => (
              <Badge
                key={m.id}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <Building2 className="h-3 w-3" />
                {m.institution.name}
                <span className="text-[10px] text-white/50">
                  ({m.role.toLowerCase()})
                </span>
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-sm text-white/40">No institution</span>
        )}

        {isOwner && (
          <Badge variant="outline" className="mt-1 text-xs text-cyan-400 border-cyan-400/40">
            Your profile
          </Badge>
        )}
      </div>
    </div>
  );
}
