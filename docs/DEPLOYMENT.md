# Production Deployment Guide

This guide covers deploying Debatera to production on various platforms.

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set:

```bash
# Required
DATABASE_URL=postgresql://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STREAM_API_KEY=...
STREAM_SECRET_KEY=...
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Optional
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
NODE_ENV=production
```

### 2. Database Setup
- Set up PostgreSQL database (version 12+)
- Run migrations: `npx prisma migrate deploy`
- Optionally seed initial data: `npm run seed`

### 3. Security Checks
- ✅ Environment variables secured
- ✅ HTTPS enabled
- ✅ Security headers configured (done in next.config.ts)
- ✅ Rate limiting implemented
- ✅ Input sanitization in place
- ✅ No sensitive data in git repository

### 4. Performance Optimization
- ✅ Image optimization configured
- ✅ Compression enabled
- ✅ Bundle optimization enabled
- ✅ Database indexes in place (check schema.prisma)

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**
   - Go to your project settings on vercel.com
   - Add all environment variables from the checklist
   - Redeploy if needed

5. **Set up Database**
   - Use Vercel Postgres or external PostgreSQL provider
   - Update DATABASE_URL in Vercel environment variables
   - Run migrations from Vercel CLI:
     ```bash
     vercel env pull .env.production.local
     npx prisma migrate deploy
     ```

6. **Configure Webhooks**
   - Set up Clerk webhook pointing to: `https://your-domain.com/api/webhooks/clerk`

### Option 2: AWS (EC2 + RDS)

1. **Set up RDS PostgreSQL**
   - Create RDS PostgreSQL instance
   - Configure security groups
   - Note connection string

2. **Set up EC2 Instance**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Clone repository
   git clone https://github.com/VexuBGM/Debatera.git
   cd Debatera

   # Install dependencies
   npm install

   # Set up environment variables
   nano .env
   # Add all required variables

   # Build application
   npm run build

   # Run migrations
   npx prisma migrate deploy

   # Start with PM2
   npm install -g pm2
   pm2 start npm --name "debatera" -- start
   pm2 save
   pm2 startup
   ```

3. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Option 3: Docker

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci

   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   RUN npx prisma generate
   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production

   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs

   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

   USER nextjs
   EXPOSE 3000
   ENV PORT 3000

   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   docker build -t debatera .
   docker run -p 3000:3000 --env-file .env debatera
   ```

3. **Using Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - DATABASE_URL=postgresql://postgres:password@db:5432/debatera
       depends_on:
         - db
     
     db:
       image: postgres:14
       environment:
         - POSTGRES_DB=debatera
         - POSTGRES_PASSWORD=password
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

## Post-Deployment

### 1. Health Checks
- Test authentication flow
- Test video calls
- Test tournament creation
- Verify database connections
- Check webhook delivery

### 2. Monitoring Setup
- Set up error monitoring (Sentry recommended)
- Configure uptime monitoring
- Set up database performance monitoring
- Monitor API rate limits

### 3. Backup Strategy
- Set up automated database backups
- Test backup restoration process
- Document backup procedures

### 4. Performance Monitoring
```bash
# Check build size
npm run build

# Analyze bundle
npm run build:analyze
```

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL format
- Check network connectivity
- Ensure SSL is configured if required
- Verify database user permissions

### Authentication Issues
- Verify Clerk environment variables
- Check webhook configuration
- Ensure domain is added to Clerk allowed list

### Video Call Issues
- Verify Stream API credentials
- Check CORS configuration
- Ensure WebRTC ports are open

### Build Failures
- Clear `.next` folder and rebuild
- Verify all dependencies are installed
- Check Node.js version (18+ required)
- Run type checking: `npm run type-check`

## Scaling Considerations

### Database
- Use connection pooling (PgBouncer)
- Add read replicas for heavy read workloads
- Implement caching layer (Redis)

### Application
- Use load balancer for multiple instances
- Implement CDN for static assets
- Use serverless functions for background jobs

### Security
- Implement rate limiting at CDN level
- Use WAF (Web Application Firewall)
- Regular security audits
- Keep dependencies updated

## Maintenance

### Regular Tasks
- Weekly: Check error logs and fix critical issues
- Monthly: Update dependencies
- Quarterly: Security audit
- As needed: Database maintenance and optimization

### Updates
```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Support

For issues or questions:
- Check documentation in `/docs` folder
- Review GitHub issues
- Contact maintainers
