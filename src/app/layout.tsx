import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ensureUserInDB } from '@/lib/ensureUser';

import "@stream-io/video-react-sdk/dist/css/styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  const afterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "/";
  const afterSignUpUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || "/";

  // Ensure the authenticated user exists in the DB (keeps this call after env config)
  await ensureUserInDB();
  return (
    <html lang="en" suppressHydrationWarning>
      <ClerkProvider
        signInUrl={signInUrl}
        signUpUrl={signUpUrl}
        afterSignInUrl={afterSignInUrl}
        afterSignUpUrl={afterSignUpUrl}
      >
        <body className={`antialiased`} suppressHydrationWarning>
          {children}
        </body>
      </ClerkProvider>
    </html>
  );
}
