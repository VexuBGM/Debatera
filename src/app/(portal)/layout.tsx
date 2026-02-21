import React from 'react';

/**
 * Portal Layout
 *
 * Minimal layout for public portal pages (no Clerk auth, no Navbar/Sidebar).
 * Inherits only the root layout (ClerkProvider + body).
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-linear-to-b from-[#0b1b34] to-slate-950 text-white antialiased">
      <div className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </div>
    </main>
  );
}
