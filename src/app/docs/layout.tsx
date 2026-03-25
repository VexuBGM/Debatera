import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Help Center - Debatera",
  description:
    "Learn how to use Debatera for debate tournament management",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface-1)]">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-[var(--color-surface-1)]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icons/debatera.svg"
              alt=""
              width={24}
              height={24}
            />
            <span className="font-bold text-foreground">Debatera</span>
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium text-foreground">
            Help Center
          </span>
          <div className="ml-auto">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; Back to app
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
