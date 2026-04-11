import Link from 'next/link';
import { Trophy, Users } from 'lucide-react';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { parsePaginationParams, paginationToSkipTake, buildPaginationMeta } from '@/lib/pagination';
import { UrlPaginationControls } from '@/components/ui/url-pagination-controls';
import { TournamentListTour } from './_TournamentListTour';

interface TournamentsPageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

const Tournaments = async ({ searchParams }: TournamentsPageProps) => {
  const { userId } = await auth();
  const sp = await searchParams;
  const pagination = parsePaginationParams(
    new URLSearchParams({
      page: sp.page ?? '1',
      pageSize: sp.pageSize ?? '20',
    }),
  );
  const { skip, take } = paginationToSkipTake(pagination);

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where: {
        OR: [
          { isPublic: true },
          ...(userId
            ? [
                { createdByUserId: userId },
                { tournamentParticipants: { some: { userId } } },
                { tournamentInstitutions: { some: { institution: { members: { some: { userId } } } } } },
              ]
            : []),
        ],
      },
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
    prisma.tournament.count({
      where: {
        OR: [
          { isPublic: true },
          ...(userId
            ? [
                { createdByUserId: userId },
                { tournamentParticipants: { some: { userId } } },
                { tournamentInstitutions: { some: { institution: { members: { some: { userId } } } } } },
              ]
            : []),
        ],
      },
    }),
  ]);

  const paginationMeta = buildPaginationMeta(total, pagination);
  
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
      <TournamentListTour />
      <div className="flex items-center justify-between gap-3" data-tour="tournaments-list-search">
        <h1 className="text-xl sm:text-2xl font-semibold">Tournaments</h1>
        {userId && (
          <Link href="/tournaments/new">
            <button className="bg-brand hover:bg-brand/90 text-brand-foreground px-4 py-2 rounded-md text-sm">
              Create Tournament
            </button>
          </Link>
        )}
      </div>
      {total === 0 ? (
        <p className="text-sm sm:text-base">No tournaments yet. Create one to get started!</p>
      ) : (
        <>
          <ul className="space-y-3 sm:space-y-4">
            {tournaments.map((t, index) => (
              <li key={t.id} data-tour={index === 0 ? 'tournaments-list-card' : undefined}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="block rounded-lg border bg-card p-4 transition-colors hover:border-brand/50"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-brand" />
                      <h2 className="text-base font-medium sm:text-lg">{t.name}</h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground sm:text-sm">
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
                </Link>
              </li>
            ))}
          </ul>
          <UrlPaginationControls paginationMeta={paginationMeta} />
        </>
      )}
    </main>
  )
}

export default Tournaments
