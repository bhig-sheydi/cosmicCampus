// lib/redis.js
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: import.meta.env.VITE_UPSTASH_REDIS_REST_URL,
  token: import.meta.env.VITE_UPSTASH_REDIS_REST_TOKEN,
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(retryCount * 100, 1000),
  },
});

const compress = (data) => {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error('Redis compression error:', e);
    return null;
  }
};

const decompress = (data) => {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    console.error('Redis decompression error:', e);
    return null;
  }
};

export const cacheRankings = async (key, data, ttl = 300) => {
  try {
    const serialized = compress(data);
    if (!serialized) return false;
    
    if (serialized.length > 900000) {
      console.warn(`Ranking data too large for Redis: ${key} (${serialized.length} bytes)`);
      return false;
    }
    
    await redis.setex(`rankings:${key}`, ttl, serialized);
    return true;
  } catch (error) {
    console.error('Redis cache error:', error);
    return false;
  }
};

export const getCachedRankings = async (key) => {
  try {
    const data = await redis.get(`rankings:${key}`);
    return decompress(data);
  } catch (error) {
    console.error('Redis retrieval error:', error);
    return null;
  }
};

export const invalidateRankings = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return keys.length;
  } catch (error) {
    console.error('Redis invalidation error:', error);
    return 0;
  }
};

export const cacheGuardianDashboard = async (guardianId, term, data) => {
  const key = `guardian:${guardianId}:term:${term}`;
  return cacheRankings(key, data, 600);
};

export const getGuardianDashboard = async (guardianId, term) => {
  const key = `guardian:${guardianId}:term:${term}`;
  return getCachedRankings(key);
};

export const cacheTopPerformers = async (classId, term, subjectId, data) => {
  const key = `top:${classId}:term:${term}:subject:${subjectId}`;
  return cacheRankings(key, data, 3600);
};

export const getTopPerformers = async (classId, term, subjectId) => {
  const key = `top:${classId}:term:${term}:subject:${subjectId}`;
  return getCachedRankings(key);
};

export const checkRedisHealth = async () => {
  try {
    await redis.ping();
    return { status: 'healthy', timestamp: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: Date.now() };
  }
};