import React from 'react'

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
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tournaments</h1>
      {tournaments.length === 0 ? (
        <p>No tournaments.</p>
      ) : (
        <ul className="space-y-3">
          {tournaments.map(t => (
            <li key={t.id} className="rounded-lg border p-4">
              <h2 className="font-medium">{t.name}</h2>
              <p className="text-sm text-gray-500">
                {t.description ?? 'No description'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default Tournaments