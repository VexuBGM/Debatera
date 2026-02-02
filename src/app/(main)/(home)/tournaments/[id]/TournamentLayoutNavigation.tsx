'use client';

import { usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function TournamentLayoutNavigation() {
    const pathname = usePathname();
    const params = useParams<{ id: string }>();
    const tournamentId = params?.id;

    // If we don't have a tournament ID, we can't link back effectively
    if (!tournamentId) return null;

    // The main dashboard path is /tournaments/[id]
    const dashboardPath = `/tournaments/${tournamentId}`;

    // If we are exactly on the dashboard path, don't show the back button
    // (The dashboard page itself handles back-to-all-tournaments navigation if desired, 
    // or it is the root of this section)
    if (pathname === dashboardPath) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 pt-4">
            <div className="mb-4">
                <Link href={dashboardPath}>
                    <Button variant="ghost" className="pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        </div>
    );
}
