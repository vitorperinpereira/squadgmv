import pino, { type Logger, type LoggerOptions } from "pino";
import { randomUUID } from "node:crypto";

export function createLogger(options?: LoggerOptions): Logger {
  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    ...options
  });
}

export function createCorrelationId(prefix = "gmv"): string {
  return `${prefix}_${randomUUID()}`;
}

export function withCorrelation(logger: Logger, correlationId: string): Logger {
  return logger.child({ correlationId });
}
