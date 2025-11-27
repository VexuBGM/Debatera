# 🚀 Quick Start: Deploy to Production

This is a condensed guide to get Debatera running in production quickly. For comprehensive details, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ database ready
- [ ] Clerk account ([clerk.com](https://clerk.com))
- [ ] Stream account ([getstream.io](https://getstream.io))
- [ ] Domain name and hosting platform (Vercel recommended)

## 5-Step Deployment

### Step 1: Set Up Services (15 minutes)

#### 1.1 Database
```bash
# Create PostgreSQL database
createdb debatera_prod

# Or use a managed service:
# - Vercel Postgres
# - AWS RDS
# - Railway
# - Supabase
```

#### 1.2 Clerk (Authentication)
1. Create project at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy API keys from "API Keys" section
3. Add your production domain to "Domains"
4. Create webhook pointing to: `https://yourdomain.com/api/webhooks/clerk`

#### 1.3 Stream (Video)
1. Create app at [dashboard.getstream.io](https://dashboard.getstream.io)
2. Copy API key and secret from dashboard

### Step 2: Configure Environment (5 minutes)

Create `.env.production` file:

```bash
NODE_ENV=production

# Database
DATABASE_URL="postgresql://user:password@host:5432/debatera_prod"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
CLERK_SECRET_KEY="sk_live_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Stream
NEXT_PUBLIC_STREAM_API_KEY="your_key"
STREAM_SECRET_KEY="your_secret"

# URLs
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
ALLOWED_ORIGINS="https://yourdomain.com"
```

### Step 3: Build & Deploy (10 minutes)

#### Option A: Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Add environment variables in Vercel dashboard
# Project Settings -> Environment Variables -> Add all from .env.production

# Run migrations
vercel env pull .env.production.local
npx prisma migrate deploy
```

#### Option B: Docker

```bash
# Build
docker build -t debatera .

# Run
docker run -p 3000:3000 --env-file .env.production debatera
```

#### Option C: Traditional Server

```bash
# Install dependencies
npm ci --production

# Build
npm run build

# Run migrations
npx prisma migrate deploy

# Start
npm start

# Or use PM2 for process management
npm i -g pm2
pm2 start npm --name debatera -- start
pm2 save
pm2 startup
```

### Step 4: Validate Deployment (5 minutes)

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"healthy","timestamp":"...","database":"connected"}
```

Test critical paths:
- [ ] Visit homepage: `https://yourdomain.com`
- [ ] Sign up/Sign in
- [ ] Create a tournament
- [ ] Start a video call
- [ ] Verify webhook delivery in Clerk dashboard

### Step 5: Set Up Monitoring (10 minutes)

#### Enable Error Tracking (Recommended)

```bash
# Install Sentry
npm install @sentry/nextjs

# Run setup wizard
npx @sentry/wizard@latest -i nextjs

# Add to .env.production
echo "SENTRY_DSN=https://...@sentry.io/..." >> .env.production

# Uncomment Sentry code in src/lib/error-monitoring.ts
```

#### Set Up Uptime Monitoring

Use one of these free services:
- [UptimeRobot](https://uptimerobot.com) - 50 monitors free
- [Pingdom](https://www.pingdom.com) - Free tier available
- [StatusCake](https://www.statuscake.com) - 10 tests free

Monitor:
- Main page: `https://yourdomain.com`
- Health check: `https://yourdomain.com/api/health`

## Post-Deployment

### Immediate Actions

1. **Test everything:**
   ```bash
   # Use the production checklist
   cat PRODUCTION_CHECKLIST.md
   ```

2. **Set up backups:**
   - Configure automated database backups
   - Test restoration process
   - Document backup procedures

3. **Monitor errors:**
   - Check Sentry dashboard (if enabled)
   - Review application logs
   - Monitor server resources

### First Week

- [ ] Monitor error rates daily
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Address any critical issues
- [ ] Document any operational issues

### Ongoing Maintenance

- **Weekly:** Review error logs and fix issues
- **Monthly:** Update dependencies (`npm update`)
- **Quarterly:** Security audit and performance review

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Check migrations
npx prisma migrate status

# Reset if needed (DESTRUCTIVE - dev only!)
npx prisma migrate reset
```

### Environment Variable Issues
```bash
# Validate environment
node -e "require('./src/lib/env').validateEnv(); console.log('✅ OK')"
```

### Video Calls Not Working
- Verify Stream API credentials
- Check browser console for errors
- Ensure WebRTC is not blocked by firewall
- Test on different network/device

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run lint                   # Check linting
npm run type-check            # Check TypeScript

# Production
npm run build                  # Build for production
npm start                      # Start production server
npm run validate              # Run all checks

# Database
npx prisma migrate deploy     # Apply migrations
npx prisma studio            # Open database GUI
npx prisma generate          # Generate Prisma client

# Deployment
vercel --prod                 # Deploy to Vercel
docker build -t debatera .   # Build Docker image
```

## Resources

- **Full Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Production Checklist:** [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
- **Production Summary:** [PRODUCTION_READY.md](./PRODUCTION_READY.md)
- **API Documentation:** [docs/API_TESTING.md](./docs/API_TESTING.md)
- **Database Guide:** [docs/DATABASE.md](./docs/DATABASE.md)

## Need Help?

1. Check the [troubleshooting section](#troubleshooting)
2. Review comprehensive [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Check [GitHub Issues](https://github.com/VexuBGM/Debatera/issues)
4. Contact maintainers

---

**Estimated Total Time:** 45 minutes  
**Difficulty:** Intermediate  
**Cost:** Free tier available for all services
