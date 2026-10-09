import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors";

/**
 * Middleware to validate request body, query, and params using Zod schemas.
 * @param schema An object with optional keys: body, query, params, each being a Zod schema.
 * @returns Express middleware function.
 */
export function validateRequest(schema: {
	body?: any;
	query?: any;
	params?: any;
}) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			if (schema.body) {
				req.body = schema.body.parse(req.body);
			}
			if (schema.query) {
				req.query = schema.query.parse(req.query);
			}
			if (schema.params) {
				req.params = schema.params.parse(req.params);
			}
			next();
		} catch (err) {
			if (err instanceof ZodError) {
				// Flatten the error messages to a single string
				const zodError = err as ZodError;
				const errors = zodError.issues.map((issue) => issue.message).join(", ");
				throw new ValidationError(errors);
			}
			throw err;
		}
	};
}
