import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { AppRole } from '@prisma/client';
import { NextResponse } from 'next/server';

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
    };
  }
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  if (error) {
    return { error, user: null };
  }

  if (user!.appRole !== AppRole.ADMIN) {
    return {
      error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
      user: null,
    };
  }

  return { user, error: null };
}
