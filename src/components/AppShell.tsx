'use client';

import { useState } from 'react';
import TopNav from '@/components/Navbar';
import Sidebar from '@/components/SideBar';
import { CommandPalette } from '@/components/CommandPalette';
import { TourProvider } from '@/components/tour/TourProvider';

export interface UserContext {
  isAdmin: boolean;
  isAuthenticated: boolean;
  institutionCount: number;
  activeTournaments: Array<{
    id: string;
    name: string;
    role: 'ORGANIZER' | 'DEBATER' | 'JUDGE';
  }>;
}

interface AppShellProps {
  children: React.ReactNode;
  userContext: UserContext;
  seenTutorials?: string[];
}

export default function AppShell({ children, userContext, seenTutorials = [] }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <TourProvider initialSeenTutorials={seenTutorials}>
      <div className="min-h-screen bg-background text-foreground antialiased">
        <TopNav
          onMenuClick={() => setMobileMenuOpen(true)}
          isAdmin={userContext.isAdmin}
        />
        <div className="mx-auto">
          <div className="flex gap-2 sm:gap-3 lg:gap-4">
            <Sidebar
              mobileOpen={mobileMenuOpen}
              onMobileClose={() => setMobileMenuOpen(false)}
              userContext={userContext}
            />
            <main className="flex-1 py-3 sm:py-4 px-2 sm:px-0 min-w-0">
              {children}
            </main>
          </div>
        </div>
        <CommandPalette />
      </div>
    </TourProvider>
  );
}
