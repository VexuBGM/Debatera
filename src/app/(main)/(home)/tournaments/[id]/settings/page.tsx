'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar as CalendarIcon, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TournamentSettings {
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
    teamSizeMin: number;
    teamSizeMax: number;
}

export default function TournamentSettingsPage() {
    const params = useParams<{ id: string }>();
    const tournamentId = params?.id;
    const router = useRouter();
    const { userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<TournamentSettings>({
        registrationOpensAt: null,
        registrationClosesAt: null,
        teamSizeMin: 2,
        teamSizeMax: 5,
    });

    useEffect(() => {
        if (!tournamentId) return;
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tournamentId]);

    async function fetchSettings() {
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/settings`);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 403) {
                    toast.error("You are not authorized to view these settings.");
                    router.push(`/tournaments/${tournamentId}`);
                    return;
                }
                throw new Error(data?.error || 'Failed to fetch settings');
            }

            setSettings({
                registrationOpensAt: data.registrationOpensAt,
                registrationClosesAt: data.registrationClosesAt,
                teamSizeMin: data.teamSizeMin,
                teamSizeMax: data.teamSizeMax,
            });
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || 'Failed to update settings');
            }

            setSettings({
                registrationOpensAt: data.registrationOpensAt,
                registrationClosesAt: data.registrationClosesAt,
                teamSizeMin: data.teamSizeMin,
                teamSizeMax: data.teamSizeMax,
            });

            toast.success('Settings updated successfully');
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="max-w-2xl mx-auto p-4 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-96 w-full" />
            </main>
        );
    }

    return (
        <main className="max-w-2xl mx-auto p-4 space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/tournaments/${tournamentId}`}>
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-semibold">Tournament Settings</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registration & Teams</CardTitle>
                    <CardDescription>Configure registration windows and team size limits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Registration Window */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium leading-none">Registration Window</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <DatePickerField
                                label="Opens At"
                                date={settings.registrationOpensAt ? new Date(settings.registrationOpensAt) : undefined}
                                onSelect={(d) => setSettings(s => ({ ...s, registrationOpensAt: d?.toISOString() ?? null }))}
                            />
                            <DatePickerField
                                label="Closes At"
                                date={settings.registrationClosesAt ? new Date(settings.registrationClosesAt) : undefined}
                                onSelect={(d) => setSettings(s => ({ ...s, registrationClosesAt: d?.toISOString() ?? null }))}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Leave blank to keep registration always open (or until manually closed).
                        </p>
                    </div>

                    <div className="border-t" />

                    {/* Team Size */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium leading-none">Team Size Limits</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="teamSizeMin">Minimum Members</Label>
                                <Input
                                    id="teamSizeMin"
                                    type="number"
                                    min={1}
                                    value={settings.teamSizeMin}
                                    onChange={(e) => setSettings(s => ({ ...s, teamSizeMin: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="teamSizeMax">Maximum Members</Label>
                                <Input
                                    id="teamSizeMax"
                                    type="number"
                                    min={1}
                                    value={settings.teamSizeMax}
                                    onChange={(e) => setSettings(s => ({ ...s, teamSizeMax: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <span className="animate-spin mr-2">⏳</span>}
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </main>
    );
}

function DatePickerField({ label, date, onSelect }: { label: string, date?: Date, onSelect: (date?: Date) => void }) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={onSelect}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
