import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../lib/env.js';

const rateLimitOptions: Partial<Options> = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later.',
    },
  },
};

export const apiRateLimiter = rateLimit(rateLimitOptions);

/**
 * A stricter limiter intended for expensive endpoints
 * (e.g. PDF compression / OCR). 20 requests / minute by default.
 */
export const heavyRateLimiter = rateLimit({
  ...rateLimitOptions,
  limit: Math.max(1, Math.floor(env.RATE_LIMIT_MAX / 5)),
});
