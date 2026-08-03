import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, errors, splat, json, colorize, printf } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const base = `${ts as string} [${level}] ${stack ?? message}`;
  const extras = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${base}${extras}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(timestamp(), errors({ stack: true }), splat(), json()),
  defaultMeta: { service: 'pdf-forge-api' },
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'production'
          ? combine(timestamp(), errors({ stack: true }), splat(), json())
          : combine(colorize({ all: true }), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
    }),
  ],
});

/**
 * `morgan`-compatible stream that pipes HTTP access logs through Winston
 * at the `http` level — keeps a single, structured log surface.
 */
export const httpLoggerStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
