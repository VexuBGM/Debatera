'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { InstitutionRole, InvitationStatus } from '@prisma/client';

// ============================================================================
// USER RESOLUTION HELPER
// ============================================================================

/**
 * Ensure the current Clerk user exists in the local User table.
 * Returns the user record or null if not authenticated.
 */
export async function ensureLocalUserFromClerk() {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  
  const email = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null;

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: email?.toLowerCase() ?? undefined,
      firstName: clerkUser.firstName ?? undefined,
      lastName: clerkUser.lastName ?? undefined,
      imageUrl: clerkUser.imageUrl ?? undefined,
    },
    create: {
      id: userId,
      email: email?.toLowerCase() ?? undefined,
      firstName: clerkUser.firstName ?? undefined,
      lastName: clerkUser.lastName ?? undefined,
      imageUrl: clerkUser.imageUrl ?? undefined,
    },
  });

  return user;
}

/**
 * Resolve a user by email.
 * Usernames are no longer used; all lookups are by email.
 */
async function resolveUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim().toLowerCase();

  // Always treat as email lookup
  return prisma.user.findUnique({
    where: { email: trimmed },
  });
}

// ============================================================================
// INVITATION ACTIONS
// ============================================================================

interface CreateInvitationResult {
  success: boolean;
  error?: string;
  invitation?: {
    id: string;
    institutionId: string;
    invitedUserId: string;
    role: InstitutionRole;
    status: InvitationStatus;
  };
}

/**
 * Create an institution invitation.
 * Resolves the user by email, creates the invitation and a notification.
 */
export async function createInstitutionInvitation(
  institutionId: string,
  identifier: string,
  role: InstitutionRole = InstitutionRole.MEMBER
): Promise<CreateInvitationResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if current user is admin of the institution
  const membership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: currentUser.id },
    },
  });

  if (!membership || membership.role !== InstitutionRole.ADMIN) {
    return { success: false, error: 'Only institution admins can send invitations' };
  }

  // Resolve the target user
  const targetUser = await resolveUserByIdentifier(identifier);
  if (!targetUser) {
    return {
      success: false,
      error: 'User not found. Ask them to sign up first or check spelling.',
    };
  }

  // Check if target user is the current user
  if (targetUser.id === currentUser.id) {
    return { success: false, error: 'You cannot invite yourself' };
  }

  // Check if target user is already a member
  const existingMembership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: targetUser.id },
    },
  });

  if (existingMembership) {
    return { success: false, error: 'User is already a member of this institution' };
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.institutionInvitation.findFirst({
    where: {
      institutionId,
      invitedUserId: targetUser.id,
      status: InvitationStatus.PENDING,
    },
  });

  if (existingInvitation) {
    return { success: false, error: 'A pending invitation already exists for this user' };
  }

  // Get institution name for notification
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { name: true },
  });

  if (!institution) {
    return { success: false, error: 'Institution not found' };
  }

  // Create invitation and notification in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const invitation = await tx.institutionInvitation.create({
      data: {
        institutionId,
        invitedUserId: targetUser.id,
        createdByUserId: currentUser.id,
        role,
        status: InvitationStatus.PENDING,
      },
    });

    await tx.notification.create({
      data: {
        userId: targetUser.id,
        type: 'INSTITUTION_INVITE',
        title: `Invitation to join ${institution.name}`,
        message: `You have been invited to join ${institution.name} as ${role === 'ADMIN' ? 'an admin' : 'a member'}.`,
        entityType: 'InstitutionInvitation',
        entityId: invitation.id,
        isRead: false,
      },
    });

    return invitation;
  });

  return {
    success: true,
    invitation: {
      id: result.id,
      institutionId: result.institutionId,
      invitedUserId: result.invitedUserId,
      role: result.role,
      status: result.status,
    },
  };
}

interface AcceptInviteResult {
  success: boolean;
  error?: string;
  membership?: {
    id: string;
    institutionId: string;
    role: InstitutionRole;
  };
}

/**
 * Accept an institution invitation.
 * Creates an InstitutionMember, marks invitation as ACCEPTED, and notification as read.
 */
