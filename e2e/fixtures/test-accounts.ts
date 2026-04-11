export const CLERK_TEST_ACCOUNT_EMAIL_SUFFIX = '+clerk_test@gmail.com';
export const CLERK_TEST_ACCOUNT_VERIFICATION_CODE =
  process.env.E2E_CLERK_VERIFICATION_CODE ?? '424242';

export const clerkTestAccount = {
  email: process.env.E2E_CLERK_EMAIL,
  password: process.env.E2E_CLERK_PASSWORD,
};

export function isClerkTestAccountEmail(email: string) {
  return email.endsWith(CLERK_TEST_ACCOUNT_EMAIL_SUFFIX);
}
