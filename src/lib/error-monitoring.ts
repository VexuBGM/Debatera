/**
 * Error monitoring setup
 * Placeholder for Sentry or similar error tracking service
 * 
 * To use Sentry:
 * 1. Install: npm install @sentry/nextjs
 * 2. Run: npx @sentry/wizard@latest -i nextjs
 * 3. Add SENTRY_DSN to your .env file
 * 4. Uncomment the Sentry code below
 */

// import * as Sentry from '@sentry/nextjs';

export function initErrorMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    // Uncomment when ready to use Sentry
    // Sentry.init({
    //   dsn: process.env.SENTRY_DSN,
    //   environment: process.env.NODE_ENV,
    //   tracesSampleRate: 0.1,
    //   beforeSend(event) {
    //     // Filter out sensitive data
    //     if (event.request?.headers) {
    //       delete event.request.headers['authorization'];
    //       delete event.request.headers['cookie'];
    //     }
    //     return event;
    //   },
    // });
  }
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context });
  } else {
    console.error('Exception captured:', error, context);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}
