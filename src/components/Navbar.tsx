'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { acceptInstitutionInvite, declineInstitutionInvite } from '@/actions/invitation.actions';

interface BaseNotification {
  id: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  href?: string | null;
}

interface InstitutionInviteNotification extends BaseNotification {
  type: 'INSTITUTION_INVITE';
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

interface GeneralNotification extends BaseNotification {
  type: 'GENERAL';
}

type NotificationItem = InstitutionInviteNotification | GeneralNotification;

interface TopNavProps {
  onMenuClick?: () => void;
  isAdmin?: boolean;
}

export default function TopNav({ onMenuClick, isAdmin = false }: TopNavProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      if (userId) fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    },
    []
  );

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

  const handleNotificationClick = useCallback(
    async (notification: GeneralNotification) => {
      if (!notification.href) return;

      setNotificationsOpen(false);

      if (!notification.isRead) {
        setNotifications((currentNotifications) =>
          currentNotifications.map((currentNotification) =>
            currentNotification.id === notification.id
              ? { ...currentNotification, isRead: true }
              : currentNotification
          )
        );
        setUnreadCount((currentCount) => Math.max(0, currentCount - 1));

        try {
          await markNotificationAsRead(notification.id);
        } catch (error) {
          console.error('Error marking notification as read:', error);
          fetchNotifications();
        }
      }

      router.push(notification.href);
    },
    [fetchNotifications, markNotificationAsRead, router]
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface-1/70 backdrop-blur-xl">
      <div className="mx-auto max-w-350 px-2 sm:px-4 md:px-6">
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
                className="h-9 w-full rounded-lg border-white/10 bg-white/5 pl-9 text-white placeholder:text-white/50 focus-visible:ring-brand/40"
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
                className="hidden md:flex gap-1 sm:gap-2 rounded-lg border-brand text-brand hover:bg-brand hover:text-brand-foreground text-xs sm:text-sm"
              >
                <Link href="/admin/verify">
                  <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden lg:inline">Admin Panel</span>
                  <span className="lg:hidden">Admin</span>
                </Link>
              </Button>
            )}
            
            <SignedIn>
              <Button
                asChild
                size="sm"
                className="hidden md:flex gap-1 sm:gap-2 rounded-lg bg-brand text-brand-foreground hover:bg-brand/90 text-xs sm:text-sm"
              >
                <Link href="/tournaments/new">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden lg:inline">Create Tournament</span>
                  <span className="lg:hidden">Tournament</span>
                </Link>
              </Button>
            </SignedIn>

            {/* Notifications - Invites, judge assignments, round pairings, schedule changes, feedback received, moderation pings. */}
            <SignedIn>
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
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
                                !notification.isRead && "bg-brand/5"
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
                          <button
                            type="button"
                            key={notification.id}
                            onClick={() => void handleNotificationClick(notification)}
                            disabled={!notification.href}
                            className={cn(
                              "w-full border-b p-3 text-left last:border-b-0",
                              !notification.isRead && "bg-brand/5",
                              notification.href
                                ? "cursor-pointer transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:outline-none"
                                : "cursor-default"
                            )}
                          >
                            <p className="text-sm font-medium">{notification.title}</p>
                            {notification.message && (
                              <p className="text-xs text-muted-foreground">{notification.message}</p>
                            )}
                          </button>
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
      <div className="block md:hidden border-t border-border px-2 sm:px-3 pb-2 sm:pb-3 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-white/40" />
          <Input
            className="h-8 sm:h-9 w-full rounded-lg border-white/10 bg-white/5 pl-8 sm:pl-9 text-sm text-white placeholder:text-white/50 focus-visible:ring-brand/40"
            placeholder="Search…"
          />
        </div>
      </div>
    </header>
  );
}
