/**
 * API-specific logging utility
 * Provides structured logging for API routes with request context
 */

import { NextRequest } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface ApiLogContext {
  method?: string;
  path?: string;
  userId?: string;
  [key: string]: unknown;
}

class ApiLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: ApiLogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [API] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  info(message: string, context?: ApiLogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, context));
    }
    // In production, send to logging service
  }

  warn(message: string, context?: ApiLogContext): void {
    console.warn(this.formatMessage('warn', message, context));
    // In production, send to logging service
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: ApiLogContext
  ): void {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : error,
    };
    console.error(this.formatMessage('error', message, errorContext));
    // In production, send to error tracking service (e.g., Sentry)
  }

  debug(message: string, context?: ApiLogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Extract context from NextRequest for logging
   */
  extractRequestContext(req: NextRequest, userId?: string): ApiLogContext {
    return {
      method: req.method,
      path: req.nextUrl.pathname,
      userId,
    };
  }
}

export const apiLogger = new ApiLogger();
