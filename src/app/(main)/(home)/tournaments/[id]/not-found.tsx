import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy } from 'lucide-react';

export default function TournamentNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <Trophy className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Tournament Not Found</h1>
        <p className="max-w-md text-muted-foreground">
          The tournament you&apos;re looking for doesn&apos;t exist or may have
          been removed.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Browse Tournaments</Link>
      </Button>
    </div>
  );
}
