import { browser } from '$app/environment';

// API error shape returned by Hono
export interface ApiError {
	error: string;
	code: string;
	details?: unknown;
}

export class ApiRequestError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = 'ApiRequestError';
	}
}

// The client takes either a `fetch` function (from SvelteKit load) or uses global fetch
type FetchFn = typeof fetch;

export function createApiClient(fetchFn: FetchFn, baseUrl = '') {
	async function request<T>(
		method: string,
		path: string,
		options?: { body?: unknown; query?: Record<string, string | number | boolean | undefined> },
	): Promise<T> {
		const requestPath = `${baseUrl}${path}`;
		const url = browser
			? new URL(requestPath, window.location.origin)
			: new URL(requestPath, 'https://internal.flarelens');
		if (options?.query) {
			for (const [key, value] of Object.entries(options.query)) {
				if (value !== undefined) {
					url.searchParams.set(key, String(value));
				}
			}
		}

		const headers: Record<string, string> = {};
		let body: string | undefined;

		if (options?.body !== undefined) {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(options.body);
		}

		const target =
			browser || /^https?:\/\//.test(requestPath) ? url.toString() : `${url.pathname}${url.search}`;

		const response = await fetchFn(target, {
			method,
			headers,
			body,
			credentials: 'include',
		});

		if (!response.ok) {
			let code = 'UNKNOWN_ERROR';
			let message = `Request failed with status ${response.status}`;
			let details: unknown;

			try {
				const errorBody = (await response.json()) as Partial<ApiError>;
				if (errorBody.error) message = errorBody.error;
				if (errorBody.code) code = errorBody.code;
				if (errorBody.details !== undefined) details = errorBody.details;
			} catch {
				// Response body was not valid JSON — keep defaults
			}

			throw new ApiRequestError(response.status, code, message, details);
		}

		// 204 No Content — return empty object cast to T
		if (response.status === 204) {
			return undefined as T;
		}

		return response.json() as Promise<T>;
	}

	return {
		get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
			request<T>('GET', path, { query }),
		post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
		patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
		put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
		delete: <T>(path: string) => request<T>('DELETE', path),
	};
}

// Singleton for client-side usage (browser)
// In SvelteKit load functions, pass the event.fetch instead
export const api = createApiClient(fetch, '/api');
