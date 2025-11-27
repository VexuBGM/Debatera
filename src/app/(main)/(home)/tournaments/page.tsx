import React from 'react'
import Link from 'next/link';

type Props = {
    id: string;
    name: string;
    description: string | null;
}

const Tournaments = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/tournaments`, {cache: 'no-store'})
  if (!res.ok) {
    throw new Error('Failed to fetch tournaments')
  }
  const tournaments: Props[] = await res.json()
  return (
    <main className="max-w-2xl mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
      <h1 className="text-xl sm:text-2xl font-semibold">Tournaments</h1>
      {tournaments.length === 0 ? (
        <p className="text-sm sm:text-base">No tournaments.</p>
      ) : (
        <ul className="space-y-2 sm:space-y-3">
          {tournaments.map(t => (
            <Link key={t.id} href={`/tournaments/${t.id}`}>
              <li className="rounded-lg border p-3 sm:p-4 hover:border-cyan-500/50 transition-colors">
                <h2 className="text-sm sm:text-base font-medium">{t.name}</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  {t.description ?? 'No description'}
                </p>
              </li>
            </Link>
          ))}
        </ul>
      )}
    </main>
  )
}

export default Tournaments