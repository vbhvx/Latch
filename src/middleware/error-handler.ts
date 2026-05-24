import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, type ApiErrorResponse, type ErrorDetail } from "../errors/app-error.js";

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): FastifyReply {
  const requestId = request.id || "req_unknown";

  // 1. Zod Validation Errors
  if (error instanceof ZodError) {
    const details: ErrorDetail[] = error.issues.map((issue) => {
      const field = issue.path.join(".");
      const issueObj = issue as unknown as { code: string; received?: string };
      let code = issueObj.code.toUpperCase();

      if (issue.code === "too_small") {
        code = "TOO_SHORT";
      } else if (issue.code === "too_big") {
        code = "TOO_LONG";
      } else if (issue.code === "invalid_type") {
        code = issueObj.received === "undefined" ? "REQUIRED" : "INVALID_TYPE";
      }

      return {
        field: field.length > 0 ? field : undefined,
        code,
        message: issue.message,
      };
    });

    const response: ApiErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid fields.",
        details,
        requestId,
      },
    };

    return reply.status(400).send(response);
  }

  // 2. Custom Application Errors
  if (error instanceof AppError) {
    if (!error.isOperational) {
      request.log.error({ err: error, requestId }, `Non-operational error: ${error.message}`);
    }

    const response: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    };

    return reply.status(error.statusCode).send(response);
  }

  // 3. PostgreSQL Known Errors (Sanitized)
  const pgErr = error as PostgresError;
  if (pgErr.code) {
    request.log.error(
      {
        pgCode: pgErr.code,
        constraint: pgErr.constraint,
        table: pgErr.table,
        requestId,
        errMessage: pgErr.message,
      },
      "Database constraint or query error"
    );

    switch (pgErr.code) {
      case "23505": {
        // Unique violation
        const response: ApiErrorResponse = {
          error: {
            code: "CONFLICT",
            message: "A resource with these details already exists.",
            requestId,
          },
        };
        return reply.status(409).send(response);
      }
      case "23503": {
        // Foreign key violation
        const response: ApiErrorResponse = {
          error: {
            code: "FOREIGN_KEY_VIOLATION",
            message: "The referenced parent resource does not exist.",
            requestId,
          },
        };
        return reply.status(400).send(response);
      }
      case "23514": {
        // Check constraint violation
        const response: ApiErrorResponse = {
          error: {
            code: "CONSTRAINT_VIOLATION",
            message: "The operation violates a data validity rule.",
            requestId,
          },
        };
        return reply.status(400).send(response);
      }
      case "57014": {
        // Query canceled / statement timeout
        const response: ApiErrorResponse = {
          error: {
            code: "TIMEOUT",
            message: "The database operation timed out.",
            requestId,
          },
        };
        return reply.status(504).send(response);
      }
      default: {
        const response: ApiErrorResponse = {
          error: {
            code: "DATABASE_ERROR",
            message: "An internal database error occurred.",
            requestId,
          },
        };
        return reply.status(500).send(response);
      }
    }
  }

  // 4. Fastify Rate Limit (429)
  if ("statusCode" in error && error.statusCode === 429) {
    const response: ApiErrorResponse = {
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please slow down and try again.",
        requestId,
      },
    };
    return reply.status(429).send(response);
  }

  // 5. Fastify 404 Route Not Found
  if ("statusCode" in error && error.statusCode === 404) {
    const response: ApiErrorResponse = {
      error: {
        code: "NOT_FOUND",
        message: "Endpoint not found.",
        requestId,
      },
    };
    return reply.status(404).send(response);
  }

  // 6. Generic Unhandled Internal Server Errors
  request.log.error({ err: error, requestId }, "Unhandled internal server error");

  const response: ApiErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please contact support if the issue persists.",
      requestId,
    },
  };

  return reply.status(500).send(response);
}
