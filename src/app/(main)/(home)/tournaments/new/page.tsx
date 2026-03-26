'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Trophy, ArrowLeft, ArrowRight, Check, CalendarDays, Clock3 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { HelpTopics } from '@/components/docs/HelpLink';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Basics', description: 'Name and mode' },
  { label: 'Registration', description: 'Dates and team size' },
  { label: 'Review', description: 'Confirm and create' },
];

export default function CreateTournamentPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1 — Basics
  const [name, setName] = useState('');
  const [eventMode, setEventMode] = useState<'IRL' | 'ONLINE'>('IRL');
  const [description, setDescription] = useState('');

  // Step 2 — Registration
  const [registrationOpen, setRegistrationOpen] = useState('');
  const [registrationClose, setRegistrationClose] = useState('');
  const [teamSizeMin, setTeamSizeMin] = useState('3');
  const [teamSizeMax, setTeamSizeMax] = useState('5');

  const canProceedStep0 = name.trim().length > 0;
  const canProceedStep1 = true; // Registration settings are optional

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('You must be signed in');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          eventMode,
          description: description.trim() || undefined,
          registrationOpen: registrationOpen || undefined,
          registrationClose: registrationClose || undefined,
          teamSizeMin: teamSizeMin ? parseInt(teamSizeMin) : undefined,
          teamSizeMax: teamSizeMax ? parseInt(teamSizeMax) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tournament');
      }

      toast.success('Tournament created');
      router.push(`/tournaments/${data.id}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to create tournament');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer size="sm">
      <Link href="/tournaments">
        <Button variant="ghost-muted" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tournaments
        </Button>
      </Link>

      <PageHeader
        icon={<Trophy className="h-7 w-7 text-brand" />}
        title="Create Tournament"
        description="Set up a new debate tournament in a few steps."
      />

      <HelpTopics
        topics={[
          { section: 'Creating a Tournament' },
          { section: 'Configuring Tournament Settings', label: 'Tournament settings' },
        ]}
      />

      <StepIndicator steps={STEPS} currentStep={step} className="mb-2" />

      {/* Step 1: Basics */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tournament Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Championship 2026"
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventMode">Event Mode <span className="text-destructive">*</span></Label>
              <select
                id="eventMode"
                value={eventMode}
                onChange={(e) => setEventMode(e.target.value as 'IRL' | 'ONLINE')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="IRL">In Real Life (IRL)</option>
                <option value="ONLINE">Online</option>
              </select>
              <p className="text-xs text-muted-foreground">Cannot be changed after creation.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your tournament..."
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="brand" onClick={() => setStep(1)} disabled={!canProceedStep0}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Registration */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Registration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateTimePickerField
                id="regOpen"
                label="Registration Opens"
                value={registrationOpen}
                onChange={setRegistrationOpen}
                placeholder="Pick date and time"
              />
              <DateTimePickerField
                id="regClose"
                label="Registration Closes"
                value={registrationClose}
                onChange={setRegistrationClose}
                placeholder="Pick date and time"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamMin">Min Team Size</Label>
                <Input
                  id="teamMin"
                  type="number"
                  min={1}
                  max={10}
                  value={teamSizeMin}
                  onChange={(e) => setTeamSizeMin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamMax">Max Team Size</Label>
                <Input
                  id="teamMax"
                  type="number"
                  min={1}
                  max={10}
                  value={teamSizeMax}
                  onChange={(e) => setTeamSizeMax(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              These settings can also be configured later from the tournament Settings page.
            </p>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="brand" onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>

                <span className="text-muted-foreground">Event Mode</span>
                <span className="font-medium">{eventMode === 'IRL' ? 'In Real Life' : 'Online'}</span>

                {description && (
                  <>
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-medium">{description}</span>
                  </>
                )}

                {registrationOpen && (
                  <>
                    <span className="text-muted-foreground">Registration Opens</span>
                    <span className="font-medium">{new Date(registrationOpen).toLocaleString()}</span>
                  </>
                )}

                {registrationClose && (
                  <>
                    <span className="text-muted-foreground">Registration Closes</span>
                    <span className="font-medium">{new Date(registrationClose).toLocaleString()}</span>
                  </>
                )}

                <span className="text-muted-foreground">Team Size</span>
                <span className="font-medium">{teamSizeMin} - {teamSizeMax} members</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button variant="brand" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                ) : (
                  <><Check className="mr-2 h-4 w-4" /> Create Tournament</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

function DateTimePickerField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const parsedDate = parseDateTimeLocal(value);

  const handleDateSelect = (nextDate?: Date) => {
    if (!nextDate) {
      onChange('');
      return;
    }

    const base = parsedDate ? new Date(parsedDate) : new Date();
    base.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    onChange(toDateTimeLocalValue(base));
  };

  const handleTimePartChange = (part: 'hour' | 'minute' | 'period', nextValue: string) => {
    const base = parsedDate ? new Date(parsedDate) : new Date();

    let currentHour24 = base.getHours();
    const currentMinute = base.getMinutes();
    const currentHour12 = currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;
    const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';

    let hour12 = currentHour12;
    let minute = currentMinute;
    let period = currentPeriod;

    if (part === 'hour') {
      hour12 = Number(nextValue);
    }
    if (part === 'minute') {
      minute = Number(nextValue);
    }
    if (part === 'period') {
      period = nextValue as 'AM' | 'PM';
    }

    currentHour24 = hour12 % 12;
    if (period === 'PM') {
      currentHour24 += 12;
    }

    base.setHours(currentHour24, minute, 0, 0);
    onChange(toDateTimeLocalValue(base));
  };

  const hour24 = parsedDate?.getHours() ?? 12;
  const minute = parsedDate?.getMinutes() ?? 0;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 >= 12 ? 'PM' : 'AM';

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              'h-10 w-full justify-start gap-2 text-left font-normal',
              !parsedDate && 'text-muted-foreground'
            )}
          >
            <CalendarDays className="h-4 w-4 text-foreground" />
            <span className="truncate">
              {parsedDate ? format(parsedDate, 'PPP p') : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div className="rounded-md border bg-popover p-3">
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="mt-2 border-t pt-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5 text-foreground" />
                Time
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={String(hour12)} onValueChange={(next) => handleTimePartChange('hour', next)}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {String(h).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={String(minute)} onValueChange={(next) => handleTimePartChange('minute', next)}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {String(m).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={period} onValueChange={(next) => handleTimePartChange('period', next)}>
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onChange('')}>
                  Clear
                </Button>
                <Button variant="secondary" size="sm" onClick={() => onChange(toDateTimeLocalValue(new Date()))}>
                  Now
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function parseDateTimeLocal(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
