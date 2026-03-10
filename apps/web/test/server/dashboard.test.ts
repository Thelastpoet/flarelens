import { describe, expect, it } from 'vitest';
import { loadDashboardPage } from '../../src/lib/server/dashboard.js';

function createJsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

describe('loadDashboardPage', () => {
	it('returns explicit unavailable state when upstream analytics requests fail', async () => {
		const fetchFn: typeof fetch = async () =>
			createJsonResponse({ error: 'API unavailable' }, 503);

		const result = await loadDashboardPage(fetchFn);
		expect(result).toEqual({
			state: 'unavailable',
			message: 'Live dashboard analytics are temporarily unavailable for this account.',
		});
	});

	it('parses ready-state dashboard data with strict normalized shapes', async () => {
		const fetchFn: typeof fetch = async (input) => {
			const path = input.toString();

			if (path.endsWith('/analytics/overview')) {
				return createJsonResponse({
					totalRequests: 1200,
					cachedRequests: 900,
					cacheHitRate: 0.75,
					totalBytes: 2048,
					estimatedCost: 1.25,
					activeAnomalies: 1,
					workerExecutions: 32,
					threatsBlocked: 4,
					periodFrom: '2026-03-10T00:00:00.000Z',
					periodTo: '2026-03-10T01:00:00.000Z',
				});
			}

			if (path.endsWith('/analytics/traffic')) {
				return createJsonResponse({
					points: [
						{
							datetime: '2026-03-10T00:00:00.000Z',
							requests: 100,
							cachedRequests: 75,
							uncachedRequests: 25,
							bytes: 512,
						},
					],
					totalRequests: 100,
					totalCachedRequests: 75,
					totalBytes: 512,
					from: '2026-03-10T00:00:00.000Z',
					to: '2026-03-10T01:00:00.000Z',
				});
			}

			if (path.endsWith('/analytics/baseline')) {
				return createJsonResponse({
					comparisons: [
						{
							metric: 'requests',
							currentValue: 100,
							baselineAvg: 80,
							baselineStddev: 10,
							deviationSigma: 2,
							status: 'warning',
						},
					],
					from: '2026-03-03T00:00:00.000Z',
					to: '2026-03-09T00:00:00.000Z',
				});
			}

			if (path.endsWith('/analytics/top-endpoints')) {
				return createJsonResponse({
					endpoints: [
						{ path: '/login', requests: 50, bytes: 256 },
						{ path: '/api', requests: 50, bytes: 256 },
					],
				});
			}

			if (path.endsWith('/analytics/bot-activity')) {
				return createJsonResponse({
					bots: [{ browser: 'curl', requests: 40, isBot: true }],
					botTrafficPct: 0.4,
				});
			}

			throw new Error(`Unexpected path ${path}`);
		};

		const result = await loadDashboardPage(fetchFn);
		expect(result.state).toBe('ready');
		if (result.state !== 'ready') {
			throw new Error('Expected ready state');
		}
		expect(result.baseline.comparisons[0]?.deviationSigma).toBe(2);
		expect(result.endpoints.endpoints[0]?.pctOfTotal).toBe(50);
		expect(result.botActivity.botTrafficPct).toBe(40);
	});
});
