import { SlidingWindowRateLimiter } from './rate-limiter';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  RATE_LIMIT_KV?: KVNamespace;
  CACHE_KV?: KVNamespace;
  MAX_REQUEST_SIZE?: string;
  RATE_LIMIT_WINDOW?: string;
  RATE_LIMIT_MAX?: string;
  AI_RATE_LIMIT_MAX?: string;
  BURST_LIMIT?: string;
  CACHE_TTL?: string;
}

const NOTES_TABLES = new Set(['note_table', 'lesson_chunks']);
const AI_ENDPOINTS = new Set(['bright-action', 'spellCheck-']);

const BLOCKED_TABLES = new Set([
  'profiles', 'auth_users', 'guardian_children',
  'teacher_attendance', 'requests', 'payments'
]);

const LIMITS = {
  maxUrlLength: 8192,
  maxBodySize: 10 * 1024 * 1024,
  maxSelectDepth: 5,
  maxQueryParams: 50,
  maxRangeSize: 5000,
};

const CACHE_CONFIG = {
  defaultTTL: 3600,
  cacheableTables: new Set(['note_table']),
  nonCacheableTables: new Set(['lesson_chunks']),
};

const memoryCache = new Map<string, { response: Response; ts: number }>();
const MEMORY_CACHE_TTL = 30;
const MEMORY_CACHE_MAX = 1000;

function getMemoryCacheKey(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.searchParams.sort();
  normalized.searchParams.delete('apikey');
  return normalized.toString();
}

function getFromMemoryCache(key: string): Response | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > MEMORY_CACHE_TTL * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return entry.response.clone();
}

function setMemoryCache(key: string, response: Response): void {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey !== undefined) {
      memoryCache.delete(firstKey);
    }
  }
  memoryCache.set(key, { response: response.clone(), ts: Date.now() });
}

// ==========================================
// NORMALIZE: Strip PostgREST operators from IDs
// ==========================================
function normalizeId(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^(eq\.|neq\.|gt\.|gte\.|lt\.|lte\.|like\.|ilike\.|in\.|is\.)/, '');
}

// ==========================================
// CACHE PURGE: Write marker to KV
// ==========================================
async function writePurgeMarker(env: Env, table: string, schoolId?: string): Promise<void> {
  if (!env.CACHE_KV) return;
  const normalizedId = normalizeId(schoolId);
  const purgeKey = `purge:${table}:${normalizedId || 'all'}`;
  await env.CACHE_KV.put(purgeKey, String(Date.now()), { expirationTtl: 3600 });
}

// ==========================================
// CACHE STALE CHECK: Read marker from KV
// ==========================================
async function isCacheStale(env: Env, table: string, cachedAt: number, schoolId?: string): Promise<boolean> {
  if (!env.CACHE_KV) return false;

  const normalizedId = normalizeId(schoolId);
  const keysToCheck = [`purge:${table}:all`];
  if (normalizedId && normalizedId !== 'all') {
    keysToCheck.unshift(`purge:${table}:${normalizedId}`);
  }

  for (const key of keysToCheck) {
    const purgeTime = await env.CACHE_KV.get(key);
    if (purgeTime && cachedAt < parseInt(purgeTime, 10)) {
      return true;
    }
  }

  return false;
}

