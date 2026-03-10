import {
	expectArray,
	expectBoolean,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

interface DashboardOverview {
	totalRequests: number;
	cachedRequests: number;
	cacheHitRate: number;
	totalBytes: number;
	estimatedCost: number;
	activeAnomalies: number;
	workerExecutions: number;
	threatsBlocked: number;
	periodFrom: string;
	periodTo: string;
}

interface DashboardTrafficPoint {
	datetime: string;
	requests: number;
	cachedRequests: number;
	uncachedRequests: number;
	bytes: number;
}

interface DashboardBaselineItem {
	metric: string;
	currentValue: number;
	baselineAvg: number;
	baselineStddev: number;
	deviationSigma: number;
	status: 'normal' | 'warning' | 'high' | 'critical';
}

interface DashboardTopEndpoint {
	path: string;
	requests: number;
	bytes: number;
	pctOfTotal: number;
}

interface DashboardBotItem {
	userAgent: string;
	requests: number;
	pctOfTotal: number;
	isBot: boolean;
}

type DashboardReadyData = {
	state: 'ready';
	overview: DashboardOverview;
	traffic: {
		points: DashboardTrafficPoint[];
		totalRequests: number;
		totalCachedRequests: number;
		totalBytes: number;
		from: string;
		to: string;
	};
	baseline: {
		comparisons: DashboardBaselineItem[];
		from: string;
		to: string;
	};
	endpoints: {
		endpoints: DashboardTopEndpoint[];
	};
	botActivity: {
		items: DashboardBotItem[];
		botTrafficPct: number;
	};
};

export type DashboardPageData =
	| DashboardReadyData
	| {
			state: 'unavailable';
			message: string;
	  };

function isUpstreamRequestFailure(error: unknown): boolean {
	return error instanceof Error && error.message.startsWith('Request to /api/');
}

function parseOverview(value: unknown): DashboardOverview {
	const data = expectObject(value, 'dashboard.overview');
	return {
		totalRequests: expectNumber(data.totalRequests, 'dashboard.overview.totalRequests'),
		cachedRequests: expectNumber(data.cachedRequests, 'dashboard.overview.cachedRequests'),
		cacheHitRate: expectNumber(data.cacheHitRate, 'dashboard.overview.cacheHitRate'),
		totalBytes: expectNumber(data.totalBytes, 'dashboard.overview.totalBytes'),
		estimatedCost: expectNumber(data.estimatedCost, 'dashboard.overview.estimatedCost'),
		activeAnomalies: expectNumber(data.activeAnomalies, 'dashboard.overview.activeAnomalies'),
		workerExecutions: expectNumber(data.workerExecutions, 'dashboard.overview.workerExecutions'),
		threatsBlocked: expectNumber(data.threatsBlocked, 'dashboard.overview.threatsBlocked'),
		periodFrom: expectString(data.periodFrom, 'dashboard.overview.periodFrom'),
		periodTo: expectString(data.periodTo, 'dashboard.overview.periodTo'),
	};
}

function parseTraffic(value: unknown): DashboardReadyData['traffic'] {
	const data = expectObject(value, 'dashboard.traffic');
	const points = expectArray(data.points, 'dashboard.traffic.points').map((point, index) => {
		const row = expectObject(point, `dashboard.traffic.points[${index}]`);
		return {
			datetime: expectString(row.datetime, `dashboard.traffic.points[${index}].datetime`),
			requests: expectNumber(row.requests, `dashboard.traffic.points[${index}].requests`),
			cachedRequests: expectNumber(
				row.cachedRequests,
				`dashboard.traffic.points[${index}].cachedRequests`,
			),
			uncachedRequests: expectNumber(
				row.uncachedRequests,
				`dashboard.traffic.points[${index}].uncachedRequests`,
			),
			bytes: expectNumber(row.bytes, `dashboard.traffic.points[${index}].bytes`),
		};
	});

	return {
		points,
		totalRequests: expectNumber(data.totalRequests, 'dashboard.traffic.totalRequests'),
		totalCachedRequests: expectNumber(
			data.totalCachedRequests,
			'dashboard.traffic.totalCachedRequests',
		),
		totalBytes: expectNumber(data.totalBytes, 'dashboard.traffic.totalBytes'),
		from: expectString(data.from, 'dashboard.traffic.from'),
		to: expectString(data.to, 'dashboard.traffic.to'),
	};
}

function parseBaseline(value: unknown): DashboardReadyData['baseline'] {
	const data = expectObject(value, 'dashboard.baseline');
	const comparisons = expectArray(data.comparisons, 'dashboard.baseline.comparisons').map(
		(item, index) => {
			const row = expectObject(item, `dashboard.baseline.comparisons[${index}]`);
			return {
				metric: expectString(row.metric, `dashboard.baseline.comparisons[${index}].metric`),
				currentValue: expectNumber(
					row.currentValue,
					`dashboard.baseline.comparisons[${index}].currentValue`,
				),
				baselineAvg: expectNumber(
					row.baselineAvg,
					`dashboard.baseline.comparisons[${index}].baselineAvg`,
				),
				baselineStddev: expectNumber(
					row.baselineStddev,
					`dashboard.baseline.comparisons[${index}].baselineStddev`,
				),
				deviationSigma: expectNumber(
					row.deviationSigma,
					`dashboard.baseline.comparisons[${index}].deviationSigma`,
				),
				status: expectString(
					row.status,
					`dashboard.baseline.comparisons[${index}].status`,
				) as DashboardBaselineItem['status'],
			};
		},
	);

	return {
		comparisons,
		from: expectString(data.from, 'dashboard.baseline.from'),
		to: expectString(data.to, 'dashboard.baseline.to'),
	};
}

function parseEndpoints(value: unknown): DashboardReadyData['endpoints'] {
	const data = expectObject(value, 'dashboard.endpoints');
	const rows = expectArray(data.endpoints, 'dashboard.endpoints.endpoints').map((item, index) => {
		const row = expectObject(item, `dashboard.endpoints.endpoints[${index}]`);
		return {
			path: expectString(row.path, `dashboard.endpoints.endpoints[${index}].path`),
			requests: expectNumber(row.requests, `dashboard.endpoints.endpoints[${index}].requests`),
			bytes: expectNumber(row.bytes, `dashboard.endpoints.endpoints[${index}].bytes`),
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

function parseBotActivity(value: unknown): DashboardReadyData['botActivity'] {
	const data = expectObject(value, 'dashboard.botActivity');
	const rows = expectArray(data.bots, 'dashboard.botActivity.bots').map((item, index) => {
		const row = expectObject(item, `dashboard.botActivity.bots[${index}]`);
		return {
			userAgent: expectString(row.browser, `dashboard.botActivity.bots[${index}].browser`),
			requests: expectNumber(row.requests, `dashboard.botActivity.bots[${index}].requests`),
			isBot: expectBoolean(row.isBot, `dashboard.botActivity.bots[${index}].isBot`),
		};
	});
	const totalRequests = rows.reduce((sum, row) => sum + row.requests, 0);
	return {
		items: rows.map((row) => ({
			...row,
			pctOfTotal: totalRequests > 0 ? (row.requests / totalRequests) * 100 : 0,
		})),
		botTrafficPct: expectNumber(data.botTrafficPct, 'dashboard.botActivity.botTrafficPct') * 100,
	};
}

export async function loadDashboardPage(fetchFn: typeof fetch): Promise<DashboardPageData> {
	try {
		const [overview, traffic, baseline, endpoints, botActivity] = await Promise.all([
			fetchJson(fetchFn, '/analytics/overview'),
			fetchJson(fetchFn, '/analytics/traffic'),
			fetchJson(fetchFn, '/analytics/baseline'),
			fetchJson(fetchFn, '/analytics/top-endpoints'),
			fetchJson(fetchFn, '/analytics/bot-activity'),
		]);

		return {
			state: 'ready',
			overview: parseOverview(overview),
			traffic: parseTraffic(traffic),
			baseline: parseBaseline(baseline),
			endpoints: parseEndpoints(endpoints),
			botActivity: parseBotActivity(botActivity),
		};
	} catch (error) {
		if (isUpstreamRequestFailure(error)) {
			return {
				state: 'unavailable',
				message: 'Live dashboard analytics are temporarily unavailable for this account.',
			};
		}

		throw error;
	}
}
