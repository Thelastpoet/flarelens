import { AppError } from '@flarelens/shared';
import type { ErrorHandler } from 'hono';
import type { AppContext } from './auth.js';

export const errorHandler: ErrorHandler<AppContext> = (err, c) => {
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
		request_id: c.get('requestId'),
	});

	return c.json(
		{
			error: 'Internal server error',
			code: 'INTERNAL_ERROR',
			request_id: c.get('requestId'),
		},
		500,
	);
};
