import type { FastifyServerOptions } from "fastify";
import { env } from "../config/env.js";

/**
 * Configure Fastify's structured logger with redactions for sensitive fields.
 */
export function getLoggerConfig(): FastifyServerOptions["logger"] {
  if (env.NODE_ENV === "test") {
    // Silent in automated test runs unless overridden
    return false;
  }

  return {
    level: env.LOG_LEVEL,
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.passwordConfirmation",
      "req.body.token",
      "*.password",
      "*.password_hash",
      "*.token_hash",
      "*.sessionSecret",
    ],
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          path: req.routeOptions?.url || req.url,
          parameters: req.params,
          remoteAddress: req.ip,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  };
}
