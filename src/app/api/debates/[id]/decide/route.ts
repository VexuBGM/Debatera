import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CallRole, DebateSide, AppRole } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { winningSide } = body;

    // Validation
    if (!winningSide || (winningSide !== DebateSide.PROP && winningSide !== DebateSide.OPP)) {
      return NextResponse.json(
        { error: 'winningSide must be PROP or OPP' },
        { status: 400 }
      );
    }

    // Verify debate exists
    const debate = await prisma.debate.findUnique({
      where: { id },
      include: {
        participants: true,
      },
    });

    if (!debate) {
      return NextResponse.json(
        { error: 'Debate not found' },
        { status: 404 }
      );
    }

    // Authorization: user must be a judge in this debate OR an admin
    const isJudge = debate.participants.some(
      p => p.userId === user!.id && p.role === CallRole.JUDGE
    );
    const isAdmin = user!.appRole === AppRole.ADMIN;

    if (!isJudge && !isAdmin) {
      return NextResponse.json(
        { error: 'Only judges in this debate or admins can set the final decision' },
        { status: 403 }
      );
    }

    // Update debate with winning side
    const updated = await prisma.debate.update({
      where: { id },
      data: { winningSide },
      include: {
        propTeam: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        oppTeam: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
        tournament: {
          select: {
            id: true,
            name: true,
            isVerified: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                imageUrl: true,
              },
            },
          },
        },
        feedback: {
          include: {
            judge: {
              select: {
                id: true,
                username: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error setting debate decision:', error);
    return NextResponse.json(
      { error: 'Failed to set debate decision' },
      { status: 500 }
    );
  }
}
