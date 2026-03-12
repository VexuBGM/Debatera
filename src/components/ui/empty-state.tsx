import { cn } from '@/lib/utils';
import { Trophy, Users, Scale, LayoutList, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Button asChild variant="brand">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button variant="brand" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function NoRoundsEmptyState({ tournamentId, isOrganizer }: { tournamentId: string; isOrganizer?: boolean }) {
  return (
    <EmptyState
      icon={<LayoutList className="h-12 w-12" />}
      title="No Rounds Yet"
      description={isOrganizer ? 'Create your first round to start setting up pairings.' : 'No rounds have been published yet.'}
      action={isOrganizer ? { label: 'Create First Round', href: `/tournaments/${tournamentId}/rounds` } : undefined}
    />
  );
}

export function NoTeamsEmptyState({ tournamentId }: { tournamentId: string }) {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12" />}
      title="No Teams Yet"
      description="Register your institution and build teams to participate."
      action={{ label: 'Register Teams', href: `/tournaments/${tournamentId}/register/teams` }}
    />
  );
}

export function NoDebatesEmptyState() {
  return (
    <EmptyState
      icon={<Swords className="h-12 w-12" />}
      title="No Debates Yet"
      description="Debates will appear here once rounds are published and pairings are generated."
    />
  );
}

export function NoBallotsEmptyState() {
  return (
    <EmptyState
      icon={<Scale className="h-12 w-12" />}
      title="No Ballots Yet"
      description="Your ballot assignments will appear here when debates are scheduled."
    />
  );
}
