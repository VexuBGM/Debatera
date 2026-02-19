import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';

export default function MainNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <SearchX className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  );
}
