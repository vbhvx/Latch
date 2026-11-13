import type { FastifyRequest, FastifyReply } from "fastify";
import type { ZodTypeAny } from "zod";

export interface RequestValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: RequestValidationSchemas) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (schemas.params) {
      const parsedParams = await schemas.params.parseAsync(request.params);
      request.params = parsedParams as Record<string, unknown>;
    }

    if (schemas.query) {
      const parsedQuery = await schemas.query.parseAsync(request.query);
      request.query = parsedQuery as Record<string, unknown>;
    }

    if (schemas.body) {
      const parsedBody = await schemas.body.parseAsync(request.body);
      request.body = parsedBody as Record<string, unknown>;
    }
  };
}
