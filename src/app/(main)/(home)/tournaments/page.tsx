import React from 'react'
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, CheckCircle, Clock } from 'lucide-react';

type Tournament = {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    isVerified: boolean;
    entryFee: number;
    registrationType: 'OPEN' | 'APPROVAL';
}

const Tournaments = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/tournaments`, {cache: 'no-store'})
  if (!res.ok) {
    throw new Error('Failed to fetch tournaments')
  }
  const tournaments: Tournament[] = await res.json()
  
  return (
    <main className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl sm:text-2xl font-semibold">Tournaments</h1>
        <Link href="/tournaments/new">
          <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-md text-sm">
            Create Tournament
          </button>
        </Link>
      </div>
      {tournaments.length === 0 ? (
        <p className="text-sm sm:text-base">No tournaments.</p>
      ) : (
        <ul className="space-y-3">
          {tournaments.map(t => {
            const startDate = new Date(t.startDate);
            const isUpcoming = startDate > new Date();
            
            return (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <li className="rounded-lg border p-4 hover:border-cyan-500/50 transition-colors bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-base sm:text-lg font-medium">{t.name}</h2>
                    <div className="flex gap-2">
                      {t.isVerified ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                      {t.registrationType === 'APPROVAL' && (
                        <Badge variant="outline">Approval Required</Badge>
                      )}
                    </div>
                  </div>
                  
                  {t.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                      {t.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {startDate.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isUpcoming && (
                        <Badge variant="outline" className="ml-1 text-xs">Upcoming</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>{t.entryFee === 0 ? 'Free' : `$${t.entryFee.toFixed(2)}`}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {t.registrationType === 'OPEN' ? '🌐 Open Entry' : '✓ Approval Required'}
                      </span>
                    </div>
                  </div>
                </li>
              </Link>
            );
          })}
        </ul>
      )}
    </main>
  )
}

export default Tournaments