// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const REAL_SUPABASE_URL = 'https://sfpgcjkmpqijniyzykau.supabase.co';
const REAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcGdjamttcHFpam5peXp5a2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5ODY0ODgsImV4cCI6MjA0MzU2MjQ4OH0.WiT1sOtfobReGst9Rf56EsqXNziMUWigLUG6VxhKQZs';

const realSupabase = createClient(REAL_SUPABASE_URL, REAL_SUPABASE_ANON_KEY);

// ==========================================
// WORKER URL — UPDATE THIS FOR YOUR ENV
// ==========================================
// Production: https://notes-api-production.cosmic-campus-api.workers.dev
// Staging:    https://notes-api-staging.cosmic-campus-api.workers.dev
// Local dev:  http://localhost:8787
const API_BASE = import.meta.env.VITE_API_URL || 'https://notes-api-production.cosmic-campus-api.workers.dev';

let authToken = null;
export const setApiToken = (token) => { authToken = token; };

const fetchAuthenticatedUser = async () => {
    const { data: { user }, error } = await realSupabase.auth.getUser();
    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }
    return user;
};

// ==========================================
// WORKER-ROUTED TABLES (notes only)
// ==========================================
const WORKER_TABLES = new Set(['note_table', 'lesson_chunks']);

const isWorkerTable = (table) => WORKER_TABLES.has(table);

// ==========================================
// URL BUILDER FOR WORKER
// ==========================================
const buildUrl = (table, columns, filters = {}) => {
  const url = new URL(`${API_BASE}/${table}`);
  // Remove spaces from columns to ensure PostgREST parses correctly
  const cleanColumns = columns.replace(/\s+/g, '');
  url.searchParams.set('select', cleanColumns);
  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url;
};

// ==========================================
// RESPONSE PARSER (shared)
// ==========================================
const parseResponse = async (res) => {
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { data: null, error: { message: text || `HTTP ${res.status}`, status: res.status, code: 'PGRST500' } };
  }

  if (json && typeof json === 'object' && 'code' in json && 'message' in json && !Array.isArray(json)) {
    return { data: null, error: { message: json.message, code: json.code, details: json.details, hint: json.hint, status: res.status } };
  }

  if (Array.isArray(json)) {
    return { data: json, error: null };
  }

  return { data: json, error: null };
};

// ==========================================
// WORKER QUERY EXECUTOR
// ==========================================
const executeWorkerQuery = async (url, options = {}) => {
  console.log('[workerClient]', url.toString());
  const headers = { ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  // Ensure Accept header is set
  if (!headers['Accept']) {
    headers['Accept'] = 'application/json';
  }

  const res = await fetch(url.toString(), { headers });
  const result = await parseResponse(res);

  // Extract count from Content-Range header if present
  const contentRange = res.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+|\*)/);
    if (match && match[1] !== '*') {
      result.count = parseInt(match[1], 10);
    }
  }

  return result;
};

