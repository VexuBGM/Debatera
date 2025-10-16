'use client';

import React from 'react';
import { useGetCalls } from '@/hooks/useGetCalls';
import Loader from '@/components/Loader';
import Link from 'next/link';
import { MessagesSquare, Users, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DebatesPage = () => {
  const { calls, isLoading } = useGetCalls();

  if (isLoading) return <Loader />;

  // Filter for active/upcoming calls
  const now = new Date();
  const activeCalls = calls.filter((call) => {
    const state = call.state;
    if (!state.startsAt) return false;
    const startTime = new Date(state.startsAt);
    // Show calls that are currently happening or scheduled for the future
    return startTime >= now || (state.participantCount && state.participantCount > 0);
  });

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not scheduled';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  return (
    <div className="min-h-screen px-4 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Active Debates</h1>
          <p className="text-white/60">Join ongoing debates or see what&apos;s scheduled</p>
        </div>

        {/* Debates List */}
        {activeCalls.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-12 text-center">
            <MessagesSquare className="h-16 w-16 text-white/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Active Debates</h2>
            <p className="text-white/60 mb-6">
              There are no active debates at the moment. Start one to get the conversation going!
            </p>
            <Link href="/dashboard">
              <Button variant="secondary" className="rounded-lg bg-white/10 text-white/80 hover:bg-white/15">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeCalls.map((call) => {
              const state = call.state;
              const participants = state.participantCount || 0;
              const startTime = state.startsAt;
              const now = new Date();
              const callStartTime = startTime ? new Date(startTime) : null;
              // A call is live if it has started and has participants
              const isLive = callStartTime ? callStartTime <= now && participants > 0 : false;

              return (
                <div
                  key={call.id}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 transition hover:bg-white/10 hover:border-white/20"
                >
                  {/* Live indicator */}
                  {isLive && (
                    <div className="absolute top-4 right-4">
                      <span className="flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        LIVE
                      </span>
                    </div>
                  )}

                  {/* Debate Info */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2">
                      {state.custom?.description || 'Debate Room'}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(startTime)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{participants} {participants === 1 ? 'participant' : 'participants'}</span>
                      </div>

                      {!isLive && startTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Scheduled</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <Link href={`/debate/${call.id}`}>
                    <Button 
                      className="w-full rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
                    >
                      {isLive ? 'Join Now' : 'View Details'}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebatesPage;
