'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PaginationControls } from '@/components/ui/pagination';
import type { PaginationMeta } from '@/lib/pagination';

interface UrlPaginationControlsProps {
  paginationMeta: PaginationMeta;
  /** URL search param name for the page number. Defaults to "page". */
  pageParam?: string;
  className?: string;
}

/**
 * Pagination controls that navigate by updating URL search params.
 * For use in server-rendered pages that use URL params for pagination.
 */
export function UrlPaginationControls({
  paginationMeta,
  pageParam = 'page',
  className,
}: UrlPaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePageChange(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(pageParam, String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <PaginationControls
      pagination={paginationMeta}
      onPageChange={handlePageChange}
      className={className}
    />
  );
}