const fetchWithAuth = async (url, options = {}, retries = 2) => {
  const headers = { ...(options.headers || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.status >= 500 && i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
};
// ==========================================
// QUERY BUILDER FOR WORKER (notes tables only)
// ==========================================
const createWorkerQueryBuilder = (table, columns, { count = null } = {}) => {
  const state = {
    filters: {},
    orderCol: null,
    asc: true,
    nullsFirst: false,
    limitVal: null,
    offsetVal: 0,
    singleMode: false,
    countMode: count,
    headMode: false,
  };

  const builder = {
    eq: (col, val) => { state.filters[col] = `eq.${val}`; return builder; },
    neq: (col, val) => { state.filters[col] = `neq.${val}`; return builder; },
    gt: (col, val) => { state.filters[col] = `gt.${val}`; return builder; },
    gte: (col, val) => { state.filters[col] = `gte.${val}`; return builder; },
    lt: (col, val) => { state.filters[col] = `lt.${val}`; return builder; },
    lte: (col, val) => { state.filters[col] = `lte.${val}`; return builder; },
    like: (col, pattern) => { state.filters[col] = `like.${pattern}`; return builder; },
    ilike: (col, pattern) => { state.filters[col] = `ilike.${pattern}`; return builder; },
    is: (col, val) => { state.filters[col] = `is.${val}`; return builder; },
    in: (col, vals) => { state.filters[col] = `in.(${vals.join(',')})`; return builder; },
    match: (filters) => {
      Object.entries(filters).forEach(([c, v]) => { state.filters[c] = `eq.${v}`; });
      return builder;
    },
    not: (col, op, val) => { state.filters[col] = `not.${op}.${val}`; return builder; },
    or: (conditions) => { state.filters['or'] = `(${conditions})`; return builder; },

    order: (col, { ascending = true, nullsFirst = false } = {}) => {
      state.orderCol = col;
      state.asc = ascending;
      state.nullsFirst = nullsFirst;
      return builder;
    },

    limit: (n) => { state.limitVal = n; return builder; },
    range: (from, to) => { state.offsetVal = from; state.limitVal = to - from + 1; return builder; },

    single: () => {
      state.singleMode = true;
      state.limitVal = 1;
      return builder.execute().then(({ data, error, count }) => {
        if (error) return { data: null, error, count };
        if (Array.isArray(data) && data.length === 0) {
          return {
            data: null,
            error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', status: 406 },
            count
          };
        }
        if (Array.isArray(data)) {
          return { data: data[0], error: null, count };
        }
        return { data, error: null, count };
      });
    },

    maybeSingle: () => {
      state.singleMode = true;
      state.limitVal = 1;
      return builder.execute().then(({ data, error, count }) => {
        if (error) return { data: null, error, count };
        if (Array.isArray(data) && data.length === 0) {
          return { data: null, error: null, count };
        }
        if (Array.isArray(data)) {
          return { data: data[0], error: null, count };
        }
        return { data, error: null, count };
      });
    },

    csv: () => builder.execute(),

    execute: async () => {
      const url = buildUrl(table, columns, state.filters);
      if (state.limitVal !== null) url.searchParams.set('limit', state.limitVal);
      url.searchParams.set('offset', state.offsetVal);
      if (state.orderCol) {
        const dir = state.asc ? 'asc' : 'desc';
        const nulls = state.nullsFirst ? 'nullsfirst' : 'nullslast';
        url.searchParams.set('order', `${state.orderCol}.${dir}.${nulls}`);
      }

      // Build headers
      const headers = {};
      if (state.singleMode) {
        headers['Accept'] = 'application/vnd.pgrst.object+json';
      } else {
        headers['Accept'] = 'application/json';
      }
      if (state.countMode) {
        headers['Prefer'] = `count=${state.countMode}`;
      }
      if (state.headMode) {
        headers['Prefer'] = 'return=minimal';
      }

      const result = await executeWorkerQuery(url, { headers });

      if (state.singleMode && Array.isArray(result.data) && result.data.length > 0) {
        return { data: result.data[0], error: result.error, count: result.count };
      }
      return result;
    },
  };

  builder.then = (resolve, reject) => builder.execute().then(resolve, reject);
  builder.catch = (reject) => builder.execute().catch(reject);

  return builder;
};

// ==========================================
// WORKER DB WRAPPER (notes tables only)
// ==========================================
const workerDbWrapper = {
  from: (table) => ({
    select: (columns = '*', { count = null, head = false } = {}) => {
      return createWorkerQueryBuilder(table, columns, { count });
    },

    insert: (values, { returning = 'representation', count = null } = {}) => {
      let url = `${API_BASE}/${table}`;
      if (count) {
        url += `?count=${encodeURIComponent(count)}`;
      }
      const headers = {
        'Content-Type': 'application/json',
        'Prefer': `return=${returning}`,
      };

      const doInsert = async () => {
        const res = await fetchWithAuth(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(values),
        });
        return parseResponse(res);
      };

      return {
        select: (columns = '*') => ({
          eq: async (col, val) => {
            const result = await doInsert();
            if (Array.isArray(result.data)) {
              result.data = result.data.filter(row => row[col] === val);
            }
            return result;
          },
          then: (resolve, reject) => doInsert().then(resolve, reject),
          catch: (reject) => doInsert().catch(reject),
        }),
        eq: async (col, val) => {
          const result = await doInsert();
          if (Array.isArray(result.data)) {
            result.data = result.data.filter(row => row[col] === val);
          }
          return result;
        },
        then: (resolve, reject) => doInsert().then(resolve, reject),
        catch: (reject) => doInsert().catch(reject),
      };
    },

    update: (values, { returning = 'representation', count = null } = {}) => ({
      eq: async (col, val) => {
        const res = await fetchWithAuth(`${API_BASE}/${table}?${col}=eq.${val}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': `return=${returning}`,
          },
          body: JSON.stringify(values),
        });
        return parseResponse(res);
      },
      match: async (filters) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([c, v]) => params.set(c, `eq.${v}`));
        const res = await fetchWithAuth(`${API_BASE}/${table}?${params.toString()}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': `return=${returning}`,
          },
          body: JSON.stringify(values),
        });
        return parseResponse(res);
      },
      in: async (col, vals) => {
        const res = await fetchWithAuth(`${API_BASE}/${table}?${col}=in.(${vals.join(',')})`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': `return=${returning}`,
          },
          body: JSON.stringify(values),
        });
        return parseResponse(res);
      },
    }),

    delete: ({ returning = 'representation', count = null } = {}) => ({
      eq: async (col, val) => {
        const res = await fetchWithAuth(`${API_BASE}/${table}?${col}=eq.${val}`, {
          method: 'DELETE',
          headers: { 'Prefer': `return=${returning}` },
        });
        return parseResponse(res);
      },
      match: async (filters) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([c, v]) => params.set(c, `eq.${v}`));
        const res = await fetchWithAuth(`${API_BASE}/${table}?${params.toString()}`, {
          method: 'DELETE',
          headers: { 'Prefer': `return=${returning}` },
        });
        return parseResponse(res);
      },
      in: async (col, vals) => {
        const res = await fetchWithAuth(`${API_BASE}/${table}?${col}=in.(${vals.join(',')})`, {
          method: 'DELETE',
          headers: { 'Prefer': `return=${returning}` },
        });
        return parseResponse(res);
      },
    }),

    upsert: (values, { onConflict, returning = 'representation', count = null, ignoreDuplicates = false } = {}) => {
      let url = `${API_BASE}/${table}`;
      if (onConflict) {
        url += `?on_conflict=${encodeURIComponent(onConflict)}`;
      }
      const prefer = [`return=${returning}`];
      if (ignoreDuplicates) prefer.push('resolution=ignore-duplicates');
      else prefer.push('resolution=merge-duplicates');

      const doUpsert = async () => {
        const res = await fetchWithAuth(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': prefer.join(','),
          },
          body: JSON.stringify(values),
        });
        return parseResponse(res);
      };

      return {
        select: (columns = '*') => ({
          eq: async (col, val) => {
            const result = await doUpsert();
            if (Array.isArray(result.data)) {
              result.data = result.data.filter(row => row[col] === val);
            }
            return result;
          },
          then: (resolve, reject) => doUpsert().then(resolve, reject),
          catch: (reject) => doUpsert().catch(reject),
        }),
        then: (resolve, reject) => doUpsert().then(resolve, reject),
        catch: (reject) => doUpsert().catch(reject),
      };
    },
  }),
};

