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
          'This page lists public tournaments on Debatera, along with events you organize or participate in.',
        position: 'center',
      },
      {
        id: 'tournaments-list-card',
        title: 'Tournament Cards',
        description:
          'Each card shows the tournament name, institution count, and creation date. Click a card to view details and register.',
        target: 'tournaments-list-card',
        position: 'bottom',
      },
    ],
  },

  // Create Tournament
  'create-tournament': {
    id: 'create-tournament',
    steps: [
      {
        id: 'welcome',
        title: 'Create a Tournament',
        description:
          'This wizard creates the tournament and its first settings record. Start with the name and event mode, then continue through registration, visibility, and review.',
        position: 'center',
      },
      {
        id: 'steps',
        title: 'Four Setup Choices',
        description:
          'The step tracker shows where you are in the creation flow. Event mode is chosen here and cannot be changed after creation.',
        target: 'create-tournament-steps',
        position: 'bottom',
      },
      {
        id: 'current-step',
        title: 'Current Step',
        description:
          'Fill out the visible step, then use Next to move forward. The final step creates the tournament and opens the organizer setup checklist.',
        target: 'create-tournament-current-step',
        position: 'bottom',
      },
    ],
  },

  // Institutions List
  'institutions-list': {
    id: 'institutions-list',
    steps: [
      {
        id: 'welcome',
        title: 'Institutions',
        description:
          'Institutions are the schools, clubs, or organizations that register people and teams for tournaments.',
        position: 'center',
      },
      {
        id: 'create',
        title: 'Create an Institution',
        description:
          'Create your institution when you need to invite members, register for tournaments, or manage teams under that institution.',
        target: 'institutions-create',
        position: 'bottom',
      },
      {
        id: 'search',
        title: 'Find an Institution',
        description:
          'Use search to narrow the current page of institutions, then open an institution to see its members and admin tools.',
        target: 'institutions-search',
        position: 'bottom',
      },
      {
        id: 'list',
        title: 'Institution Cards',
        description:
          'Public institutions appear here. If the list is empty, start by creating the institution you administer.',
        target: 'institutions-list',
        position: 'top',
      },
    ],
  },

  // Institution Detail
  'institution-detail-admin': {
    id: 'institution-detail-admin',
    steps: [
      {
        id: 'welcome',
        title: 'Institution Workspace',
        description:
          'This is the shared home for your institution. Admins can manage visibility, invitations, and members from here.',
        position: 'center',
      },
      {
        id: 'institution-detail-header',
        title: 'Institution Header',
        description:
          'Use the header to confirm your role and access institution-level actions like leaving or deleting the institution.',
        target: 'institution-detail-header',
        position: 'bottom',
      },
      {
        id: 'institution-detail-stats',
        title: 'Quick Stats',
        description:
          'These numbers summarize the member count and how many tournament registrations are connected to this institution.',
        target: 'institution-detail-stats',
        position: 'bottom',
      },
      {
        id: 'institution-detail-visibility',
        title: 'Visibility',
        description:
          'Control whether this institution appears in the public institution list or stays visible only to members.',
        target: 'institution-detail-visibility',
        position: 'bottom',
      },
      {
        id: 'institution-detail-invites',
        title: 'Invite Members',
        description:
          'Send email invitations and choose whether the new person should join as a member or an admin.',
        target: 'institution-detail-invites',
        position: 'bottom',
      },
      {
        id: 'institution-detail-members',
        title: 'Members',
        description:
          'Review everyone in the institution. Admins can promote members, remove members, and page through larger member lists here.',
        target: 'institution-detail-members',
        position: 'top',
      },
    ],
  },

  'institution-detail-member': {
    id: 'institution-detail-member',
    steps: [
      {
        id: 'welcome',
        title: 'Institution Workspace',
        description:
          'This is the shared home for your institution, with a quick overview and the current member list.',
        position: 'center',
      },
      {
        id: 'institution-detail-header',
        title: 'Institution Header',
        description:
          'Use the header to confirm your role or leave the institution if you no longer need access.',
        target: 'institution-detail-header',
        position: 'bottom',
      },
      {
        id: 'institution-detail-stats',
        title: 'Quick Stats',
        description:
          'These numbers summarize the member count and how many tournament registrations are connected to this institution.',
        target: 'institution-detail-stats',
        position: 'bottom',
      },
      {
        id: 'institution-detail-members',
        title: 'Members',
        description:
          'The members section lists the people in this institution, their roles, and when they joined.',
        target: 'institution-detail-members',
        position: 'top',
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
          'Navigate to Rounds to see the draw, Standings for rankings, or your personal My Debates and My Ballots tabs when those apply to your role.',
        target: 'tournament-overview-tabs',
        position: 'bottom',
      },
      {
        id: 'tournament-overview-my-debates',
        title: 'Your Assignments',
        description:
          "Find your debates or ballots under this tournament's 'My Debates' or 'My Ballots' tabs. You'll get notified when rounds are published.",
        target: 'tournament-overview-my-debates',
        position: 'top',
      },
    ],
  },

  // Tournament Overview - Spectator
  'tournament-overview-spectator': {
    id: 'tournament-overview-spectator',
    steps: [
      {
        id: 'welcome',
        title: 'Tournament Overview',
        description:
          'This is the public view for the tournament. You can follow the sections the organizer has made visible.',
        position: 'center',
      },
      {
        id: 'stats',
        title: 'Tournament Stats',
        description:
          'Use these numbers for a quick read on the event size and current setup.',
        target: 'tournament-overview-stats',
        position: 'bottom',
      },
      {
        id: 'sections',
        title: 'Public Sections',
        description:
          'These tabs show the tournament sections available to you, such as rounds, teams, or standings.',
        target: 'tournament-overview-tabs',
        position: 'bottom',
      },
    ],
  },

  // Tournament Setup
  'tournament-setup-organizer': {
    id: 'tournament-setup-organizer',
    steps: [
      {
        id: 'welcome',
        title: 'Tournament Setup',
        description:
          'This checklist gets a new tournament from empty shell to usable event data.',
        position: 'center',
      },
      {
        id: 'progress',
        title: 'Setup Progress',
        description:
          'The progress card tracks which setup areas already have enough data. Online tournaments skip venue setup automatically.',
        target: 'tournament-setup-progress',
        position: 'bottom',
      },
      {
        id: 'current-step',
        title: 'Current Setup Step',
        description:
          'Work through the visible step to add venues, judges, participants, or teams. The page uses your real tournament data to mark a step complete.',
        target: 'tournament-setup-current-step',
        position: 'bottom',
      },
      {
        id: 'actions',
        title: 'Move at Your Pace',
        description:
          'Use Next when the current step is complete, or Skip for now when you want to continue setup later from the tournament overview.',
        target: 'tournament-setup-actions',
        position: 'top',
      },
    ],
  },

  // Institution Registration
  'tournament-registration-institution': {
    id: 'tournament-registration-institution',
    steps: [
      {
        id: 'welcome',
        title: 'Tournament Registration',
        description:
          'Institution admins use this page to request entry, then add members as debaters or judges once approved.',
        position: 'center',
      },
      {
        id: 'institution',
        title: 'Choose an Institution',
        description:
          'Pick the institution you administer. If you do not administer any institutions yet, create one from the Institutions page first.',
        target: 'registration-institution-selector',
        position: 'bottom',
      },
      {
        id: 'status',
        title: 'Registration Status',
        description:
          'A pending request must be approved by the tournament organizer before you can register members from this institution.',
        target: 'registration-status',
        position: 'bottom',
      },
      {
        id: 'members',
        title: 'Add Members',
        description:
          'Choose whether each member should join as a debater or judge, then register them into the tournament.',
        target: 'registration-members',
        position: 'top',
      },
      {
        id: 'participants',
        title: 'Registered Participants',
        description:
          'Everyone already added from the selected institution appears here. Debaters can be placed onto teams from the Teams tab.',
        target: 'registration-participants',
        position: 'top',
      },
    ],
  },

  // Participants
  'tournament-participants': {
    id: 'tournament-participants',
    steps: [
      {
        id: 'welcome',
        title: 'Participants',
        description:
          'This page is the tournament roster view for judges and debaters.',
        position: 'center',
      },
      {
        id: 'summary',
        title: 'Roster Summary',
        description:
          'Use the header counts to quickly check how many debaters and judges are already in the tournament.',
        target: 'participants-summary',
        position: 'bottom',
      },
      {
        id: 'judge-actions',
        title: 'Add Judges',
        description:
          'Organizers can add one judge or bulk-add judges here. Debaters are added from team management so they inherit the right institution and team context.',
        target: 'participants-actions',
        position: 'bottom',
      },
      {
        id: 'help',
        title: 'Roster Help',
        description:
          'These links explain participant management and the judge portal link workflow.',
        target: 'participants-help',
        position: 'bottom',
      },
      {
        id: 'tabs',
        title: 'Judges and Debaters',
        description:
          'Switch between the judge roster and debater roster. Debaters marked unassigned still need to be placed on a team.',
        target: 'participants-tabs',
        position: 'bottom',
      },
      {
        id: 'portal-links',
        title: 'Judge Portal Links',
        description:
          'When judges exist, organizers can generate portal links so judges can access ballots without creating an account.',
        target: 'participants-portal-links',
        position: 'top',
      },
    ],
  },

  // Team Management
  'tournament-teams-management': {
    id: 'tournament-teams-management',
    steps: [
      {
        id: 'welcome',
        title: 'Team Management',
        description:
          'This page turns registered debaters into tournament teams.',
        position: 'center',
      },
      {
        id: 'controls',
        title: 'Institution Controls',
        description:
          'Switch institutions here. Organizers can also create a new institution and team from the Create Team dialog.',
        target: 'team-management-controls',
        position: 'bottom',
      },
      {
        id: 'create',
        title: 'Create Teams',
        description:
          'Create the team first, then add guest debaters directly or move already registered debaters into the team.',
        target: 'team-management-create-team',
        position: 'bottom',
      },
      {
        id: 'board',
        title: 'Assign Debaters',
        description:
          'Use the board to keep track of unassigned debaters and team rosters. Team-size limits come from the tournament settings.',
        target: 'team-management-board',
        position: 'top',
      },
    ],
  },

  // Rounds
  'tournament-rounds-organizer': {
    id: 'tournament-rounds-organizer',
    steps: [
      {
        id: 'welcome',
        title: 'Rounds',
        description:
          'Rounds move the tournament from setup into live debates, ballots, results, and standings.',
        position: 'center',
      },
      {
        id: 'create',
        title: 'Create a Round',
        description:
          'Create a round, then open it to set the motion, generate or edit pairings, and assign judges.',
        target: 'rounds-create',
        position: 'bottom',
      },
      {
        id: 'help',
        title: 'Round Lifecycle',
        description:
          'Rounds progress from draft to published, in progress, and completed. The help links explain each step.',
        target: 'rounds-help',
        position: 'bottom',
      },
      {
        id: 'list',
        title: 'Round List',
        description:
          'Open a round to edit details. Once the round is ready, publishing it creates the participant-facing draw and ballots.',
        target: 'rounds-list',
        position: 'top',
      },
    ],
  },

  'tournament-rounds-participant': {
    id: 'tournament-rounds-participant',
    steps: [
      {
        id: 'welcome',
        title: 'Tournament Rounds',
        description:
          'This page lists the rounds you can view in this tournament.',
        position: 'center',
      },
      {
        id: 'help',
        title: 'What Rounds Mean',
        description:
          'Published rounds reveal pairings, motions, and the information participants need before debating or judging.',
        target: 'rounds-help',
        position: 'bottom',
      },
      {
        id: 'list',
        title: 'Available Rounds',
        description:
          'Open a round to see its draw and debate details. Draft rounds stay hidden from participants.',
        target: 'rounds-list',
        position: 'top',
      },
    ],
  },

  // Judge Ballots
  'tournament-my-ballots': {
    id: 'tournament-my-ballots',
    steps: [
      {
        id: 'welcome',
        title: 'My Ballots',
        description:
          'This page collects your judging assignments for this tournament.',
        position: 'center',
      },
      {
        id: 'list',
        title: 'Ballot Cards',
        description:
          'Each card shows the round, debate, your panel role, and whether the ballot is still a draft or already submitted.',
        target: 'my-ballots-list',
        position: 'bottom',
      },
      {
        id: 'action',
        title: 'Enter or Review',
        description:
          'Open a draft ballot to score speeches and submit your decision. Submitted ballots can be viewed, and reopened only through modification requests.',
        target: 'my-ballots-action',
        position: 'left',
      },
    ],
  },

  // Ballot Entry
  'ballot-entry': {
    id: 'ballot-entry',
    steps: [
      {
        id: 'welcome',
        title: 'Ballot Workspace',
        description:
          'Enter scores, choose the winning side, and submit once your ballot is final.',
        position: 'center',
      },
      {
        id: 'overview',
        title: 'Debate Context',
        description:
          'Start here to confirm the tournament, round, teams, motion, and any info slide.',
        target: 'ballot-entry-overview',
        position: 'bottom',
      },
      {
        id: 'scores',
        title: 'Speaker Scores',
        description:
          'Score each speech and assign the speaker. The totals update as you work.',
        target: 'ballot-entry-scores',
        position: 'bottom',
      },
      {
        id: 'decision',
        title: 'Decision',
        description:
          'Pick the winning side after scoring. The selected winner must match the point totals when you submit.',
        target: 'ballot-entry-decision',
        position: 'left',
      },
      {
        id: 'actions',
        title: 'Save or Submit',
        description:
          'Save a draft while judging. Submit only when the ballot is final, because submitted ballots lock until a modification request is approved.',
        target: 'ballot-entry-actions',
        position: 'left',
      },
    ],
  },

  // Debater Assignments
  'tournament-my-debates': {
    id: 'tournament-my-debates',
    steps: [
      {
        id: 'welcome',
        title: 'My Debates',
        description:
          'This page is your personal draw for the tournament.',
        position: 'center',
      },
      {
        id: 'list',
        title: 'Debate Cards',
        description:
          'Each card shows the round status, motion, side, opponent, judges, venue for IRL events, and result once available.',
        target: 'my-debates-list',
        position: 'bottom',
      },
      {
        id: 'call',
        title: 'Join Online Debates',
        description:
          'For online tournaments, the Join Call action appears when your round is published or in progress.',
        target: 'my-debates-call',
        position: 'top',
      },
    ],
  },
} satisfies Record<string, TourConfig>;

export type TourId = keyof typeof TOURS;