// ==========================================
// CLEAR MEMORY CACHE ENTRIES FOR A TABLE
// ==========================================
function clearMemoryCacheForTable(table: string): void {
  for (const [key, entry] of memoryCache.entries()) {
    if (key.includes(`/${table}?`)) {
      memoryCache.delete(key);
    }
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const url = new URL(request.url);

    if (url.protocol !== 'https:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
      return jsonResponse({ code: 'SECURITY_001', message: 'HTTPS required' }, 403);
    }

    if (url.toString().length > LIMITS.maxUrlLength) {
      return jsonResponse({ code: 'SECURITY_002', message: 'URL too long' }, 413);
    }

    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'].includes(request.method)) {
      return jsonResponse({ code: 'SECURITY_003', message: 'Method not allowed' }, 405);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request.headers.get('Origin'))
      });
    }

    const authHeader = request.headers.get('Authorization');
    let userId = clientIP;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub || payload.user_id || clientIP;
      } catch {
        // Invalid JWT, fall back to IP
      }
    }

    const path = url.pathname.replace(/^\/+|\/+$/g, '');
    const table = path;

    // ==========================================
    // AI ENDPOINT ROUTING + RATE LIMITING
    // ==========================================
    if (AI_ENDPOINTS.has(path)) {
      const aiResult = await checkAIRateLimit(env, userId);
      if (!aiResult.allowed) {
        return jsonResponse({
          code: 'AI_RATE_LIMITED',
          message: `AI rate limit exceeded. Retry after ${aiResult.retryAfter}s`,
          retryAfter: aiResult.retryAfter,
        }, 429, { 'Retry-After': String(aiResult.retryAfter) });
      }

      try {
        const edgeUrl = `${env.SUPABASE_URL}/functions/v1/${path}`;
        const reqClone = request.clone();
        const body = ['POST', 'PATCH', 'PUT'].includes(request.method) ? await reqClone.text() : null;

        const res = await fetch(edgeUrl, {
          method: request.method,
          headers: {
            'Authorization': authHeader || '',
            'Content-Type': request.headers.get('Content-Type') || 'application/json',
          },
          body: body || undefined,
        });

        const resBody = await res.text();
        return new Response(resBody, {
          status: res.status,
          headers: {
            'Content-Type': res.headers.get('Content-Type') || 'application/json',
            ...corsHeaders(request.headers.get('Origin')),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'X-Worker-Time': String(Date.now() - startTime),
            'X-AI-RateLimit-Remaining': String(aiResult.remaining),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return jsonResponse({ code: 'AI_500', message }, 500);
      }
    }

    // ==========================================
    // TABLE RATE LIMITING
    // ==========================================
    const rateLimitKey = `ratelimit:${userId}:${table}`;
    const rateLimitResult = await checkRateLimit(env, rateLimitKey);
    if (!rateLimitResult.allowed) {
      return jsonResponse({
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter}s`,
        retryAfter: rateLimitResult.retryAfter,
      }, 429, { 'Retry-After': String(rateLimitResult.retryAfter) });
    }

    if (BLOCKED_TABLES.has(table)) {
      console.warn(`[SECURITY] Blocked access to sensitive table: ${table} from ${userId}`);
      return jsonResponse({ code: 'SECURITY_004', message: 'Access denied' }, 403);
    }

    if (!NOTES_TABLES.has(table)) {
      return jsonResponse({
        code: 'PGRST404',
        message: `Table "${table}" not handled by notes worker`,
      }, 404);
    }

    const cache = caches.default;
    const cacheKey = buildCacheKey(url);

    // ==========================================
    // ONLY CACHE UNFILTERED "LIST ALL" REQUESTS
    // This prevents cache collisions between class_id/subject_id filters
    // ==========================================
    const hasRowFilters = url.searchParams.has('class_id') ||
                        url.searchParams.has('subject_id') ||
                        url.searchParams.has('title') ||
                        url.searchParams.has('ilike');
    const isCacheable = request.method === 'GET' &&
                        CACHE_CONFIG.cacheableTables.has(table) &&
                        !hasRowFilters;

    const memCacheKey = `${userId}:${getMemoryCacheKey(url)}`;

    // ==========================================
    // MEMORY CACHE CHECK (with stale check)
    // ==========================================
    if (isCacheable) {
      const memCached = getFromMemoryCache(memCacheKey);
      if (memCached) {
        const cachedAt = parseInt(memCached.headers.get('X-Cached-At') || '0', 10);
        const schoolId = url.searchParams.get('school_id') || undefined;
        const stale = await isCacheStale(env, table, cachedAt, schoolId);

        if (!stale) {
          const responseHeaders: Record<string, string> = {
            'content-type': memCached.headers.get('content-type') || 'application/json',
            'content-location': memCached.headers.get('content-location') || '',
            'content-profile': memCached.headers.get('content-profile') || '',
            'Content-Range': memCached.headers.get('Content-Range') || '',
            'X-Total-Count': memCached.headers.get('X-Total-Count') || '',
            ...corsHeaders(request.headers.get('Origin')),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'X-Cache': 'MEMORY',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
            'X-Worker-Time': String(Date.now() - startTime),
          };
          return new Response(memCached.body, {
            status: memCached.status,
            statusText: memCached.statusText,
            headers: responseHeaders,
          });
        }
        console.log('[CACHE] MEMORY STALE for', memCacheKey);
      }
    }

    // ==========================================
    // CDN CACHE CHECK (with stale check)
    // ==========================================
    if (isCacheable) {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const cachedAt = parseInt(cachedResponse.headers.get('X-Cached-At') || '0', 10);
        const schoolId = url.searchParams.get('school_id') || undefined;
        const stale = await isCacheStale(env, table, cachedAt, schoolId);

        if (!stale) {
          const responseHeaders: Record<string, string> = {
            'content-type': cachedResponse.headers.get('content-type') || 'application/json',
            'content-location': cachedResponse.headers.get('content-location') || '',
            'content-profile': cachedResponse.headers.get('content-profile') || '',
            'Content-Range': cachedResponse.headers.get('Content-Range') || '',
            'X-Total-Count': cachedResponse.headers.get('X-Total-Count') || '',
            ...corsHeaders(request.headers.get('Origin')),
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'X-Cache': 'HIT',
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
            'X-Worker-Time': String(Date.now() - startTime),
          };
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: responseHeaders,
          });
        }
        console.log('[CACHE] CDN STALE for', cacheKey.url);
      }
      console.log('[CACHE] MISS for', cacheKey.url);
    }

    const searchParams = [...url.searchParams.entries()];

    if (searchParams.length > LIMITS.maxQueryParams) {
      return jsonResponse({ code: 'SECURITY_005', message: 'Too many query parameters' }, 400);
    }

    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      const rangeMatch = rangeHeader.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        const rangeSize = parseInt(rangeMatch[2]) - parseInt(rangeMatch[1]);
        if (rangeSize > LIMITS.maxRangeSize) {
          return jsonResponse({ code: 'SECURITY_006', message: 'Range too large' }, 400);
        }
      }
    }

    const selectParam = url.searchParams.get('select');
    if (selectParam) {
      const depth = (selectParam.match(/:/g) || []).length;
      if (depth > LIMITS.maxSelectDepth) {
        return jsonResponse({ code: 'SECURITY_007', message: 'Select nesting too deep' }, 400);
      }
    }

    const maxBodySize = parseInt(env.MAX_REQUEST_SIZE || '10485760');
    if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
      const contentLength = parseInt(request.headers.get('Content-Length') || '0');
      if (contentLength > maxBodySize) {
        return jsonResponse({ code: 'SECURITY_008', message: 'Request body too large' }, 413);
      }
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ code: 'SECURITY_009', message: 'Authentication required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtParts = token.split('.');
    if (jwtParts.length !== 3) {
      return jsonResponse({ code: 'SECURITY_010', message: 'Invalid token format' }, 401);
    }

    try {
      const supabaseUrl = new URL(`${env.SUPABASE_URL}/rest/v1/${table}`);

      searchParams.forEach(([key, value]) => {
        supabaseUrl.searchParams.set(key, value);
      });

      const upstreamHeaders: Record<string, string> = {
        'apikey': env.SUPABASE_ANON_KEY,
        'Accept': request.headers.get('Accept') || 'application/json',
        'Authorization': authHeader,
      };

      ['content-type', 'prefer', 'range', 'if-match', 'accept-profile'].forEach(h => {
        const val = request.headers.get(h);
        if (val) upstreamHeaders[h] = val;
      });

      const reqClone = request.clone();
      const body = ['POST', 'PATCH', 'PUT'].includes(request.method) ? await reqClone.text() : null;

      const res = await fetch(supabaseUrl.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        body: body || undefined,
      });

      if (res.status === 406) {
        const errorBody = await res.text();
        return jsonResponse({
          code: 'PGRST116',
          message: 'Multiple rows returned where single expected',
          details: errorBody,
        }, 406, corsHeaders(request.headers.get('Origin')));
      }

      const resClone = res.clone();
      const responseBody = await resClone.text();

      const responseHeaders: Record<string, string> = {
        'content-type': res.headers.get('content-type') || 'application/json',
        'content-location': res.headers.get('content-location') || '',
        'content-profile': res.headers.get('content-profile') || '',
        ...corsHeaders(request.headers.get('Origin')),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        'X-Worker-Time': String(Date.now() - startTime),
      };

      const contentRange = res.headers.get('Content-Range');
      if (contentRange) {
        responseHeaders['Content-Range'] = contentRange;
        const match = contentRange.match(/\/(\d+|\*)/);
        if (match && match[1] !== '*') {
          responseHeaders['X-Total-Count'] = match[1];
        }
      }

      // ==========================================
      // CACHE STORE (only for unfiltered requests)
      // ==========================================
      const shouldCache = request.method === 'GET' && (res.status === 200 || res.status === 404);
      if (shouldCache && isCacheable) {
        const cacheTTL = parseInt(env.CACHE_TTL || String(CACHE_CONFIG.defaultTTL));
        const responseToCache = new Response(responseBody, {
          status: res.status,
          statusText: res.statusText,
          headers: {
            'content-type': res.headers.get('content-type') || 'application/json',
            'content-location': res.headers.get('content-location') || '',
            'content-profile': res.headers.get('content-profile') || '',
            'Content-Range': responseHeaders['Content-Range'] || '',
            'X-Total-Count': responseHeaders['X-Total-Count'] || '',
            'X-Cached-At': String(Date.now()),
            'X-Cache': 'MISS',
          },
        });

        setMemoryCache(memCacheKey, responseToCache);
        ctx.waitUntil(cache.put(cacheKey, responseToCache));
        console.log('[CACHE] STORED for', cacheKey.url, 'TTL:', cacheTTL);
      } else {
        responseHeaders['X-Cache'] = 'BYPASS';
      }

      // ==========================================
      // PURGE CACHE ON MUTATIONS
      // ==========================================
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) && CACHE_CONFIG.cacheableTables.has(table)) {
        let schoolId = url.searchParams.get('school_id') || undefined;

        if (!schoolId && body) {
          try {
            const bodyJson = JSON.parse(body);
            if (Array.isArray(bodyJson) && bodyJson.length > 0) {
              schoolId = bodyJson[0]?.school_id;
            } else if (bodyJson && typeof bodyJson === 'object') {
              schoolId = bodyJson.school_id;
            }
          } catch {
            // Body is not JSON, ignore
          }
        }

        clearMemoryCacheForTable(table);
        ctx.waitUntil(writePurgeMarker(env, table, schoolId));
        console.log('[CACHE] PURGE marker written for', table, 'school:', normalizeId(schoolId) || 'all');
      }

      return new Response(responseBody, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[NotesWorker Error]', message);
      return jsonResponse({ code: 'PGRST500', message }, 500, corsHeaders(request.headers.get('Origin')));
    }
  },
};

function buildCacheKey(url: URL): Request {
  const normalized = new URL(url.toString());
  normalized.searchParams.sort();
  return new Request(normalized.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });
}

async function checkRateLimit(env: Env, key: string) {
  const limiter = new SlidingWindowRateLimiter(
    env.RATE_LIMIT_KV,
    parseInt(env.RATE_LIMIT_WINDOW || '60'),
    parseInt(env.RATE_LIMIT_MAX || '300')
  );
  return limiter.check(key);
}

async function checkAIRateLimit(env: Env, userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}> {
  const max = parseInt(env.AI_RATE_LIMIT_MAX || '5');
  const window = 60;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / window) * window;
  const key = `ai_ratelimit:${userId}:${windowStart}`;

  if (!env.RATE_LIMIT_KV) {
    return { allowed: true, remaining: max, retryAfter: 0 };
  }

  const current = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0');
  const newCount = current + 1;

  if (newCount > max) {
    const resetTime = windowStart + window;
    return { allowed: false, remaining: 0, retryAfter: resetTime - now };
  }

  await env.RATE_LIMIT_KV.put(key, String(newCount), { expirationTtl: window });
  return { allowed: true, remaining: max - newCount, retryAfter: 0 };
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Prefer, Authorization, apikey, X-Client-Info, Accept, Range, If-Match, Accept-Profile',
    'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count, Content-Location, Preference-Applied, X-RateLimit-Remaining, X-RateLimit-Reset, X-Worker-Time, X-Cache, X-AI-RateLimit-Remaining',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body: object, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      ...corsHeaders(null),
      ...extraHeaders,
    },
  });
}