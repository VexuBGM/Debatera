import '../../globals.css';
import React from 'react';
import Sidebar from '@/components/SideBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen bg-linear-to-br from-[#0b1b34] to-slate-950 text-white antialiased">
        <div className="mx-auto">
          <div className="flex gap-4">
            <Sidebar />
            <main className="flex-1 py-4">
              {children}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