export async function acceptInstitutionInvite(
  invitationId: string
): Promise<AcceptInviteResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  const invitation = await prisma.institutionInvitation.findUnique({
    where: { id: invitationId },
    include: { institution: true },
  });

  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.invitedUserId !== currentUser.id) {
    return { success: false, error: 'This invitation is not for you' };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { success: false, error: `Invitation is already ${invitation.status.toLowerCase()}` };
  }

  // Check if user is already a member (could happen if added through another method)
  const existingMembership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: {
        institutionId: invitation.institutionId,
        userId: currentUser.id,
      },
    },
  });

  if (existingMembership) {
    // Already a member, just mark invitation as accepted
    await prisma.$transaction([
      prisma.institutionInvitation.update({
        where: { id: invitationId },
        data: { status: InvitationStatus.ACCEPTED, respondedAt: new Date() },
      }),
      prisma.notification.updateMany({
        where: {
          entityType: 'InstitutionInvitation',
          entityId: invitationId,
        },
        data: { isRead: true },
      }),
    ]);

    return {
      success: true,
      membership: {
        id: existingMembership.id,
        institutionId: existingMembership.institutionId,
        role: existingMembership.role,
      },
    };
  }

  // Create membership and update invitation/notification in transaction
  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.institutionMember.create({
      data: {
        institutionId: invitation.institutionId,
        userId: currentUser.id,
        role: invitation.role,
      },
    });

    await tx.institutionInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.ACCEPTED, respondedAt: new Date() },
    });

    await tx.notification.updateMany({
      where: {
        entityType: 'InstitutionInvitation',
        entityId: invitationId,
      },
      data: { isRead: true },
    });

    return membership;
  });

  return {
    success: true,
    membership: {
      id: result.id,
      institutionId: result.institutionId,
      role: result.role,
    },
  };
}

interface SimpleResult {
  success: boolean;
  error?: string;
}

/**
 * Decline an institution invitation.
 */
export async function declineInstitutionInvite(
  invitationId: string
): Promise<SimpleResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  const invitation = await prisma.institutionInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  if (invitation.invitedUserId !== currentUser.id) {
    return { success: false, error: 'This invitation is not for you' };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { success: false, error: `Invitation is already ${invitation.status.toLowerCase()}` };
  }

  await prisma.$transaction([
    prisma.institutionInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.DECLINED, respondedAt: new Date() },
    }),
    prisma.notification.updateMany({
      where: {
        entityType: 'InstitutionInvitation',
        entityId: invitationId,
      },
      data: { isRead: true },
    }),
  ]);

  return { success: true };
}

/**
 * Revoke a pending invitation (admin only).
 */
export async function revokeInstitutionInvite(
  invitationId: string
): Promise<SimpleResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  const invitation = await prisma.institutionInvitation.findUnique({
    where: { id: invitationId },
    include: { institution: true },
  });

  if (!invitation) {
    return { success: false, error: 'Invitation not found' };
  }

  // Check if current user is admin of the institution
  const membership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: {
        institutionId: invitation.institutionId,
        userId: currentUser.id,
      },
    },
  });

  if (!membership || membership.role !== InstitutionRole.ADMIN) {
    return { success: false, error: 'Only institution admins can revoke invitations' };
  }

  if (invitation.status !== InvitationStatus.PENDING) {
    return { success: false, error: `Cannot revoke - invitation is already ${invitation.status.toLowerCase()}` };
  }

  await prisma.$transaction([
    prisma.institutionInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED, respondedAt: new Date() },
    }),
    // Delete the notification since the invitation was revoked
    prisma.notification.deleteMany({
      where: {
        entityType: 'InstitutionInvitation',
        entityId: invitationId,
      },
    }),
  ]);

  return { success: true };
}

/**
 * Get pending invitations for an institution (admin only).
 */
