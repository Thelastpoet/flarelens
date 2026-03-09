import { ValidationError } from '@flarelens/shared';
import type { MiddlewareHandler } from 'hono';
import type { ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>): MiddlewareHandler {
	return async (c, next) => {
		let body: unknown;
		try {
			body = await c.req.json();
		} catch {
			throw new ValidationError('Request body must be valid JSON');
		}

		const result = schema.safeParse(body);
		if (!result.success) {
			throw new ValidationError('Validation failed', result.error.issues);
		}

		c.set('validatedBody', result.data);
		await next();
	};
}
