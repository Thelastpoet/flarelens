import { describe, expect, it } from 'vitest';
import { loadAnalyticsPage } from '../../src/lib/server/analytics.js';

function createJsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

describe('loadAnalyticsPage', () => {
	it('returns explicit unavailable state when analytics endpoints fail', async () => {
		const fetchFn: typeof fetch = async () =>
			createJsonResponse({ error: 'Analytics unavailable' }, 503);

		const result = await loadAnalyticsPage(fetchFn);
		expect(result).toEqual({
			state: 'unavailable',
			message: 'Live analytics are temporarily unavailable for this account.',
		});
	});

	it('parses ready-state analytics payloads without relying on page-level defaults', async () => {
		const fetchFn: typeof fetch = async (input) => {
			const path = input.toString();

			if (path.endsWith('/analytics/traffic')) {
				return createJsonResponse({
					points: [
						{
							datetime: '2026-03-10T00:00:00.000Z',
							requests: 100,
							cachedRequests: 60,
							uncachedRequests: 40,
							bytes: 1024,
						},
					],
					totalRequests: 100,
					totalCachedRequests: 60,
					totalBytes: 1024,
					from: '2026-03-10T00:00:00.000Z',
					to: '2026-03-10T01:00:00.000Z',
				});
			}

			if (path.endsWith('/analytics/geo')) {
				return createJsonResponse({
					countries: [
						{ country: 'US', requests: 70 },
						{ country: 'DE', requests: 30 },
					],
				});
			}

			if (path.endsWith('/analytics/clients')) {
				return createJsonResponse({
					clients: [{ browser: 'Chrome', requests: 80, bytes: 512, percentage: 0.8 }],
					from: '2026-03-10T00:00:00.000Z',
					to: '2026-03-10T01:00:00.000Z',
				});
			}

			if (path.endsWith('/analytics/top-endpoints')) {
				return createJsonResponse({
					endpoints: [{ path: '/login', requests: 100, bytes: 256 }],
				});
			}

			if (path.endsWith('/analytics/performance')) {
				return createJsonResponse({
					avgResponseMs: 120,
					p95ResponseMs: 240,
					errorRate: 0.02,
					threatsBlocked: 5,
					workerAvgCpuMs: 12,
					workerErrorRate: 0.01,
					from: '2026-03-10T00:00:00.000Z',
					to: '2026-03-10T01:00:00.000Z',
				});
			}

			if (path.endsWith('/analytics/errors')) {
				return createJsonResponse({
					errors: [{ status: 500, requests: 2, percentage: 0.02 }],
					totalErrors: 2,
					from: '2026-03-10T00:00:00.000Z',
					to: '2026-03-10T01:00:00.000Z',
				});
			}

			throw new Error(`Unexpected path ${path}`);
		};

		const result = await loadAnalyticsPage(fetchFn);
		expect(result.state).toBe('ready');
		if (result.state !== 'ready') {
			throw new Error('Expected ready state');
		}
		expect(result.geo.countries[0]?.pctOfTotal).toBe(70);
		expect(result.clients.clients[0]?.percentage).toBe(0.8);
		expect(result.errors.errors[0]?.percentage).toBe(0.02);
	});
});