export async function getInstitutionPendingInvitations(institutionId: string) {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated', invitations: [] };
  }

  // Check if current user is admin
  const membership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: currentUser.id },
    },
  });

  if (!membership || membership.role !== InstitutionRole.ADMIN) {
    return { success: false, error: 'Only admins can view invitations', invitations: [] };
  }

  const invitations = await prisma.institutionInvitation.findMany({
    where: {
      institutionId,
      status: InvitationStatus.PENDING,
    },
    include: {
      invitedUser: {
        select: { id: true, email: true, firstName: true, lastName: true, imageUrl: true },
      },
      createdBy: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { success: true, invitations };
}

// ============================================================================
// MEMBER MANAGEMENT ACTIONS
// ============================================================================

/**
 * Leave an institution.
 * Last admin cannot leave.
 */
export async function leaveInstitution(
  institutionId: string
): Promise<SimpleResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  const membership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: currentUser.id },
    },
  });

  if (!membership) {
    return { success: false, error: 'You are not a member of this institution' };
  }

  // If user is an admin, check if they're the last admin
  if (membership.role === InstitutionRole.ADMIN) {
    const adminCount = await prisma.institutionMember.count({
      where: {
        institutionId,
        role: InstitutionRole.ADMIN,
      },
    });

    if (adminCount <= 1) {
      return {
        success: false,
        error: 'You are the last admin. Promote another member to admin before leaving.',
      };
    }
  }

  await prisma.institutionMember.delete({
    where: { id: membership.id },
  });

  return { success: true };
}

/**
 * Remove a member from an institution (admin only).
 * Cannot remove self (use leaveInstitution instead).
 * Cannot remove the last admin.
 */
export async function removeMember(
  institutionId: string,
  memberId: string
): Promise<SimpleResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if current user is admin
  const currentMembership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: currentUser.id },
    },
  });

  if (!currentMembership || currentMembership.role !== InstitutionRole.ADMIN) {
    return { success: false, error: 'Only admins can remove members' };
  }

  // Find the member to remove
  const targetMembership = await prisma.institutionMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMembership || targetMembership.institutionId !== institutionId) {
    return { success: false, error: 'Member not found in this institution' };
  }

  // Cannot remove yourself
  if (targetMembership.userId === currentUser.id) {
    return { success: false, error: 'Use "Leave Institution" to remove yourself' };
  }

  // If removing an admin, ensure they're not the last admin
  if (targetMembership.role === InstitutionRole.ADMIN) {
    const adminCount = await prisma.institutionMember.count({
      where: {
        institutionId,
        role: InstitutionRole.ADMIN,
      },
    });

    if (adminCount <= 1) {
      return { success: false, error: 'Cannot remove the last admin' };
    }
  }

  await prisma.institutionMember.delete({
    where: { id: memberId },
  });

  return { success: true };
}

/**
 * Promote a member to admin (admin only).
 */
export async function promoteMemberToAdmin(
  institutionId: string,
  memberId: string
): Promise<SimpleResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if current user is admin
  const currentMembership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: currentUser.id },
    },
  });

  if (!currentMembership || currentMembership.role !== InstitutionRole.ADMIN) {
    return { success: false, error: 'Only admins can promote members' };
  }

  // Find the member to promote
  const targetMembership = await prisma.institutionMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMembership || targetMembership.institutionId !== institutionId) {
    return { success: false, error: 'Member not found in this institution' };
  }

  if (targetMembership.role === InstitutionRole.ADMIN) {
    return { success: false, error: 'Member is already an admin' };
  }

  await prisma.institutionMember.update({
    where: { id: memberId },
    data: { role: InstitutionRole.ADMIN },
  });

  return { success: true };
}

// ============================================================================
// INSTITUTION DELETION
// ============================================================================

/**
 * Delete an institution (admin only).
 * Requires the institution name to be provided for confirmation.
 */
export async function deleteInstitution(
  institutionId: string,
  confirmationName: string
): Promise<SimpleResult> {
  const currentUser = await ensureLocalUserFromClerk();
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get the institution
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId },
    select: { id: true, name: true },
  });

  if (!institution) {
    return { success: false, error: 'Institution not found' };
  }

  // Verify the confirmation name matches
  if (confirmationName.trim().toLowerCase() !== institution.name.toLowerCase()) {
    return { success: false, error: 'Institution name does not match' };
  }

  // Check if current user is admin of the institution
  const membership = await prisma.institutionMember.findUnique({
    where: {
      institutionId_userId: { institutionId, userId: currentUser.id },
    },
  });

  if (!membership || membership.role !== InstitutionRole.ADMIN) {
    return { success: false, error: 'Only institution admins can delete the institution' };
  }

  // Delete the institution (cascade will handle members, invitations, etc.)
  await prisma.institution.delete({
    where: { id: institutionId },
  });

  return { success: true };
}
