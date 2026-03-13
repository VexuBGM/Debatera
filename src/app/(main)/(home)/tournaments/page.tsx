import React from 'react'
import Link from 'next/link';
import { Trophy, Users } from 'lucide-react';
import prisma from '@/lib/prisma';
import { parsePaginationParams, paginationToSkipTake, buildPaginationMeta } from '@/lib/pagination';
import { TournamentsPagination } from './_components/TournamentsPagination';

const DEFAULT_PAGE_SIZE = 20;

interface TournamentsPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

const Tournaments = async ({ searchParams }: TournamentsPageProps) => {
  const sp = await searchParams;
  const pagination = parsePaginationParams(
    new URLSearchParams({
      page: sp.page ?? '1',
      pageSize: sp.pageSize ?? String(DEFAULT_PAGE_SIZE),
    }),
  );
  const { skip, take } = paginationToSkipTake(pagination);

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            tournamentInstitutions: true,
          },
        },
      },
      skip,
      take,
    }),
    prisma.tournament.count(),
  ]);

  const paginationMeta = buildPaginationMeta(total, pagination);
  
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
      {total === 0 ? (
        <p className="text-sm sm:text-base">No tournaments yet. Create one to get started!</p>
      ) : (
        <>
          <ul className="space-y-3">
            {tournaments.map(t => (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <li className="rounded-lg border p-4 hover:border-cyan-500/50 transition-colors bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-cyan-500" />
                      <h2 className="text-base sm:text-lg font-medium">{t.name}</h2>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {t._count.tournamentInstitutions} institution
                        {t._count.tournamentInstitutions !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="text-xs">
                      Created {new Date(t.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              </Link>
            ))}
          </ul>
          <TournamentsPagination paginationMeta={paginationMeta} />
        </>
      )}
    </main>
  )
}

export default Tournaments