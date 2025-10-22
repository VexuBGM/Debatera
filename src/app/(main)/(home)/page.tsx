import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Users, Calendar, ArrowRight } from 'lucide-react'
import CreateMeetingButton from '@/components/CreateMeetingButton'

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1530] via-[#0e1a3f] to-[#0b1530]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-bold text-white">
            Welcome to Debatera
          </h1>
          <p className="mb-8 text-xl text-white/70">
            The ultimate platform for debate tournaments and practice
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              asChild
              className="gap-2 rounded-lg bg-cyan-500 px-6 py-6 text-lg text-black hover:bg-cyan-400"
            >
              <Link href="/tournaments">
                <Trophy className="h-5 w-5" />
                Browse Tournaments
              </Link>
            </Button>
            <CreateMeetingButton />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <Trophy className="mb-2 h-8 w-8 text-cyan-400" />
              <CardTitle className="text-white">Tournament System</CardTitle>
              <CardDescription className="text-white/60">
                Power pairing, automatic judge allocation, and real-time standings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-between text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
              >
                <Link href="/tournaments">
                  View Tournaments
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <Users className="mb-2 h-8 w-8 text-cyan-400" />
              <CardTitle className="text-white">Team Management</CardTitle>
              <CardDescription className="text-white/60">
                Create teams, manage members, and track performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="ghost"
                className="w-full justify-between text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
              >
                <Link href="/tournaments">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <Calendar className="mb-2 h-8 w-8 text-cyan-400" />
              <CardTitle className="text-white">Live Debates</CardTitle>
              <CardDescription className="text-white/60">
                Real-time video debates with judge feedback and scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateMeetingButton />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HomePage
