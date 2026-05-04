/**
 * Simple in-memory rate limiter
 * For production, use a proper rate limiting service or Redis
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Check if request is allowed
   * @param key - Unique identifier (e.g., user ID)
   * @returns true if allowed, false if rate limited
   */
  check(key: string): boolean {
    const now = Date.now()
    const entry = this.limits.get(key)

    // No entry or expired - allow and create new entry
    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs
      })
      return true
    }

    // Check if under limit
    if (entry.count < this.config.maxRequests) {
      entry.count++
      return true
    }

    // Rate limited
    return false
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const entry = this.limits.get(key)
    if (!entry || Date.now() > entry.resetTime) {
      return this.config.maxRequests
    }
    return Math.max(0, this.config.maxRequests - entry.count)
  }

  /**
   * Get time until reset (in ms)
   */
  getResetTime(key: string): number {
    const entry = this.limits.get(key)
    if (!entry) return 0
    return Math.max(0, entry.resetTime - Date.now())
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key)
      }
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string) {
    this.limits.delete(key)
  }
}

// Rate limiters for different operations
export const sceneRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 scenes
  windowMs: 60000  // per minute
})

export const folderRateLimiter = new RateLimiter({
  maxRequests: 20, // 20 folders
  windowMs: 60000  // per minute
})

export const apiRateLimiter = new RateLimiter({
  maxRequests: 100, // 100 requests
  windowMs: 60000   // per minute
})

/**
 * Rate limit error
 */
export class RateLimitError extends Error {
  constructor(
    public resetTime: number,
    public remaining: number
  ) {
    super('Rate limit exceeded. Please try again later.')
    this.name = 'RateLimitError'
  }
}

/**
 * Check rate limit and throw error if exceeded
 */
export function checkRateLimit(limiter: RateLimiter, key: string) {
  if (!limiter.check(key)) {
    throw new RateLimitError(
      limiter.getResetTime(key),
      limiter.getRemaining(key)
    )
  }
}
