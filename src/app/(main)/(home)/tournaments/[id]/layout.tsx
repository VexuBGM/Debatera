import React from 'react';
import { TournamentLayoutNavigation } from './TournamentLayoutNavigation';

export default function TournamentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <TournamentLayoutNavigation />
            {children}
        </>
    );
}
