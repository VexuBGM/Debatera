'use client';

import '../../globals.css';
import React, { useState } from 'react';
import TopNav from '@/components/Navbar';
import Sidebar from '@/components/SideBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-linear-to-b from-[#0b1b34] to-slate-950 text-white antialiased">
        <TopNav onMenuClick={() => setMobileMenuOpen(true)} />
        <div className="mx-auto">
          <div className="flex gap-2 sm:gap-3 lg:gap-4">
            <Sidebar 
              mobileOpen={mobileMenuOpen} 
              onMobileClose={() => setMobileMenuOpen(false)} 
            />
            <main className="flex-1 py-3 sm:py-4 px-2 sm:px-0 min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
