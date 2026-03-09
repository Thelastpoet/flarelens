import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Proxy /api/* requests to the API worker via the service binding (production)
	// or direct fetch (development)
	if (event.url.pathname.startsWith('/api/')) {
		const apiPath = event.url.pathname.replace('/api', '');
		const apiUrl = `${event.url.origin}${apiPath}${event.url.search}`;

		// In production (Workers), use service binding
		if (event.platform?.env && 'API' in event.platform.env) {
			const apiEnv = event.platform.env as { API: Fetcher };
			const req = new Request(apiUrl, {
				method: event.request.method,
				headers: event.request.headers,
				body: ['GET', 'HEAD'].includes(event.request.method) ? undefined : event.request.body,
			});
			return apiEnv.API.fetch(req);
		}

		// In development, proxy to the local API worker port
		const devApiUrl = apiUrl.replace(event.url.origin, 'http://localhost:5174');
		const req = new Request(devApiUrl, {
			method: event.request.method,
			headers: event.request.headers,
			body: ['GET', 'HEAD'].includes(event.request.method) ? undefined : event.request.body,
			// @ts-expect-error - duplex needed for streaming bodies in Node
			duplex: 'half',
		});

		try {
			return await fetch(req);
		} catch {
			return new Response(
				JSON.stringify({ error: 'API unavailable', code: 'SERVICE_UNAVAILABLE' }),
				{
					status: 503,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}
	}

	return resolve(event);
};
