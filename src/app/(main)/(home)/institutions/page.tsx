'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Institution {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: {
    members: number;
    teams: number;
  };
}

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      const response = await fetch('/api/institutions');
      if (!response.ok) throw new Error('Failed to fetch institutions');
      const data = await response.json();
      setInstitutions(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8 text-cyan-500" />
              <h1 className="text-3xl font-bold">Institutions</h1>
            </div>
            <p className="text-muted-foreground">
              Browse institutions or create your own to manage teams and tournaments.
            </p>
          </div>
          <Link href="/institutions/new" className="w-full sm:w-auto">
            <Button className="bg-cyan-500 hover:bg-cyan-600 w-full sm:w-auto text-sm">
              <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Create Institution
            </Button>
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-9 h-9 sm:h-10 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredInstitutions.length === 0 ? (
        <Card className="p-6 sm:p-8 lg:p-12 text-center">
          <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold mb-2">
            {searchQuery ? 'No institutions found' : 'No institutions yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Create the first institution to get started.'}
          </p>
          {!searchQuery && (
            <Link href="/institutions/new">
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="mr-2 h-4 w-4" />
                Create Institution
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInstitutions.map((institution) => (
            <Link key={institution.id} href={`/institutions/${institution.id}`}>
              <Card className="h-full hover:border-cyan-500/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-start justify-between text-base sm:text-lg">
                    <span className="line-clamp-1">{institution.name}</span>
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-8 sm:min-h-10 text-xs sm:text-sm">
                    {institution.description || 'No description provided'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{institution._count.members} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{institution._count.teams} teams</span>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-muted-foreground">
                    Created {new Date(institution.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
