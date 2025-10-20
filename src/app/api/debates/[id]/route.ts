import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const debate = await prisma.debate.findUnique({
      where: { id },
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
          orderBy: [
            { role: 'asc' },
            { speakOrder: 'asc' },
          ],
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

    if (!debate) {
      return NextResponse.json(
        { error: 'Debate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(debate);
  } catch (error) {
    console.error('Error fetching debate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debate' },
      { status: 500 }
    );
  }
}
