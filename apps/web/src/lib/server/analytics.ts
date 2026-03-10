import {
	expectArray,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

type AnalyticsReadyData = {
	state: 'ready';
	traffic: {
		points: Array<{
			datetime: string;
			requests: number;
			cachedRequests: number;
			uncachedRequests: number;
			bytes: number;
		}>;
		totalRequests: number;
		totalCachedRequests: number;
		totalBytes: number;
		from: string;
		to: string;
	};
	geo: {
		countries: Array<{
			country: string;
			requests: number;
			pctOfTotal: number;
		}>;
	};
	clients: {
		clients: Array<{
			browser: string;
			requests: number;
			bytes: number;
			percentage: number;
		}>;
		from: string;
		to: string;
	};
	endpoints: {
		endpoints: Array<{
			path: string;
			requests: number;
			bytes: number;
			pctOfTotal: number;
		}>;
	};
	performance: {
		avgResponseMs: number;
		p95ResponseMs: number;
		errorRate: number;
		threatsBlocked: number;
		workerAvgCpuMs: number;
		workerErrorRate: number;
		from: string;
		to: string;
	};
	errors: {
		errors: Array<{
			status: number;
			requests: number;
			percentage: number;
		}>;
		totalErrors: number;
		from: string;
		to: string;
	};
};

export type AnalyticsPageData =
	| AnalyticsReadyData
	| {
			state: 'unavailable';
			message: string;
	  };

function isUpstreamRequestFailure(error: unknown): boolean {
	return error instanceof Error && error.message.startsWith('Request to /api/');
}

function parseTraffic(value: unknown): AnalyticsReadyData['traffic'] {
	const data = expectObject(value, 'analytics.traffic');
	const points = expectArray(data.points, 'analytics.traffic.points').map((item, index) => {
		const row = expectObject(item, `analytics.traffic.points[${index}]`);
		return {
			datetime: expectString(row.datetime, `analytics.traffic.points[${index}].datetime`),
			requests: expectNumber(row.requests, `analytics.traffic.points[${index}].requests`),
			cachedRequests: expectNumber(
				row.cachedRequests,
				`analytics.traffic.points[${index}].cachedRequests`,
			),
			uncachedRequests: expectNumber(
				row.uncachedRequests,
				`analytics.traffic.points[${index}].uncachedRequests`,
			),
			bytes: expectNumber(row.bytes, `analytics.traffic.points[${index}].bytes`),
		};
	});
	return {
		points,
		totalRequests: expectNumber(data.totalRequests, 'analytics.traffic.totalRequests'),
		totalCachedRequests: expectNumber(
			data.totalCachedRequests,
			'analytics.traffic.totalCachedRequests',
		),
		totalBytes: expectNumber(data.totalBytes, 'analytics.traffic.totalBytes'),
		from: expectString(data.from, 'analytics.traffic.from'),
		to: expectString(data.to, 'analytics.traffic.to'),
	};
}

function parseGeo(value: unknown): AnalyticsReadyData['geo'] {
	const data = expectObject(value, 'analytics.geo');
	const rows = expectArray(data.countries, 'analytics.geo.countries').map((item, index) => {
		const row = expectObject(item, `analytics.geo.countries[${index}]`);
		return {
			country: expectString(row.country, `analytics.geo.countries[${index}].country`),
			requests: expectNumber(row.requests, `analytics.geo.countries[${index}].requests`),
		};
	});
	const totalRequests = rows.reduce((sum, row) => sum + row.requests, 0);
	return {
		countries: rows.map((row) => ({
			...row,
			pctOfTotal: totalRequests > 0 ? (row.requests / totalRequests) * 100 : 0,
		})),
	};
}

function parseClients(value: unknown): AnalyticsReadyData['clients'] {
	const data = expectObject(value, 'analytics.clients');
	const clients = expectArray(data.clients, 'analytics.clients.clients').map((item, index) => {
		const row = expectObject(item, `analytics.clients.clients[${index}]`);
		return {
			browser: expectString(row.browser, `analytics.clients.clients[${index}].browser`),
			requests: expectNumber(row.requests, `analytics.clients.clients[${index}].requests`),
			bytes: expectNumber(row.bytes, `analytics.clients.clients[${index}].bytes`),
			percentage: expectNumber(
				row.percentage,
				`analytics.clients.clients[${index}].percentage`,
			),
		};
	});
	return {
		clients,
		from: expectString(data.from, 'analytics.clients.from'),
		to: expectString(data.to, 'analytics.clients.to'),
	};
}

function parseEndpoints(value: unknown): AnalyticsReadyData['endpoints'] {
	const data = expectObject(value, 'analytics.endpoints');
	const rows = expectArray(data.endpoints, 'analytics.endpoints.endpoints').map((item, index) => {
		const row = expectObject(item, `analytics.endpoints.endpoints[${index}]`);
		return {
			path: expectString(row.path, `analytics.endpoints.endpoints[${index}].path`),
			requests: expectNumber(row.requests, `analytics.endpoints.endpoints[${index}].requests`),
			bytes: expectNumber(row.bytes, `analytics.endpoints.endpoints[${index}].bytes`),
		};
	});
	const totalRequests = rows.reduce((sum, row) => sum + row.requests, 0);
	return {
		endpoints: rows.map((row) => ({
			...row,
			pctOfTotal: totalRequests > 0 ? (row.requests / totalRequests) * 100 : 0,
		})),
	};
}

function parsePerformance(value: unknown): AnalyticsReadyData['performance'] {
	const data = expectObject(value, 'analytics.performance');
	return {
		avgResponseMs: expectNumber(data.avgResponseMs, 'analytics.performance.avgResponseMs'),
		p95ResponseMs: expectNumber(data.p95ResponseMs, 'analytics.performance.p95ResponseMs'),
		errorRate: expectNumber(data.errorRate, 'analytics.performance.errorRate'),
		threatsBlocked: expectNumber(data.threatsBlocked, 'analytics.performance.threatsBlocked'),
		workerAvgCpuMs: expectNumber(
			data.workerAvgCpuMs,
			'analytics.performance.workerAvgCpuMs',
		),
		workerErrorRate: expectNumber(
			data.workerErrorRate,
			'analytics.performance.workerErrorRate',
		),
		from: expectString(data.from, 'analytics.performance.from'),
		to: expectString(data.to, 'analytics.performance.to'),
	};
}

function parseErrors(value: unknown): AnalyticsReadyData['errors'] {
	const data = expectObject(value, 'analytics.errors');
	const errors = expectArray(data.errors, 'analytics.errors.errors').map((item, index) => {
		const row = expectObject(item, `analytics.errors.errors[${index}]`);
		return {
			status: expectNumber(row.status, `analytics.errors.errors[${index}].status`),
			requests: expectNumber(row.requests, `analytics.errors.errors[${index}].requests`),
			percentage: expectNumber(
				row.percentage,
				`analytics.errors.errors[${index}].percentage`,
			),
		};
	});
	return {
		errors,
		totalErrors: expectNumber(data.totalErrors, 'analytics.errors.totalErrors'),
		from: expectString(data.from, 'analytics.errors.from'),
		to: expectString(data.to, 'analytics.errors.to'),
	};
}

export async function loadAnalyticsPage(fetchFn: typeof fetch): Promise<AnalyticsPageData> {
	try {
		const [traffic, geo, clients, endpoints, performance, errors] = await Promise.all([
			fetchJson(fetchFn, '/analytics/traffic'),
			fetchJson(fetchFn, '/analytics/geo'),
			fetchJson(fetchFn, '/analytics/clients'),
			fetchJson(fetchFn, '/analytics/top-endpoints'),
			fetchJson(fetchFn, '/analytics/performance'),
			fetchJson(fetchFn, '/analytics/errors'),
		]);

		return {
			state: 'ready',
			traffic: parseTraffic(traffic),
			geo: parseGeo(geo),
			clients: parseClients(clients),
			endpoints: parseEndpoints(endpoints),
			performance: parsePerformance(performance),
			errors: parseErrors(errors),
		};
	} catch (error) {
		if (isUpstreamRequestFailure(error)) {
			return {
				state: 'unavailable',
				message: 'Live analytics are temporarily unavailable for this account.',
			};
		}

		throw error;
	}
}
