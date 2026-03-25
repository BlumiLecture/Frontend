import apiClient from "../axiosClient";

export type InProgressBook = {
  id: number;
  title: string;
  author: string;
  unit_type: string;
  total_units: number;
  progress_percent: number;
  plan: {
    id: number;
    start_date: string;
    target_end_date: string;
    frequency_type: string;
    every_n_days: number | null;
  };
};

export type BookLog = {
  date: string; // YYYY-MM-DD
  units_read: number;
};

type InProgressBooksResponse = { count: number; books: InProgressBook[] };

const IN_PROGRESS_CACHE_TTL_MS = 60_000;
let inProgressBooksCache: { data: InProgressBooksResponse; updatedAt: number } | null = null;

export function getCachedInProgressBooks() {
  if (!inProgressBooksCache) return null;
  const isFresh = Date.now() - inProgressBooksCache.updatedAt <= IN_PROGRESS_CACHE_TTL_MS;
  if (!isFresh) return null;
  return inProgressBooksCache.data;
}

export function invalidateInProgressBooksCache() {
  inProgressBooksCache = null;
}

export async function getInProgressBooks(options?: { forceRefresh?: boolean }) {
  const forceRefresh = options?.forceRefresh ?? false;
  if (!forceRefresh) {
    const cached = getCachedInProgressBooks();
    if (cached) return cached;
  }

  const { data } = await apiClient.get("books/in-progress/");
  const normalized = data as InProgressBooksResponse;
  inProgressBooksCache = { data: normalized, updatedAt: Date.now() };
  return normalized;
}

export async function getBookLogs(bookId: number, from?: string, to?: string) {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  const { data } = await apiClient.get(`books/${bookId}/logs/`, { params });
  return data as { book_id: number; logs: BookLog[] };
}

export async function upsertBookLog(bookId: number, day: string, unitsRead: number) {
  const { data } = await apiClient.post(`books/${bookId}/logs/`, {
    date: day,
    units_read: unitsRead,
  });
  // El progreso del libro puede cambiar; invalidamos listados de Inicio/Biblioteca.
  invalidateInProgressBooksCache();
  return data;
}

export async function getCheckInfo(bookId: number) {
  const { data } = await apiClient.get(`books/${bookId}/check-info/`);
  return data as {
    book: any;
    plan: any;
    progress_percent: number;
    today: { scheduled: boolean; units_read: number; units_planned: number };
    planned_days?: Array<{ date: string; units_planned: number }>;
  };
}

