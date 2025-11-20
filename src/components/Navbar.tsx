'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Plus, Search, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import CreateMeetingButton from './CreateMeetingButton';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface InstitutionInvite {
  id: string;
  institutionId: string;
  inviterId: string;
  inviteeEmail: string;
  isCoach: boolean;
  createdAt: string;
  expiresAt: string;
  institution: {
    id: string;
    name: string;
    description: string | null;
  };
  inviter: {
    id: string;
    username: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

interface DebateMeetingInvite {
  id: string;
  meetingId: string;
  inviterId: string;
  inviteeEmail: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  meeting: {
    id: string;
    title: string;
    description: string | null;
    creatorId: string;
    callId: string;
    scheduledAt: string | null;
  };
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [invitations, setInvitations] = useState<InstitutionInvite[]>([]);
  const [meetingInvites, setMeetingInvites] = useState<DebateMeetingInvite[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
        setMeetingInvites(data.meetingInvites || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptInvite = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      const response = await fetch(`/api/invitations/${inviteId}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      toast.success(`Joined ${data.institution.name}!`);
      fetchNotifications(); // Refresh notifications
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      const response = await fetch(`/api/invitations/${inviteId}/reject`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject invitation');
      }

      toast.success('Invitation rejected');
      fetchNotifications(); // Refresh notifications
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleAcceptMeetingInvite = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      const response = await fetch(`/api/meetings/invites/${inviteId}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      toast.success(`Accepted invitation to "${data.meeting.title}"!`);
      fetchNotifications(); // Refresh notifications
      
      // Redirect to the meeting
      router.push(`/debate/meeting/${data.meeting.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleRejectMeetingInvite = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      const response = await fetch(`/api/meetings/invites/${inviteId}/reject`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject invitation');
      }

      toast.success('Meeting invitation rejected');
      fetchNotifications(); // Refresh notifications
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingInviteId(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1530]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-3 md:px-6">
        <div className="flex h-14 items-center gap-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/icons/debatera.svg"
              alt="Logo"
              width={40}
              height={40}
            />
            <span className="text-lg font-semibold text-white">Debatera</span>
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
              Beta
            </span>
          </Link>

          {/* Search - Global search across debates, teams, tournaments, people. --> Results grouped into tabs; keyboard nav; quick “Join”/“Open” actions inline. */}
          <div className="ml-2 hidden flex-1 items-center md:flex">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                className="h-9 w-full rounded-lg border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
                placeholder="Search debates, teams, tournaments…"
              />
            </div>
          </div>

          {/* Right side CTAs - Buttons for creating a tournament or a debate --> the debate is Quick ad-hoc room creation for your team or training */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              className="hidden sm:flex gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400"
            >
              <Link href="/tournaments/new">
                <Plus className="h-4 w-4" />
                Create Tournament
              </Link>
            </Button>

            <CreateMeetingButton />

            {/* Notifications - Invites, judge assignments, round pairings, schedule changes, feedback received, moderation pings. */}
            <SignedIn>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="relative rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -right-1 -top-1 h-5 min-w-5 px-1 text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="font-semibold">
                    Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : invitations.length === 0 && meetingInvites.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {meetingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="border-b p-3 last:border-b-0"
                        >
                          <div className="mb-2">
                            <p className="text-sm font-medium">
                              Debate Meeting Invitation
                            </p>
                            <p className="text-xs text-muted-foreground">
                              You have been invited to join{' '}
                              <span className="font-semibold">{invite.meeting.title}</span>
                              {' '}as a {invite.role.toLowerCase()}
                            </p>
                            {invite.meeting.description && (
                              <p className="mt-1 text-xs text-muted-foreground italic">
                                {invite.meeting.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptMeetingInvite(invite.id)}
                              disabled={processingInviteId === invite.id}
                            >
                              {processingInviteId === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="mr-1 h-4 w-4" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleRejectMeetingInvite(invite.id)}
                              disabled={processingInviteId === invite.id}
                            >
                              {processingInviteId === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                      {invitations.map((invite) => (
                        <div
                          key={invite.id}
                          className="border-b p-3 last:border-b-0"
                        >
                          <div className="mb-2">
                            <p className="text-sm font-medium">
                              Institution Invitation
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {invite.inviter.username || invite.inviter.email} invited you to join{' '}
                              <span className="font-semibold">{invite.institution.name}</span>
                              {invite.isCoach && ' as a coach'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptInvite(invite.id)}
                              disabled={processingInviteId === invite.id}
                            >
                              {processingInviteId === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="mr-1 h-4 w-4" />
                                  Accept
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleRejectInvite(invite.id)}
                              disabled={processingInviteId === invite.id}
                            >
                              {processingInviteId === invite.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </SignedIn>

            {/* User menu */}

            <SignedIn>
              <div className="ml-1">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonOuterIdentifier: 'hidden md:flex text-white/80',
                    },
                  }}
                />
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button className="rounded-lg bg-white text-black hover:bg-white/90">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      {/* Small-screen search under bar */}
      <div className="block md:hidden border-t border-white/10 px-3 pb-3 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            className="h-9 w-full rounded-lg border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
            placeholder="Search…"
          />
        </div>
      </div>
    </header>
  );
}
