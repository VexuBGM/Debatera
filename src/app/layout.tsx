import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { ensureUserInDB } from '@/lib/ensureUser';

import "@stream-io/video-react-sdk/dist/css/styles.css";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Debatera",
  description: "The one place for debates",
  icons: {
    icon: "/icons/debatera.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Configure Clerk redirects
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
  const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";
  const fallbackRedirectUrl = process.env.NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL || "/";
  const signUpFallbackRedirectUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || "/";

  // Ensure the authenticated user exists in the DB (keeps this call after env config)
  await ensureUserInDB();
  return (
    <html lang="en" suppressHydrationWarning>
      <ClerkProvider
        signInUrl={signInUrl}
        signUpUrl={signUpUrl}
        signInFallbackRedirectUrl={fallbackRedirectUrl}
        signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: 'oklch(0.72 0.19 195)',
            colorBackground: 'oklch(0.16 0.02 250)',
            colorInputBackground: 'oklch(0.20 0.015 250)',
            colorInputText: 'oklch(0.985 0 0)',
            colorText: 'oklch(0.985 0 0)',
            colorTextSecondary: 'oklch(0.708 0 0)',
            colorDanger: 'oklch(0.577 0.245 27.325)',
            borderRadius: '0.625rem',
            fontFamily: 'var(--font-geist-sans, ui-sans-serif, system-ui)',
          },
          elements: {
            card: 'bg-transparent shadow-none border-none',
            headerTitle: 'font-heading',
            headerSubtitle: 'text-muted-foreground',
            socialButtonsBlockButton:
              'border-white/10 bg-white/5 hover:bg-white/10 text-foreground',
            formFieldInput:
              'bg-surface-2 border-white/10 focus:border-brand focus:ring-brand/20',
            formButtonPrimary:
              'bg-brand hover:bg-brand/90 text-brand-foreground',
            footerActionLink: 'text-brand hover:text-brand/80',
            dividerLine: 'bg-white/10',
            dividerText: 'text-muted-foreground',
          },
        }}
      >
        <body className={`antialiased`} suppressHydrationWarning>
          {children}
          <Toaster />
        </body>
      </ClerkProvider>
    </html>
  );
}
