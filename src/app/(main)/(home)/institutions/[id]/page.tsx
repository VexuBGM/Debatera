'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  Users,
  ArrowLeft,
  Shield,
  User,
  UserPlus,
  MoreHorizontal,
  LogOut,
  Trash2,
  Crown,
  Mail,
  Clock,
  X,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import {
  createInstitutionInvitation,
  getInstitutionPendingInvitations,
  revokeInstitutionInvite,
  leaveInstitution,
  removeMember,
  promoteMemberToAdmin,
  deleteInstitution,
} from '@/actions/invitation.actions';
import { displayNameFromDbUser, initialsFromDbUser } from '@/lib/users/displayName';

interface InstitutionMember {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  createdAt: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    imageUrl: string | null;
  };
}

interface PendingInvitation {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  status: string;
  createdAt: string;
  invitedUser: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  };
  createdBy: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

interface Institution {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  members: InstitutionMember[];
  registrations?: { id: string }[];
}

export default function InstitutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [isInviting, setIsInviting] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [processingMemberId, setProcessingMemberId] = useState<string | null>(null);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const institutionId = params.id as string;

  const fetchInstitution = useCallback(async () => {
    try {
      const response = await fetch(`/api/institutions/${institutionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('Institution not found');
          router.push('/institutions');
          return;
        }
        throw new Error('Failed to fetch institution');
      }
      const data = await response.json();
      setInstitution(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [institutionId, router]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!institutionId) return;
    const result = await getInstitutionPendingInvitations(institutionId);
    if (result.success) {
      setPendingInvitations(result.invitations as PendingInvitation[]);
    }
  }, [institutionId]);

  const isAdmin = institution?.members.find(
    (m) => m.userId === userId && m.role === 'ADMIN'
  );

  const isMember = institution?.members.find((m) => m.userId === userId);

  useEffect(() => {
    fetchInstitution();
  }, [fetchInstitution]);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingInvitations();
    }
  }, [isAdmin, fetchPendingInvitations]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      const result = await createInstitutionInvitation(
        institutionId,
        inviteIdentifier.trim(),
        inviteRole
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Invitation sent successfully!');
      setInviteIdentifier('');
      setInviteRole('MEMBER');
      fetchPendingInvitations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    setProcessingInviteId(invitationId);
    try {
      const result = await revokeInstitutionInvite(invitationId);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('Invitation revoked');
      fetchPendingInvitations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke invitation');
    } finally {
      setProcessingInviteId(null);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    try {
      const result = await leaveInstitution(institutionId);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('You have left the institution');
      router.push('/institutions');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave institution');
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setProcessingMemberId(memberId);
    try {
      const result = await removeMember(institutionId, memberId);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('Member removed');
      fetchInstitution();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handlePromoteMember = async (memberId: string) => {
    setProcessingMemberId(memberId);
    try {
      const result = await promoteMemberToAdmin(institutionId, memberId);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('Member promoted to admin');
      fetchInstitution();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to promote member');
    } finally {
      setProcessingMemberId(null);
    }
  };

  const handleToggleVisibility = async (isPublic: boolean) => {
    setTogglingVisibility(true);
    try {
      const res = await fetch(`/api/institutions/${institutionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to update visibility');
      }

      setInstitution((prev) => prev ? { ...prev, isPublic } : prev);
      toast.success(isPublic ? 'Institution is now public' : 'Institution is now private');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleDeleteInstitution = async () => {
    if (!deleteConfirmName.trim()) {
      toast.error('Please type the institution name to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteInstitution(institutionId, deleteConfirmName);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success('Institution deleted successfully');
      router.push('/institutions');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete institution');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer size="md">
        <Skeleton className="h-6 sm:h-8 w-32 sm:w-48 mb-3 sm:mb-4" />
        <Skeleton className="h-8 sm:h-12 w-64 sm:w-96 mb-2" />
        <Skeleton className="h-4 sm:h-6 w-full max-w-2xl mb-6 sm:mb-8" />
      </PageContainer>
    );
  }

  if (!institution) {
    return null;
  }

  return (
    <PageContainer size="md">
      {/* Back link */}
      <Link href="/institutions">
        <Button variant="ghost" size="sm" className="-ml-2 sm:-ml-3 h-8 sm:h-9 text-sm">
          <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          All Institutions
        </Button>
      </Link>

      {/* Header */}
      <PageHeader
        icon={<Building2 className="h-7 w-7 text-brand" />}
        title={institution.name}
        actions={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isMember && (
              <Badge variant="outline" className="text-xs sm:text-sm">
                {isAdmin ? (
                  <>
                    <Shield className="mr-1 h-3 w-3" /> Admin
                  </>
                ) : (
                  <>
                    <User className="mr-1 h-3 w-3" /> Member
                  </>
                )}
              </Badge>
            )}
            {isMember && (
              <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                    <LogOut className="mr-1 h-3 w-3" />
                    Leave
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Leave Institution</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to leave {institution.name}? You will need to be
                      invited again to rejoin.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleLeave}
                      disabled={isLeaving}
                    >
                      {isLeaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="mr-2 h-4 w-4" />
                      )}
                      Leave Institution
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {isAdmin && (
              <Dialog open={showDeleteDialog} onOpenChange={(open) => {
                setShowDeleteDialog(open);
                if (!open) setDeleteConfirmName('');
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Institution</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete the institution,
                      all memberships, and pending invitations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="confirmName" className="text-sm font-medium">
                      Type <span className="font-bold text-foreground">{institution.name}</span> to confirm:
                    </Label>
                    <Input
                      id="confirmName"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder="Enter institution name"
                      className="mt-2"
                      autoComplete="off"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setShowDeleteDialog(false);
                      setDeleteConfirmName('');
                    }}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteInstitution}
                      disabled={isDeleting || deleteConfirmName.trim().toLowerCase() !== institution.name.toLowerCase()}
                    >
                      {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Delete Institution
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 mb-6 sm:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs sm:text-sm">Members</CardDescription>
            <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-brand" />
              {institution.members.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs sm:text-sm">Tournament Registrations</CardDescription>
            <CardTitle className="text-xl sm:text-2xl">
              {institution.registrations?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Admin Section: Visibility */}
      {isAdmin && (
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Visibility</CardTitle>
            <CardDescription>Control who can discover this institution in the listings.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isPublic" className="text-sm font-medium">Public institution</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this institution will appear in the public listing for all users.
                  When private, only members can see it.
                </p>
              </div>
              <Switch
                id="isPublic"
                checked={institution.isPublic}
                onCheckedChange={handleToggleVisibility}
                disabled={togglingVisibility}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Section: Invite Members */}
      {isAdmin && (
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-brand" />
              Invite Members
            </CardTitle>
            <CardDescription>
              Invite new members by their email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="identifier" className="sr-only">
                  Email
                </Label>
                <Input
                  id="identifier"
                  placeholder="Enter email address..."
                  value={inviteIdentifier}
                  onChange={(e) => setInviteIdentifier(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-full sm:w-40">
                <Label htmlFor="role" className="sr-only">
                  Role
                </Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'ADMIN' | 'MEMBER')}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={isInviting} className="bg-brand hover:bg-brand/90">
                {isInviting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Admin Section: Pending Invitations */}
      {isAdmin && pendingInvitations.length > 0 && (
        <Card className="mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {pendingInvitations.length} pending invitation
              {pendingInvitations.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {displayNameFromDbUser(invitation.invitedUser)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {invitation.role.toLowerCase()} •{' '}
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeInvite(invitation.id)}
                    disabled={processingInviteId === invitation.id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    {processingInviteId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1 h-4 w-4" />
                        Revoke
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Members</CardTitle>
          <CardDescription>
            {institution.members.length} member{institution.members.length !== 1 ? 's' : ''} in this institution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {institution.members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No members yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">User</TableHead>
                    <TableHead className="text-xs sm:text-sm">Role</TableHead>
                    <TableHead className="text-xs sm:text-sm">Joined</TableHead>
                    {isAdmin && <TableHead className="text-xs sm:text-sm w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {institution.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {initialsFromDbUser(member.user)}
                          </div>
                          <div>
                            <div className="font-medium truncate max-w-[120px] sm:max-w-none">
                              {displayNameFromDbUser(member.user)}
                            </div>
                            {member.userId === userId && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={member.role === 'ADMIN' ? 'default' : 'secondary'}
                          className="text-[10px] sm:text-xs"
                        >
                          {member.role === 'ADMIN' ? (
                            <>
                              <Shield className="mr-1 h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              Admin
                            </>
                          ) : (
                            'Member'
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {member.userId !== userId && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={processingMemberId === member.id}
                                >
                                  {processingMemberId === member.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {member.role !== 'ADMIN' && (
                                  <DropdownMenuItem
                                    onClick={() => handlePromoteMember(member.id)}
                                  >
                                    <Crown className="mr-2 h-4 w-4" />
                                    Promote to Admin
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove Member
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