// ==========================================
// ROUTING WRAPPER
// Routes note tables to Cloudflare worker, everything else to real Supabase
// ==========================================
const routingWrapper = {
  from: (table) => {
    if (isWorkerTable(table)) {
      console.log(`[router] Routing table "${table}" → Cloudflare Worker`);
      return workerDbWrapper.from(table);
    }
    console.log(`[router] Routing table "${table}" → Real Supabase`);
    return realSupabase.from(table);
  },
};

// ==========================================n// UNIFIED SUPABASE CLIENT
// ==========================================
export const supabase = {
  // Auth always goes to real Supabase
  auth: realSupabase.auth,

  // Realtime always goes to real Supabase
  channel: realSupabase.channel.bind(realSupabase),
  removeChannel: realSupabase.removeChannel.bind(realSupabase),
  getChannels: realSupabase.getChannels.bind(realSupabase),

  // Storage always goes to real Supabase
  storage: realSupabase.storage,

  // Functions always go to real Supabase
  functions: realSupabase.functions,

  // RPC always goes to real Supabase
  rpc: realSupabase.rpc.bind(realSupabase),

  // Schema always goes to real Supabase
  schema: realSupabase.schema.bind(realSupabase),

  // from() routes based on table name
  from: routingWrapper.from.bind(routingWrapper),
};

export { realSupabase };