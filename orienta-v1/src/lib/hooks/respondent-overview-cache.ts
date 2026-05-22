"use client";

import { listRespondentActionPlans } from "@/lib/action-plans/client";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";

type CacheEntry = {
  items: ActionPlanListItem[];
  fetchedAt: number;
  promise: Promise<ActionPlanListItem[]> | null;
};

const CACHE_TTL_MS = 30_000;
let cache: CacheEntry = { items: [], fetchedAt: 0, promise: null };
const listeners = new Set<() => void>();
let cacheVersion = 0;

export function getRespondentOverviewCacheVersion(): number {
  return cacheVersion;
}

function notifyListeners() {
  cacheVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

async function fetchOverviewItems(): Promise<ActionPlanListItem[]> {
  const res = await listRespondentActionPlans({
    view: "overview",
    limit: 200,
    offset: 0,
  });
  return res.items as ActionPlanListItem[];
}

/**
 * Cache em memória do overview do respondente (`action-plans?view=overview`).
 * Compartilhado entre portfólio, plano de ação e boot do FAMI.
 */
export async function getRespondentOverviewItems(
  options?: { force?: boolean },
): Promise<ActionPlanListItem[]> {
  const force = options?.force ?? false;
  const now = Date.now();
  const fresh = !force && now - cache.fetchedAt < CACHE_TTL_MS && cache.items.length > 0;

  if (fresh) return cache.items;

  if (cache.promise && !force) {
    return cache.promise;
  }

  cache.promise = fetchOverviewItems()
    .then((items) => {
      cache = { items, fetchedAt: Date.now(), promise: null };
      notifyListeners();
      return items;
    })
    .catch((e) => {
      cache.promise = null;
      throw e;
    });

  return cache.promise;
}

export function invalidateRespondentOverviewCache(): void {
  cache = { items: [], fetchedAt: 0, promise: null };
  notifyListeners();
}

export function subscribeRespondentOverviewCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
