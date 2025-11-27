/**
 * Environment validation
 * Validates all required environment variables at startup
 */

import { z } from 'zod';

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),

  // Clerk URLs (optional with defaults)
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/'),

  // Stream Video
  NEXT_PUBLIC_STREAM_API_KEY: z.string().min(1, 'NEXT_PUBLIC_STREAM_API_KEY is required'),
  STREAM_SECRET_KEY: z.string().min(1, 'STREAM_SECRET_KEY is required'),

  // Base URL
  NEXT_PUBLIC_BASE_URL: z.string().url('NEXT_PUBLIC_BASE_URL must be a valid URL'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and throws if any are missing or invalid
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`);
      console.error('❌ Environment validation failed:');
      missingVars.forEach((msg: string) => console.error(`  - ${msg}`));
      throw new Error('Invalid environment variables. Please check your .env file.');
    }
    throw error;
  }
}

/**
 * Get validated environment variables
 * Use this instead of process.env for type safety
 */
export const env = validateEnv();
