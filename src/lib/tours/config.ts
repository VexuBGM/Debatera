/**
 * TOUR CONFIGURATION
 * ==================
 * This is the single file to edit when adding, removing, or changing tour steps.
 *
 * To add a new tour:
 *   1. Add a new entry to TOURS below with a unique id and steps array.
 *   2. Add `data-tour="<target>"` attributes to the relevant DOM elements.
 *   3. Call `useTourTrigger('your-tour-id')` in the target page component.
 *
 * Step `target` values must match a `data-tour` attribute in the DOM.
 * Omit `target` (or use `position: 'center'`) for a centered card with no anchor.
 */

import type { TourConfig } from './types';

export const TOURS = {
  // ─── Dashboard ───────────────────────────────────────────────────────────────
  dashboard: {
    id: 'dashboard',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Debatera!',
        description:
          "You're on your personal dashboard. Here you'll find upcoming tournaments, your institutions, and quick actions to get started.",
        position: 'center',
      },
      {
        id: 'sidebar-home',
        title: 'Navigation Sidebar',
        description:
          'Use the sidebar to navigate between Home, your profile, institutions, and tournaments. Your active tournaments appear here grouped by role.',
        target: 'sidebar-home',
        position: 'right',
      },
      {
        id: 'sidebar-tournaments',
        title: 'Tournaments',
        description:
          'Browse all public tournaments or jump straight to the ones you are already part of.',
        target: 'sidebar-tournaments',
        position: 'right',
      },
      {
        id: 'navbar-create',
        title: 'Create a Tournament',
        description:
          'Ready to run your own event? Click here to create a new tournament and become its organizer.',
        target: 'navbar-create',
        position: 'bottom',
      },
      {
        id: 'navbar-notifications',
        title: 'Notifications',
        description:
          'Institution invitations and other alerts appear here. Keep an eye on the bell icon.',
        target: 'navbar-notifications',
        position: 'bottom',
      },
      {
        id: 'dashboard-stats',
        title: 'Your Activity at a Glance',
        description:
          'See your tournament and institution counts, upcoming deadlines, and live rounds all in one place.',
        target: 'dashboard-stats',
        position: 'bottom',
      },
      {
        id: 'dashboard-quick-actions',
        title: 'Quick Actions',
        description:
          'These cards let you browse tournaments, manage your institutions, or create a new tournament without navigating the sidebar.',
        target: 'dashboard-quick-actions',
        position: 'top',
      },
    ],
  },

  // ─── Tournament List ──────────────────────────────────────────────────────────
  'tournaments-list': {
    id: 'tournaments-list',
    steps: [
      {
        id: 'welcome',
        title: 'Browse Tournaments',
        description:
          'This page lists all public tournaments on Debatera. You can search by name and filter by status.',
        position: 'center',
      },
      {
        id: 'tournaments-list-search',
        title: 'Search & Filter',
        description:
          'Type a tournament name to search, or use the status tabs to show only open, in-progress, or completed events.',
        target: 'tournaments-list-search',
        position: 'bottom',
      },
      {
        id: 'tournaments-list-card',
        title: 'Tournament Cards',
        description:
          'Each card shows the tournament name, format, registration status, and team count. Click a card to view details and register.',
        target: 'tournaments-list-card',
        position: 'bottom',
      },
    ],
  },

  // ─── Tournament Overview — Organizer ──────────────────────────────────────────
  'tournament-overview-organizer': {
    id: 'tournament-overview-organizer',
    steps: [
      {
        id: 'welcome',
        title: "You're the Organizer",
        description:
          "Welcome to your tournament's control center. From here you can manage every aspect of the event — from registration to results.",
        position: 'center',
      },
      {
        id: 'tournament-overview-stats',
        title: 'Tournament Stats',
        description:
          'Track registered teams, rounds created, institutions, and participants in real time.',
        target: 'tournament-overview-stats',
        position: 'bottom',
      },
      {
        id: 'tournament-overview-tabs',
        title: 'Management Tabs',
        description:
          'Use the tabs to navigate between Participants, Teams, Rounds, Venues, Standings, and Settings.',
        target: 'tournament-overview-tabs',
        position: 'bottom',
      },
      {
        id: 'tournament-overview-registrations',
        title: 'Pending Registrations',
        description:
          "Review and approve institution registration requests here. Approve an institution to let its members compete in your tournament.",
        target: 'tournament-overview-registrations',
        position: 'left',
      },
    ],
  },

  // ─── Tournament Overview — Participant (Debater / Judge) ──────────────────────
  'tournament-overview-participant': {
    id: 'tournament-overview-participant',
    steps: [
      {
        id: 'welcome',
        title: "You're In!",
        description:
          "Welcome to this tournament's overview page. Here you can see the schedule, standings, and your personal assignments.",
        position: 'center',
      },
      {
        id: 'tournament-overview-stats',
        title: 'Tournament Stats',
        description:
          'See how many teams, rounds, and participants are in this event.',
        target: 'tournament-overview-stats',
        position: 'bottom',
      },
      {
        id: 'tournament-overview-tabs',
        title: 'Tournament Sections',
        description:
          'Navigate to Rounds to see the draw, Standings for rankings, or your personal debates and ballots via the sidebar.',
        target: 'tournament-overview-tabs',
        position: 'bottom',
      },
      {
        id: 'tournament-overview-my-debates',
        title: 'Your Assignments',
        description:
          "Find your debates or ballots to judge under 'My Debates' and 'My Ballots' in the sidebar. You'll get notified when rounds are published.",
        target: 'tournament-overview-my-debates',
        position: 'top',
      },
    ],
  },
} satisfies Record<string, TourConfig>;

export type TourId = keyof typeof TOURS;
