'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Plus, Search, Check, X, Loader2, Menu, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { displayNameFromDbUser } from '@/lib/users/displayName';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
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
import { acceptInstitutionInvite, declineInstitutionInvite } from '@/actions/invitation.actions';

interface InstitutionInviteNotification {
  id: string;
  type: 'INSTITUTION_INVITE';
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  invitation: {
    id: string;
    role: 'ADMIN' | 'MEMBER';
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
    institution: {
      id: string;
      name: string;
    };
    createdBy: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      imageUrl: string | null;
    };
  } | null;
}

interface GeneralNotification {
  id: string;
  type: 'GENERAL';
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
}

type NotificationItem = InstitutionInviteNotification | GeneralNotification;

interface TopNavProps {
  onMenuClick?: () => void;
}

export default function TopNav({ onMenuClick }: TopNavProps = {}) {
  const pathname = usePathname();
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    setIsLoadingNotifications(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [userId]);

  const checkAdminStatus = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.role === 'ADMIN');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      checkAdminStatus();
    }
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      if (userId) fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications, checkAdminStatus]);

  const handleAcceptInvite = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    try {
      const result = await acceptInstitutionInvite(invitationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to accept invitation');
      }

      toast.success('You have joined the institution!');
      fetchNotifications(); // Refresh notifications
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleRejectInvite = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    try {
      const result = await declineInstitutionInvite(invitationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to decline invitation');
      }

      toast.success('Invitation declined');
      fetchNotifications(); // Refresh notifications
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to decline invitation');
    } finally {
      setProcessingInviteId(null);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1530]/70 backdrop-blur-xl">
      <div className="mx-auto max-w-[1400px] px-2 sm:px-4 md:px-6">
        <div className="flex h-12 sm:h-14 items-center gap-2 sm:gap-3">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Brand */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <Image 
              src="/icons/debatera.svg"
              alt="Logo"
              width={32}
              height={32}
              className="sm:w-10 sm:h-10"
            />
            <span className="text-base sm:text-lg font-semibold text-white">Debatera</span>
            <span className="hidden xs:inline-block rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80">
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
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="hidden md:flex gap-1 sm:gap-2 rounded-lg border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black text-xs sm:text-sm"
              >
                <Link href="/admin/verify">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden lg:inline">Admin Panel</span>
                  <span className="lg:hidden">Admin</span>
                </Link>
              </Button>
            )}
            
            <Button
              asChild
              size="sm"
              className="hidden md:flex gap-1 sm:gap-2 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 text-xs sm:text-sm"
            >
              <Link href="/tournaments/new">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden lg:inline">Create Tournament</span>
                <span className="lg:hidden">Tournament</span>
              </Link>
            </Button>

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
                <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-md sm:w-80">
                  <DropdownMenuLabel className="font-semibold text-sm">
                    Notifications
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
                      {notifications.map((notification) => {
                        // Handle Institution Invite notifications
                        if (notification.type === 'INSTITUTION_INVITE') {
                          const inviteNotif = notification as InstitutionInviteNotification;
                          const invitation = inviteNotif.invitation;
                          
                          // Skip if invitation doesn't exist or is not pending
                          if (!invitation || invitation.status !== 'PENDING') {
                            return (
                              <div key={notification.id} className="border-b p-3 last:border-b-0 opacity-60">
                                <p className="text-sm text-muted-foreground">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {invitation ? `Status: ${invitation.status.toLowerCase()}` : 'Invitation no longer available'}
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={notification.id}
                              className={cn(
                                "border-b p-3 last:border-b-0",
                                !notification.isRead && "bg-cyan-500/5"
                              )}
                            >
                              <div className="mb-2">
                                <p className="text-sm font-medium">
                                  Institution Invitation
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {displayNameFromDbUser(invitation.createdBy)} invited you to join{' '}
                                  <span className="font-semibold">{invitation.institution.name}</span>
                                  {invitation.role === 'ADMIN' && ' as an admin'}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => handleAcceptInvite(invitation.id)}
                                  disabled={processingInviteId === invitation.id}
                                >
                                  {processingInviteId === invitation.id ? (
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
                                  onClick={() => handleRejectInvite(invitation.id)}
                                  disabled={processingInviteId === invitation.id}
                                >
                                  {processingInviteId === invitation.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <X className="mr-1 h-4 w-4" />
                                      Decline
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        // Handle general notifications
                        return (
                          <div
                            key={notification.id}
                            className={cn(
                              "border-b p-3 last:border-b-0",
                              !notification.isRead && "bg-cyan-500/5"
                            )}
                          >
                            <p className="text-sm font-medium">{notification.title}</p>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground">{notification.message}</p>
                            )}
                          </div>
                        );
                      })}
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
      <div className="block md:hidden border-t border-white/10 px-2 sm:px-3 pb-2 sm:pb-3 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/40" />
          <Input
            className="h-8 sm:h-9 w-full rounded-lg border-white/10 bg-white/5 pl-8 sm:pl-9 text-sm text-white placeholder:text-white/50 focus-visible:ring-cyan-500/40"
            placeholder="Search…"
          />
        </div>
      </div>
    </header>
  );
}
