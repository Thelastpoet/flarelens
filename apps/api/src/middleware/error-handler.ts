import { AppError } from '@flarelens/shared';
import type { ErrorHandler } from 'hono';
import type { Env } from '../env.js';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
	if (err instanceof AppError) {
		return c.json(
			{
				error: err.message,
				code: err.code,
				...(err.details !== undefined && { details: err.details }),
			},
			err.statusCode as Parameters<typeof c.json>[1],
		);
	}

	// Log unexpected errors
	console.error('[UnhandledError]', {
		message: err.message,
		stack: err.stack,
		url: c.req.url,
		method: c.req.method,
	});

	return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
};
