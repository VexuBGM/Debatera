# Debatera

A comprehensive debate hosting and organization platform with integrated feedback system.

## Features

- **User Authentication**: Powered by Clerk with role-based access control
- **Tournament Management**: Create and manage debate tournaments (verified by admins)
- **Team Organization**: Create teams and manage team memberships
- **Debate Hosting**: 1v1 team format debates with real-time capabilities
- **Call-Level Roles**: Per-debate participant roles (Debater, Judge, Spectator)
- **Judge Feedback System**: Structured feedback and voting from judges
- **Video Integration**: Real-time video calls via Stream

## Tech Stack

- **Frontend**: Next.js 15 with React 19
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **Video**: Stream SDK
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/VexuBGM/Debatera.git
   cd Debatera
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
   - `CLERK_SECRET_KEY`: Clerk secret key
   - `CLERK_WEBHOOK_SECRET`: Clerk webhook secret
   - `NEXT_PUBLIC_STREAM_API_KEY`: Stream API key
   - `STREAM_SECRET_KEY`: Stream secret key

4. Set up the database:
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev
   
   # Seed the database
   npx prisma db seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Setup

For detailed database setup instructions, see [DATABASE.md](./DATABASE.md).

Quick start:
```bash
# Validate the database layer
./validate-db-layer.sh

# View database in Prisma Studio
npx prisma studio
```

## API Documentation

The platform provides RESTful APIs for all core features. See [API_TESTING.md](./API_TESTING.md) for detailed endpoint documentation and testing examples.

### API Overview

- **Tournaments**: Create, list, and verify tournaments
- **Teams**: Create teams and manage memberships
- **Debates**: Create debates, manage participants, collect feedback
- **Roles**: Per-debate participant roles (DEBATER, JUDGE, SPECTATOR)
- **Feedback**: Judge feedback submission and final decision setting

## Project Structure

```
/prisma
  ├── schema.prisma       # Database schema
  ├── seed.ts            # Seed data script
  └── migrations/        # Database migrations

/src
  ├── app/
  │   ├── (auth)/        # Authentication pages
  │   ├── (main)/        # Main application pages
  │   └── api/           # API route handlers
  │       ├── tournaments/
  │       ├── teams/
  │       └── debates/
  ├── components/        # React components
  ├── lib/              # Utility functions
  │   ├── prisma.ts     # Prisma client singleton
  │   ├── auth.ts       # Authentication helpers
  │   └── ensureUser.ts # User synchronization
  └── providers/        # React context providers
```

## User Roles

### App-Level Roles
- **USER**: Regular users (default)
- **ADMIN**: Platform administrators (can verify tournaments)

### Call-Level Roles (Per Debate)
- **DEBATER**: Participates in the debate (has side and speaking order)
- **JUDGE**: Evaluates the debate and provides feedback
- **SPECTATOR**: Watches the debate

## Development

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

### Database Commands
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View/edit database
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate
```

## Validation

Run the validation script to ensure the database layer is properly set up:

```bash
./validate-db-layer.sh
```

This checks:
- Prisma schema validity
- Migration files
- API route handlers
- Authentication helpers
- TypeScript compilation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the GitHub repository.

# dev (clerk webhook)
winget install Cloudflare.cloudflared 
cloudflared login
cloudflared tunnel --url http://localhost:3000

then clerk webhook