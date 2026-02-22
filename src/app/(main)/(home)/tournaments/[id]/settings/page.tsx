'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar as CalendarIcon, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TournamentSettings {
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
    teamSizeMin: number;
    teamSizeMax: number;
    debateFormat: 'WSDC' | 'BP';
    eventMode: 'ONLINE' | 'IRL';
    showDebaterNames: boolean;
    // BP-specific
    isIronman: boolean;
    speakerScaleMin: number | null;
    speakerScaleMax: number | null;
    rankPointsFirst: number | null;
    rankPointsSecond: number | null;
    rankPointsThird: number | null;
    rankPointsFourth: number | null;
}

export default function TournamentSettingsPage() {
    const params = useParams<{ id: string }>();
    const tournamentId = params?.id;
    const router = useRouter();
    const { userId } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [settings, setSettings] = useState<TournamentSettings>({
        registrationOpensAt: null,
        registrationClosesAt: null,
        teamSizeMin: 2,
        teamSizeMax: 5,
        debateFormat: 'WSDC',
        eventMode: 'IRL',
        showDebaterNames: false,
        isIronman: false,
        speakerScaleMin: null,
        speakerScaleMax: null,
        rankPointsFirst: null,
        rankPointsSecond: null,
        rankPointsThird: null,
        rankPointsFourth: null,
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
                debateFormat: data.debateFormat ?? 'WSDC',
                eventMode: data.eventMode ?? 'IRL',
                showDebaterNames: data.showDebaterNames ?? false,
                isIronman: data.isIronman ?? false,
                speakerScaleMin: data.speakerScaleMin ?? null,
                speakerScaleMax: data.speakerScaleMax ?? null,
                rankPointsFirst: data.rankPointsFirst ?? null,
                rankPointsSecond: data.rankPointsSecond ?? null,
                rankPointsThird: data.rankPointsThird ?? null,
                rankPointsFourth: data.rankPointsFourth ?? null,
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
                debateFormat: data.debateFormat ?? 'WSDC',
                eventMode: data.eventMode ?? 'IRL',
                showDebaterNames: data.showDebaterNames ?? false,
                isIronman: data.isIronman ?? false,
                speakerScaleMin: data.speakerScaleMin ?? null,
                speakerScaleMax: data.speakerScaleMax ?? null,
                rankPointsFirst: data.rankPointsFirst ?? null,
                rankPointsSecond: data.rankPointsSecond ?? null,
                rankPointsThird: data.rankPointsThird ?? null,
                rankPointsFourth: data.rankPointsFourth ?? null,
            });

            toast.success('Settings updated successfully');
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/tournaments/${tournamentId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data?.error || 'Failed to delete tournament');
            }

            toast.success('Tournament deleted successfully');
            router.push('/tournaments');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete tournament');
        } finally {
            setDeleting(false);
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

                    <div className="border-t" />

                    {/* Debate Format & Event Mode */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium leading-none">Format & Mode</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="debateFormat">Debate Format</Label>
                                <select
                                    id="debateFormat"
                                    value={settings.debateFormat}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled
                                >
                                    <option value="WSDC">WSDC</option>
                                    <option value="BP">British Parliamentary (BP)</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Set at tournament creation and cannot be changed.</p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="eventMode">Event Mode</Label>
                                <select
                                    id="eventMode"
                                    value={settings.eventMode}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled
                                >
                                    <option value="IRL">In Real Life (IRL)</option>
                                    <option value="ONLINE">Online</option>
                                </select>
                                <p className="text-xs text-muted-foreground">Set at tournament creation and cannot be changed.</p>
                            </div>
                        </div>
                    </div>

                    {/* BP-Specific Settings */}
                    {settings.debateFormat === 'BP' && (
                        <>
                            <div className="border-t" />
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium leading-none">BP Ironman Mode</h3>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="isIronman">Enable Ironman</Label>
                                        <p className="text-xs text-muted-foreground">
                                            In Ironman mode, each team has exactly 1 debater who delivers all speeches for their bench.
                                            Team size will be set to 1.
                                        </p>
                                    </div>
                                    <Switch
                                        id="isIronman"
                                        checked={settings.isIronman}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSettings(s => ({ ...s, isIronman: true, teamSizeMin: 1, teamSizeMax: 1 }));
                                            } else {
                                                setSettings(s => ({ ...s, isIronman: false, teamSizeMin: 2, teamSizeMax: 2 }));
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="border-t" />
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium leading-none">BP Speaker Scale</h3>
                                <p className="text-xs text-muted-foreground">
                                    The scoring range used for individual speaker speeches in BP rounds.
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="speakerScaleMin">Minimum Score</Label>
                                        <Input
                                            id="speakerScaleMin"
                                            type="number"
                                            min={0}
                                            value={settings.speakerScaleMin ?? 65}
                                            onChange={(e) => setSettings(s => ({ ...s, speakerScaleMin: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="speakerScaleMax">Maximum Score</Label>
                                        <Input
                                            id="speakerScaleMax"
                                            type="number"
                                            min={0}
                                            value={settings.speakerScaleMax ?? 85}
                                            onChange={(e) => setSettings(s => ({ ...s, speakerScaleMax: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t" />
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium leading-none">Ranking Points</h3>
                                <p className="text-xs text-muted-foreground">
                                    Team points awarded based on room ranking (1st through 4th place).
                                </p>
                                <div className="grid gap-4 sm:grid-cols-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="rankPointsFirst">1st Place</Label>
                                        <Input
                                            id="rankPointsFirst"
                                            type="number"
                                            min={0}
                                            value={settings.rankPointsFirst ?? 3}
                                            onChange={(e) => setSettings(s => ({ ...s, rankPointsFirst: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rankPointsSecond">2nd Place</Label>
                                        <Input
                                            id="rankPointsSecond"
                                            type="number"
                                            min={0}
                                            value={settings.rankPointsSecond ?? 2}
                                            onChange={(e) => setSettings(s => ({ ...s, rankPointsSecond: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rankPointsThird">3rd Place</Label>
                                        <Input
                                            id="rankPointsThird"
                                            type="number"
                                            min={0}
                                            value={settings.rankPointsThird ?? 1}
                                            onChange={(e) => setSettings(s => ({ ...s, rankPointsThird: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="rankPointsFourth">4th Place</Label>
                                        <Input
                                            id="rankPointsFourth"
                                            type="number"
                                            min={0}
                                            value={settings.rankPointsFourth ?? 0}
                                            onChange={(e) => setSettings(s => ({ ...s, rankPointsFourth: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="border-t" />

                    {/* Display Options */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium leading-none">Display Options</h3>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="showDebaterNames">Show debater names instead of team names</Label>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, teams are displayed using the names of their debaters (e.g. &quot;Alice &amp; Bob&quot;) instead of the team name.
                                </p>
                            </div>
                            <Switch
                                id="showDebaterNames"
                                checked={settings.showDebaterNames}
                                onCheckedChange={(checked) => setSettings(s => ({ ...s, showDebaterNames: checked }))}
                            />
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

            {/* Danger Zone */}
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                        Irreversible actions that permanently affect your tournament.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Delete this tournament</p>
                            <p className="text-sm text-muted-foreground">
                                Once deleted, all tournament data including teams, rounds, and ballots will be permanently removed.
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={deleting}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Tournament
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the tournament
                                        and all associated data including teams, rounds, debates, and ballots.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {deleting ? 'Deleting...' : 'Yes, delete tournament'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
