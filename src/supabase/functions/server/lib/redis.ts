/**
 * Redis-like caching layer using KV store
 * Provides temporary caching for sensor data and other frequently accessed items
 */

const CACHE_PREFIX = 'cache:';
const DEFAULT_TTL = 3600; // 1 hour in seconds

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class RedisCache {
  private static memoryCache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Set a value in cache with optional TTL
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const expiresAt = Date.now() + (ttlSeconds * 1000);

    const entry: CacheEntry<T> = {
      data: value,
      expiresAt,
    };

    this.memoryCache.set(cacheKey, entry);
  }

  /**
   * Get a value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete a value from cache
   */
  static async delete(key: string): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    this.memoryCache.delete(cacheKey);
  }

  /**
   * Check if key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry = this.memoryCache.get(cacheKey);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Get multiple values at once
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      const value = await this.get<T>(key);
      results.push(value);
    }

    return results;
  }

  /**
   * Set multiple values at once
   */
  static async mset(entries: Record<string, any>, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    const promises = Object.entries(entries).map(([key, value]) =>
      this.set(key, value, ttlSeconds)
    );

    await Promise.all(promises);
  }

  /**
   * Clear expired entries from cache
   */
  static cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; expired: number } {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.memoryCache.values()) {
      if (now > entry.expiresAt) {
        expired++;
      }
    }

    return {
      size: this.memoryCache.size,
      expired,
    };
  }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  RedisCache.cleanupExpired();
}, 5 * 60 * 1000);
