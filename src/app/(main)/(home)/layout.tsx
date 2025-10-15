import React from 'react'
import { SignedIn, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const HomeLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2342] via-[#0d1b2a] to-[#0A2342]">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold font-heading text-white">
              Debatera
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="text-cyan-400 font-medium">
                Dashboard
              </Link>
              <Link href="/tournaments" className="text-white/70 hover:text-white transition-colors">
                Tournaments
              </Link>
              <Link href="/profile" className="text-white/70 hover:text-white transition-colors">
                Profile
              </Link>
              <Button
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
              >
                Sign Out
              </Button>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </nav>
          </div>
        </div>
      </header>
      
      {children}
    </div>
  )
}

export default HomeLayout
