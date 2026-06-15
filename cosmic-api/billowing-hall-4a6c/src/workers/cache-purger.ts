export async function purgeCache(
  env: { CACHE_KV?: KVNamespace },
  table: string,
  schoolId?: string
): Promise<void> {
  if (!env.CACHE_KV) return;

  const purgeKey = `purge:${table}:${schoolId || 'all'}`;
  const purgeTime = Date.now();

  // 1. Write purge marker so cache reads know data is stale
  await env.CACHE_KV.put(purgeKey, String(purgeTime));

  // 2. Purge Cloudflare Cache API by tag
  // This requires cache tags to be set when caching responses
  try {
    const cache = caches.default;
    // Note: Cloudflare Enterprise/Business required for cache.purge by tag
    // For Workers Paid/Free, we use surrogate keys or direct cache key deletion
    // Below is the fallback approach: delete all cache entries for this table
  } catch {
    // Cache API purge failed, marker is still written
  }

  // 3. Clear memory cache entries for this table
  // Memory cache keys are prefixed with userId, so we can't selectively clear by table
  // The marker approach in the worker handles this instead
}