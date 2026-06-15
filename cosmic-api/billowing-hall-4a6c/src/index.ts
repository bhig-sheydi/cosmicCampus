// worker.ts
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/+|\/+$/g, '');
      
      const isRpc = path.startsWith('rpc/');
      const table = isRpc ? path.replace('rpc/', '') : path;
      
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Prefer, Authorization, apikey, X-Client-Info, Accept, Range, If-Match, Accept-Profile',
        'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count, Content-Location, Preference-Applied',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        return new Response(JSON.stringify({
          code: 'PGRST500',
          message: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY',
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Build PostgREST URL
      const postgrestPath = isRpc ? `rest/v1/rpc/${table}` : `rest/v1/${table}`;
      const supabaseUrl = new URL(`${env.SUPABASE_URL}/${postgrestPath}`);

      // Copy ALL query params
      url.searchParams.forEach((value, key) => {
        supabaseUrl.searchParams.set(key, value);
      });

      // Build headers
      const upstreamHeaders: Record<string, string> = {
        'apikey': env.SUPABASE_ANON_KEY,
        'Accept': 'application/json',
      };

      // Forward Accept header from client (critical for .single() / .maybeSingle())
      const clientAccept = request.headers.get('Accept');
      if (clientAccept) {
        upstreamHeaders['Accept'] = clientAccept;
      }

      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        upstreamHeaders['Authorization'] = authHeader;
      } else {
        upstreamHeaders['Authorization'] = `Bearer ${env.SUPABASE_ANON_KEY}`;
      }

      // Forward ALL critical headers
      ['content-type', 'prefer', 'range', 'if-match', 'accept-profile'].forEach(h => {
        const val = request.headers.get(h);
        if (val) upstreamHeaders[h] = val;
      });

      console.log('[Worker]', request.method, supabaseUrl.toString());
      console.log('[Worker Headers]', JSON.stringify(upstreamHeaders));

      // CACHE LOGIC: Only cache GETs without user-specific filters
      const cache = caches.default;
      const hasUserFilter = url.searchParams.has('user_id') || 
                           url.searchParams.has('owner_id') || 
                           url.searchParams.has('proprietor') ||
                           url.searchParams.has('guardian_name') ||
                           url.searchParams.has('auth_user_id');
      const shouldCache = request.method === 'GET' && !hasUserFilter && !isRpc;

      if (shouldCache) {
        const cached = await cache.match(request);
        if (cached) {
          return new Response(cached.body, {
            status: cached.status,
            headers: { ...Object.fromEntries(cached.headers), ...corsHeaders, 'X-Cache': 'HIT' },
          });
        }
      }

      // Make request to PostgREST
      const body = ['POST', 'PATCH', 'PUT'].includes(request.method) ? await request.text() : null;
      
      const res = await fetch(supabaseUrl.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        body: body || undefined,
      });

      // Clone response so we can read headers and body
      const resClone = res.clone();
      const responseBody = await resClone.text();

      // Build response with all headers forwarded
      const responseHeaders: Record<string, string> = {
        ...Object.fromEntries(res.headers),
        ...corsHeaders,
        'X-Cache': shouldCache ? 'MISS' : 'BYPASS',
      };

      // Forward count headers properly
      const contentRange = res.headers.get('Content-Range');
      if (contentRange) {
        responseHeaders['Content-Range'] = contentRange;
        // Extract count from Content-Range: 0-19/150 → 150
        const match = contentRange.match(/\/(\d+|\*)/);
        if (match && match[1] !== '*') {
          responseHeaders['X-Total-Count'] = match[1];
        }
      }

      const preferenceApplied = res.headers.get('Preference-Applied');
      if (preferenceApplied) {
        responseHeaders['Preference-Applied'] = preferenceApplied;
      }

      const response = new Response(responseBody, {
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
      });

      // Cache successful GETs
      if (shouldCache && res.ok && res.status === 200) {
        response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        ctx.waitUntil(cache.put(request, response.clone()));
      }

      return response;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Worker Error]', message);
      return new Response(JSON.stringify({
        code: 'PGRST500',
        message: message,
      }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
  },
};