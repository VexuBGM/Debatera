/**
 * Shared pagination utilities
 */

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Parse pagination query parameters from a URL's searchParams.
 * Falls back to defaults for missing or invalid values.
 */
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const rawPageSize = parseInt(
    searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE),
    10,
  );

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1 && rawPageSize <= MAX_PAGE_SIZE
      ? rawPageSize
      : DEFAULT_PAGE_SIZE;

  return { page, pageSize };
}

/**
 * Build Prisma skip/take values from pagination params.
 */
export function paginationToSkipTake(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  };
}

/**
 * Build pagination metadata from total count + params.
 */
export function buildPaginationMeta(total: number, params: PaginationParams): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  };
}
