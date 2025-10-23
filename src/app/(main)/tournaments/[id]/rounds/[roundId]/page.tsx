'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, MapPin, Video, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type Debate = {
  id: string;
  propTeam: { id: string; name: string };
  oppTeam: { id: string; name: string };
  venue?: { id: string; name: string };
  status: string;
  scheduledAt?: string;
  winningSide?: string;
};

type Round = {
  id: string;
  name: string;
  seq: number;
  stage: string;
  isDrawReleased: boolean;
  isMotionReleased: boolean;
  startsAt?: string;
  debates: Debate[];
  motions: {id: string; text: string; infoSlide?: string}[];
};

export default function RoundDetailPage() {
  const params = useParams();
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id || !params.roundId) return;

    fetch(`/api/tournaments/${params.id}/rounds`)
      .then((res) => res.json())
      .then((data) => {
        const foundRound = data.find((r: {id: string}) => r.id === params.roundId);
        setRound(foundRound || null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching round:', err);
        setLoading(false);
      });
  }, [params.id, params.roundId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Loading round...</div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-white/60">Round not found</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'ENDED':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      case 'CANCELED':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">{round.name}</h1>
            <p className="text-white/60">
              {round.stage} Round • Sequence {round.seq}
            </p>
          </div>
        </div>

        {round.startsAt && (
          <div className="flex items-center gap-2 text-white/60 mb-4">
            <Clock className="h-4 w-4" />
            Starts: {new Date(round.startsAt).toLocaleString()}
          </div>
        )}

        <div className="flex items-center gap-3">
          {round.isDrawReleased && (
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm border border-green-500/30">
              Draw Released
            </span>
          )}
          {round.isMotionReleased && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
              Motion Released
            </span>
          )}
        </div>
      </div>

      {/* Motions */}
      {round.motions && round.motions.length > 0 && (
        <div className="mb-8 p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-4">Motion</h2>
          {round.motions.map((motion) => (
            <div key={motion.id} className="mb-4 last:mb-0">
              <p className="text-lg text-white/90 mb-2">{motion.text}</p>
              {motion.infoSlide && (
                <p className="text-sm text-white/60 italic">{motion.infoSlide}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Debates */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">
          Draw ({round.debates?.length || 0} debates)
        </h2>

        {!round.debates || round.debates.length === 0 ? (
          <div className="text-center py-12 text-white/40 bg-[#0d1b2e] border border-white/10 rounded-xl">
            No debates scheduled for this round yet
          </div>
        ) : (
          <div className="space-y-4">
            {round.debates.map((debate, index) => (
              <div
                key={debate.id}
                className="bg-[#0d1b2e] border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-white/40">#{index + 1}</span>
                    {debate.venue && (
                      <div className="flex items-center gap-2 text-white/60">
                        <MapPin className="h-4 w-4" />
                        <span>{debate.venue.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        debate.status
                      )}`}
                    >
                      {debate.status}
                    </span>
                    {debate.status === 'LIVE' && (
                      <Link href={`/debate/${debate.id}`}>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <Video className="mr-2 h-4 w-4" />
                          Join
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Proposition */}
                  <div className="flex items-center gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">PROP</span>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-1">
                        Proposition
                      </p>
                      <p className="font-semibold text-white">
                        {debate.propTeam.name}
                      </p>
                    </div>
                    {debate.winningSide === 'PROP' && (
                      <div className="ml-auto">
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium">
                          Winner
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Opposition */}
                  <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">OPP</span>
                    </div>
                    <div>
                      <p className="text-xs text-white/50 uppercase tracking-wide mb-1">
                        Opposition
                      </p>
                      <p className="font-semibold text-white">
                        {debate.oppTeam.name}
                      </p>
                    </div>
                    {debate.winningSide === 'OPP' && (
                      <div className="ml-auto">
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium">
                          Winner
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {debate.scheduledAt && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                    <Clock className="h-4 w-4" />
                    Scheduled: {new Date(debate.scheduledAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
