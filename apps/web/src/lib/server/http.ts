type ServerFetch = typeof fetch;

interface ApiErrorPayload {
	error?: string;
	code?: string;
}

function apiPath(path: string): string {
	return path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`;
}

export async function fetchJson(fetchFn: ServerFetch, path: string): Promise<unknown> {
	const response = await fetchFn(apiPath(path), {
		credentials: 'include',
	});

	if (!response.ok) {
		let message = `${response.status} ${response.statusText}`;
		try {
			const payload = (await response.json()) as ApiErrorPayload;
			if (payload.error) {
				message = payload.error;
			}
		} catch {
			// keep HTTP status message
		}
		throw new Error(`Request to ${apiPath(path)} failed: ${message}`);
	}

	return response.json();
}

