const Redis = require('ioredis');

/**
 * OAuth State Management Service using Redis
 * Provides secure, persistent storage for OAuth state tokens
 */
class OAuthStateService {
  constructor() {
    // Create Redis client with same config as queue service
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 5,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true // Don't connect until first use
    };

    // Add password if provided
    if (process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD.trim() !== '') {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    // Enable TLS for hosted Redis services
    const explicitTLS = process.env.REDIS_TLS === 'true';
    const hostedRedisIndicators = ['upstash.io', 'redislabs.com', 'redis.cloud', 'amazonaws.com'];
    const isHostedRedis = hostedRedisIndicators.some(domain => redisConfig.host.includes(domain));
    const isLocalhost = redisConfig.host.includes('localhost') || redisConfig.host.includes('127.0.0.1');

    if ((explicitTLS || isHostedRedis) && !isLocalhost) {
      redisConfig.tls = {
        // SECURITY: Always verify TLS certificates in production
        // Set REDIS_TLS_REJECT_UNAUTHORIZED=false ONLY for development/testing
        rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
      };
    }

    this.client = new Redis(redisConfig);
    this.keyPrefix = 'oauth:state:';
    this.defaultTTL = 10 * 60; // 10 minutes in seconds

    // Handle Redis connection errors
    this.client.on('error', (error) => {
      console.error('❌ OAuth State Redis Error:', error.message);
    });

    this.client.on('ready', () => {
      console.log('✅ OAuth State Redis connected');
    });
  }

  /**
   * Store OAuth state with expiration
   * @param {string} state - Unique state token
   * @param {object} data - State data (userId, provider, returnUrl, etc.)
   * @param {number} ttl - Time to live in seconds (default: 10 minutes)
   */
  async set(state, data, ttl = this.defaultTTL) {
    try {
      const key = this.keyPrefix + state;
      const value = JSON.stringify({
        ...data,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl * 1000)
      });

      await this.client.setex(key, ttl, value);
      return true;
    } catch (error) {
      console.error('Failed to store OAuth state:', error.message);
      throw new Error('Failed to store OAuth state');
    }
  }

  /**
   * Retrieve and delete OAuth state (one-time use)
   * @param {string} state - State token to retrieve
   * @returns {object|null} State data or null if not found/expired
   */
  async getAndDelete(state) {
    try {
      const key = this.keyPrefix + state;

      // Get and delete in pipeline for atomicity
      const pipeline = this.client.pipeline();
      pipeline.get(key);
      pipeline.del(key);

      const results = await pipeline.exec();

      // results is array of [error, result] tuples
      if (results[0][0] || !results[0][1]) {
        return null; // Not found or error
      }

      const data = JSON.parse(results[0][1]);

      // Check if expired (extra safety check)
      if (data.expiresAt < Date.now()) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to retrieve OAuth state:', error.message);
      return null;
    }
  }

  /**
   * Check if state exists (without deleting)
   * @param {string} state - State token
   * @returns {boolean}
   */
  async exists(state) {
    try {
      const key = this.keyPrefix + state;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Failed to check OAuth state:', error.message);
      return false;
    }
  }

  /**
   * Delete OAuth state manually
   * @param {string} state - State token to delete
   */
  async delete(state) {
    try {
      const key = this.keyPrefix + state;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Failed to delete OAuth state:', error.message);
      return false;
    }
  }

  /**
   * Clean up expired states (Redis handles this automatically via TTL)
   * This method is for manual cleanup if needed
   */
  async cleanup() {
    // Redis automatically removes expired keys via TTL
    // This is a no-op but kept for interface compatibility
    return true;
  }

  /**
   * Get statistics about stored states (for monitoring)
   */
  async getStats() {
    try {
      const keys = await this.client.keys(this.keyPrefix + '*');
      return {
        totalStates: keys.length,
        keyPrefix: this.keyPrefix
      };
    } catch (error) {
      console.error('Failed to get OAuth state stats:', error.message);
      return { totalStates: 0, error: error.message };
    }
  }

  /**
   * Close Redis connection (for graceful shutdown)
   */
  async close() {
    await this.client.quit();
  }
}

module.exports = new OAuthStateService();
