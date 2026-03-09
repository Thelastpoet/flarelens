import { CF_COST_PER_UNIT } from '@flarelens/shared';
import { decryptToken } from '../auth/crypto.js';
import type { Env } from '../env.js';
import type { Repos } from '../middleware/repos.js';
import { CloudflareClient } from './cloudflare/client.js';
import { GqlQueries } from './cloudflare/graphql.js';

// ---------------------------------------------------------------------------
// Bot UA patterns (lowercase match)
// ---------------------------------------------------------------------------

const BOT_UA_PATTERNS = [
	'bot',
	'crawler',
	'spider',
	'scraper',
	'headless',
	'python-requests',
	'curl',
	'wget',
	'go-http-client',
	'java/',
	'cfbot',
	'googlebot',
	'bingbot',
] as const;

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface OverviewData {
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

export interface TrafficPoint {
	datetime: string;
	requests: number;
	cachedRequests: number;
	uncachedRequests: number;
	bytes: number;
}

export interface TrafficData {
	points: TrafficPoint[];
	totalRequests: number;
	totalCachedRequests: number;
	totalBytes: number;
	from: string;
	to: string;
}

export interface CostBreakdown {
	workers: number;
	cdn: number;
	r2: number;
	kv: number;
	d1: number;
	total: number;
	from: string;
	to: string;
}

export interface TopEndpoint {
	path: string;
	requests: number;
	bytes: number;
	cachedRequests: number;
}

export interface GeoTrafficItem {
	country: string;
	requests: number;
	bytes: number;
	threats: number;
}

export interface ClientItem {
	browser: string;
	requests: number;
	bytes: number;
	percentage: number;
}

export interface BaselineComparison {
	metric: string;
	currentValue: number;
	baselineAvg: number;
	baselineStddev: number;
	deviationSigma: number;
	status: 'normal' | 'warning' | 'high' | 'critical';
}

export interface BotActivityItem {
	browser: string;
	requests: number;
	bytes: number;
	isBot: boolean;
}

export interface PerformanceData {
	avgResponseMs: number;
	p95ResponseMs: number;
	errorRate: number;
	threatsBlocked: number;
	workerAvgCpuMs: number;
	workerErrorRate: number;
	from: string;
	to: string;
}

export interface ErrorBreakdown {
	status: number;
	requests: number;
	percentage: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseDateRange(from?: string, to?: string): { from: string; to: string } {
	const toDate = to ? new Date(to) : new Date();
	const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 24 * 3600000);
	return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

function categoriseDeviation(sigma: number): 'normal' | 'warning' | 'high' | 'critical' {
	if (sigma >= 5.0) return 'critical';
	if (sigma >= 3.0) return 'high';
	if (sigma >= 2.0) return 'warning';
	return 'normal';
}

// ---------------------------------------------------------------------------
// AnalyticsService
// ---------------------------------------------------------------------------

export class AnalyticsService {
	private readonly repos: Repos;
	private readonly env: Env;

	constructor(repos: Repos, env: Env) {
		this.repos = repos;
		this.env = env;
	}

	// -------------------------------------------------------------------------
	// Private: resolve CF client + active zone IDs
	// -------------------------------------------------------------------------

	private async getClientAndZones(): Promise<{
		client: CloudflareClient;
		accountId: string;
		zoneIds: string[];
	} | null> {
		try {
			const activeTokens = await this.repos.cfTokens.findActiveByAccount();
			if (activeTokens.length === 0) return null;

			const tokenRow = activeTokens[0];
			const cfAccountId = tokenRow.cf_account_id ?? '';
			if (!cfAccountId) return null;

			const plainToken = await decryptToken(
				tokenRow.encrypted_token,
				this.env.TOKEN_ENCRYPTION_KEY,
			);
			const client = new CloudflareClient(plainToken, cfAccountId);

			const zoneResources = await this.repos.resources.list('zone');
			const zoneIds = zoneResources.map((r) => r.cf_resource_id);

			return { client, accountId: cfAccountId, zoneIds };
		} catch {
			return null;
		}
	}

	// -------------------------------------------------------------------------
	// getOverview
	// -------------------------------------------------------------------------

	async getOverview(from?: string, to?: string): Promise<OverviewData> {
		const range = parseDateRange(from, to);
		const empty: OverviewData = {
			totalRequests: 0,
			cachedRequests: 0,
			cacheHitRate: 0,
			totalBytes: 0,
			estimatedCost: 0,
			activeAnomalies: 0,
			workerExecutions: 0,
			threatsBlocked: 0,
			periodFrom: range.from,
			periodTo: range.to,
		};

		try {
			const [ctx, activeAnomalies] = await Promise.all([
				this.getClientAndZones(),
				this.repos.anomalies.countActive().catch(() => 0),
			]);

			empty.activeAnomalies = activeAnomalies;

			if (!ctx || ctx.zoneIds.length === 0) return empty;

			const { client, accountId, zoneIds } = ctx;

			// Fetch zone traffic for all zones in parallel
			const zoneResults = await Promise.allSettled(
				zoneIds.map((zoneId) => {
					const def = GqlQueries.zoneTraffic(zoneId, range.from, range.to);
					return client.graphql<unknown>(def.query, def.variables).then(def.parseResponse);
				}),
			);

			let totalRequests = 0;
			let cachedRequests = 0;
			let totalBytes = 0;
			let threatsBlocked = 0;

			for (const r of zoneResults) {
				if (r.status !== 'fulfilled') continue;
				for (const b of r.value.buckets) {
					totalRequests += b.requests;
					cachedRequests += b.cachedRequests;
					totalBytes += b.bytes;
					threatsBlocked += b.threats;
				}
			}

			// Worker metrics
			const workerDef = GqlQueries.workerMetrics(accountId, range.from, range.to);
			let workerExecutions = 0;
			try {
				const workerBuckets = await client
					.graphql<unknown>(workerDef.query, workerDef.variables)
					.then(workerDef.parseResponse);
				for (const b of workerBuckets) workerExecutions += b.requests;
			} catch {
				// graceful degradation
			}

			// Estimated cost (CDN bandwidth only for overview)
			const cdnCost = (totalBytes / 1_073_741_824) * 0.0075;
			const workerCost =
				(workerExecutions / 1_000_000) * CF_COST_PER_UNIT.worker_requests_per_million;
			const estimatedCost = cdnCost + workerCost;

			const cacheHitRate = totalRequests > 0 ? cachedRequests / totalRequests : 0;

			return {
				totalRequests,
				cachedRequests,
				cacheHitRate,
				totalBytes,
				estimatedCost,
				activeAnomalies,
				workerExecutions,
				threatsBlocked,
				periodFrom: range.from,
				periodTo: range.to,
			};
		} catch {
			return empty;
		}
	}

	// -------------------------------------------------------------------------
	// getTraffic
	// -------------------------------------------------------------------------

	async getTraffic(zoneId?: string, from?: string, to?: string): Promise<TrafficData> {
		const range = parseDateRange(from, to);
		const empty: TrafficData = {
			points: [],
			totalRequests: 0,
			totalCachedRequests: 0,
			totalBytes: 0,
			from: range.from,
			to: range.to,
		};

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx) return empty;

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			if (targetZones.length === 0) return empty;

			const { client } = ctx;

			// Aggregate across selected zones
			const bucketMap: Record<string, TrafficPoint> = {};

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.zoneTraffic(zid, range.from, range.to);
					const result = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const b of result.buckets) {
						if (!bucketMap[b.datetime]) {
							bucketMap[b.datetime] = {
								datetime: b.datetime,
								requests: 0,
								cachedRequests: 0,
								uncachedRequests: 0,
								bytes: 0,
							};
						}
						bucketMap[b.datetime].requests += b.requests;
						bucketMap[b.datetime].cachedRequests += b.cachedRequests;
						bucketMap[b.datetime].uncachedRequests += b.uncachedRequests;
						bucketMap[b.datetime].bytes += b.bytes;
					}
				}),
			);

			const points = Object.values(bucketMap).sort(
				(a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime(),
			);

			let totalRequests = 0;
			let totalCachedRequests = 0;
			let totalBytes = 0;
			for (const p of points) {
				totalRequests += p.requests;
				totalCachedRequests += p.cachedRequests;
				totalBytes += p.bytes;
			}

			return {
				points,
				totalRequests,
				totalCachedRequests,
				totalBytes,
				from: range.from,
				to: range.to,
			};
		} catch {
			return empty;
		}
	}

	// -------------------------------------------------------------------------
	// getCost
	// -------------------------------------------------------------------------

	async getCost(from?: string, to?: string): Promise<CostBreakdown> {
		const range = parseDateRange(from, to);
		const empty: CostBreakdown = {
			workers: 0,
			cdn: 0,
			r2: 0,
			kv: 0,
			d1: 0,
			total: 0,
			from: range.from,
			to: range.to,
		};

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx) return empty;

			const { client, accountId, zoneIds } = ctx;

			// Fetch all metrics in parallel
			const [zoneResults, workerResult, r2Result, kvResult, d1Result] = await Promise.allSettled([
				Promise.allSettled(
					zoneIds.map((zid) => {
						const def = GqlQueries.zoneTraffic(zid, range.from, range.to);
						return client.graphql<unknown>(def.query, def.variables).then(def.parseResponse);
					}),
				),
				(async () => {
					const def = GqlQueries.workerMetrics(accountId, range.from, range.to);
					return client.graphql<unknown>(def.query, def.variables).then(def.parseResponse);
				})(),
				(async () => {
					const def = GqlQueries.r2Metrics(accountId, range.from, range.to);
					return client.graphql<unknown>(def.query, def.variables).then(def.parseResponse);
				})(),
				(async () => {
					const def = GqlQueries.kvMetrics(accountId, range.from, range.to);
					return client.graphql<unknown>(def.query, def.variables).then(def.parseResponse);
				})(),
				(async () => {
					const def = GqlQueries.d1Metrics(accountId, range.from, range.to);
					return client.graphql<unknown>(def.query, def.variables).then(def.parseResponse);
				})(),
			]);

			// CDN cost
			let totalBytes = 0;
			if (zoneResults.status === 'fulfilled') {
				for (const zr of zoneResults.value) {
					if (zr.status !== 'fulfilled') continue;
					for (const b of zr.value.buckets) totalBytes += b.bytes;
				}
			}
			const cdn = (totalBytes / 1_073_741_824) * 0.0075;

			// Worker cost
			let workerRequests = 0;
			let workerCpuMs = 0;
			if (workerResult.status === 'fulfilled') {
				for (const b of workerResult.value) {
					workerRequests += b.requests;
					workerCpuMs += b.cpuTimeP50 * b.requests; // approx total CPU ms
				}
			}
			const workers =
				(workerRequests / 1_000_000) * CF_COST_PER_UNIT.worker_requests_per_million +
				(workerCpuMs / 1_000_000) * CF_COST_PER_UNIT.worker_cpu_ms_per_million;

			// R2 cost
			let r2ClassA = 0;
			let r2ClassB = 0;
			if (r2Result.status === 'fulfilled') {
				for (const b of r2Result.value) {
					r2ClassA += b.classAOperations;
					r2ClassB += b.classBOperations;
				}
			}
			const r2 =
				(r2ClassA / 1_000_000) * CF_COST_PER_UNIT.r2_class_a_per_million +
				(r2ClassB / 1_000_000) * CF_COST_PER_UNIT.r2_class_b_per_million;

			// KV cost
			let kvReads = 0;
			let kvWrites = 0;
			if (kvResult.status === 'fulfilled') {
				for (const b of kvResult.value) {
					kvReads += b.readOperations;
					kvWrites += b.writeOperations;
				}
			}
			const kv =
				(kvReads / 1_000_000) * CF_COST_PER_UNIT.kv_reads_per_million +
				(kvWrites / 1_000_000) * CF_COST_PER_UNIT.kv_writes_per_million;

			// D1 cost
			let d1Reads = 0;
			let d1Writes = 0;
			if (d1Result.status === 'fulfilled') {
				for (const b of d1Result.value) {
					d1Reads += b.rowsRead;
					d1Writes += b.rowsWritten;
				}
			}
			const d1 =
				(d1Reads / 1_000_000) * CF_COST_PER_UNIT.d1_reads_per_million +
				(d1Writes / 1_000_000) * CF_COST_PER_UNIT.d1_writes_per_million;

			const total = workers + cdn + r2 + kv + d1;

			return { workers, cdn, r2, kv, d1, total, from: range.from, to: range.to };
		} catch {
			return empty;
		}
	}

	// -------------------------------------------------------------------------
	// getTopEndpoints
	// -------------------------------------------------------------------------

	async getTopEndpoints(
		zoneId?: string,
		from?: string,
		to?: string,
		limit = 10,
	): Promise<{ endpoints: TopEndpoint[]; from: string; to: string }> {
		const range = parseDateRange(from, to);

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx || ctx.zoneIds.length === 0)
				return { endpoints: [], from: range.from, to: range.to };

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			const { client } = ctx;

			const aggregated: Record<string, TopEndpoint> = {};

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.topEndpoints(zid, range.from, range.to, limit * 2);
					const rows = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const row of rows) {
						if (!aggregated[row.path]) {
							aggregated[row.path] = { path: row.path, requests: 0, bytes: 0, cachedRequests: 0 };
						}
						aggregated[row.path].requests += row.requests;
						aggregated[row.path].bytes += row.bytes;
						aggregated[row.path].cachedRequests += row.cachedRequests;
					}
				}),
			);

			const endpoints = Object.values(aggregated)
				.sort((a, b) => b.requests - a.requests)
				.slice(0, limit);

			return { endpoints, from: range.from, to: range.to };
		} catch {
			return { endpoints: [], from: range.from, to: range.to };
		}
	}

	// -------------------------------------------------------------------------
	// getGeo
	// -------------------------------------------------------------------------

	async getGeo(
		zoneId?: string,
		from?: string,
		to?: string,
	): Promise<{ countries: GeoTrafficItem[]; from: string; to: string }> {
		const range = parseDateRange(from, to);

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx || ctx.zoneIds.length === 0)
				return { countries: [], from: range.from, to: range.to };

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			const { client } = ctx;

			const aggregated: Record<string, GeoTrafficItem> = {};

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.zoneTraffic(zid, range.from, range.to);
					const result = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const c of result.countryMap) {
						if (!aggregated[c.country]) {
							aggregated[c.country] = { country: c.country, requests: 0, bytes: 0, threats: 0 };
						}
						aggregated[c.country].requests += c.requests;
						aggregated[c.country].bytes += c.bytes;
						aggregated[c.country].threats += c.threats;
					}
				}),
			);

			const countries = Object.values(aggregated).sort((a, b) => b.requests - a.requests);

			return { countries, from: range.from, to: range.to };
		} catch {
			return { countries: [], from: range.from, to: range.to };
		}
	}

	// -------------------------------------------------------------------------
	// getClients
	// -------------------------------------------------------------------------

	async getClients(
		zoneId?: string,
		from?: string,
		to?: string,
	): Promise<{ clients: ClientItem[]; from: string; to: string }> {
		const range = parseDateRange(from, to);

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx || ctx.zoneIds.length === 0) return { clients: [], from: range.from, to: range.to };

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			const { client } = ctx;

			const aggregated: Record<string, { requests: number; bytes: number }> = {};

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.clientDistribution(zid, range.from, range.to);
					const rows = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const row of rows) {
						if (!aggregated[row.browser]) aggregated[row.browser] = { requests: 0, bytes: 0 };
						aggregated[row.browser].requests += row.requests;
						aggregated[row.browser].bytes += row.bytes;
					}
				}),
			);

			const total = Object.values(aggregated).reduce((s, v) => s + v.requests, 0);
			const clients: ClientItem[] = Object.entries(aggregated)
				.map(([browser, v]) => ({
					browser,
					requests: v.requests,
					bytes: v.bytes,
					percentage: total > 0 ? v.requests / total : 0,
				}))
				.sort((a, b) => b.requests - a.requests);

			return { clients, from: range.from, to: range.to };
		} catch {
			return { clients: [], from: range.from, to: range.to };
		}
	}

	// -------------------------------------------------------------------------
	// getBaseline
	// -------------------------------------------------------------------------

	async getBaseline(
		from?: string,
		to?: string,
	): Promise<{ comparisons: BaselineComparison[]; from: string; to: string }> {
		const range = parseDateRange(from, to);

		try {
			const now = new Date(range.to);
			const hourOfDay = now.getUTCHours();
			const dayOfWeek = now.getUTCDay();

			const metrics: Array<{ name: string; current: number }> = [];

			// Fetch current traffic for comparison
			const ctx = await this.getClientAndZones();
			if (ctx && ctx.zoneIds.length > 0) {
				const { client, accountId, zoneIds } = ctx;

				let totalRequests = 0;
				let totalBytes = 0;
				let totalThreats = 0;
				let workerRequests = 0;

				await Promise.allSettled(
					zoneIds.map(async (zid) => {
						const def = GqlQueries.zoneTraffic(zid, range.from, range.to);
						const result = await client
							.graphql<unknown>(def.query, def.variables)
							.then(def.parseResponse);
						for (const b of result.buckets) {
							totalRequests += b.requests;
							totalBytes += b.bytes;
							totalThreats += b.threats;
						}
					}),
				);

				try {
					const def = GqlQueries.workerMetrics(accountId, range.from, range.to);
					const workerBuckets = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const b of workerBuckets) workerRequests += b.requests;
				} catch {
					// graceful
				}

				metrics.push(
					{ name: 'requests', current: totalRequests },
					{ name: 'bytes', current: totalBytes },
					{ name: 'threats', current: totalThreats },
					{ name: 'cpu_time', current: workerRequests },
				);
			}

			const comparisons: BaselineComparison[] = await Promise.all(
				metrics.map(async ({ name, current }) => {
					const baseline = await this.repos.baselines
						.findByResourceMetric('account', name, hourOfDay, dayOfWeek)
						.catch(() => null);

					if (!baseline) {
						return {
							metric: name,
							currentValue: current,
							baselineAvg: 0,
							baselineStddev: 0,
							deviationSigma: 0,
							status: 'normal' as const,
						};
					}

					const sigma =
						baseline.stddev_value > 0
							? Math.abs(current - baseline.avg_value) / baseline.stddev_value
							: 0;

					return {
						metric: name,
						currentValue: current,
						baselineAvg: baseline.avg_value,
						baselineStddev: baseline.stddev_value,
						deviationSigma: sigma,
						status: categoriseDeviation(sigma),
					};
				}),
			);

			return { comparisons, from: range.from, to: range.to };
		} catch {
			return { comparisons: [], from: range.from, to: range.to };
		}
	}

	// -------------------------------------------------------------------------
	// getBotActivity
	// -------------------------------------------------------------------------

	async getBotActivity(
		zoneId?: string,
		from?: string,
		to?: string,
	): Promise<{ bots: BotActivityItem[]; botTrafficPct: number; from: string; to: string }> {
		const range = parseDateRange(from, to);

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx || ctx.zoneIds.length === 0) {
				return { bots: [], botTrafficPct: 0, from: range.from, to: range.to };
			}

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			const { client } = ctx;

			const aggregated: Record<string, { requests: number; bytes: number }> = {};

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.clientDistribution(zid, range.from, range.to, 50);
					const rows = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const row of rows) {
						if (!aggregated[row.browser]) aggregated[row.browser] = { requests: 0, bytes: 0 };
						aggregated[row.browser].requests += row.requests;
						aggregated[row.browser].bytes += row.bytes;
					}
				}),
			);

			const bots: BotActivityItem[] = Object.entries(aggregated)
				.map(([browser, v]) => {
					const lower = browser.toLowerCase();
					const isBot = BOT_UA_PATTERNS.some((pattern) => lower.includes(pattern));
					return { browser, requests: v.requests, bytes: v.bytes, isBot };
				})
				.sort((a, b) => b.requests - a.requests);

			const totalRequests = bots.reduce((s, b) => s + b.requests, 0);
			const botRequests = bots.filter((b) => b.isBot).reduce((s, b) => s + b.requests, 0);
			const botTrafficPct = totalRequests > 0 ? botRequests / totalRequests : 0;

			return { bots, botTrafficPct, from: range.from, to: range.to };
		} catch {
			return { bots: [], botTrafficPct: 0, from: range.from, to: range.to };
		}
	}

	// -------------------------------------------------------------------------
	// getPerformance
	// -------------------------------------------------------------------------

	async getPerformance(zoneId?: string, from?: string, to?: string): Promise<PerformanceData> {
		const range = parseDateRange(from, to);
		const empty: PerformanceData = {
			avgResponseMs: 0,
			p95ResponseMs: 0,
			errorRate: 0,
			threatsBlocked: 0,
			workerAvgCpuMs: 0,
			workerErrorRate: 0,
			from: range.from,
			to: range.to,
		};

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx || ctx.zoneIds.length === 0) return empty;

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			const { client, accountId } = ctx;

			let totalRequests = 0;
			let totalErrors = 0;
			let totalThreats = 0;

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.zoneTraffic(zid, range.from, range.to);
					const result = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const b of result.buckets) {
						totalRequests += b.requests;
						totalThreats += b.threats;
					}
					for (const e of result.errorStatusMap) {
						totalErrors += e.requests;
					}
				}),
			);

			// Worker CPU metrics
			let workerAvgCpuMs = 0;
			let workerErrors = 0;
			let workerRequests = 0;
			try {
				const def = GqlQueries.workerMetrics(accountId, range.from, range.to);
				const workerBuckets = await client
					.graphql<unknown>(def.query, def.variables)
					.then(def.parseResponse);
				let cpuSum = 0;
				for (const b of workerBuckets) {
					workerRequests += b.requests;
					workerErrors += b.errors;
					cpuSum += b.cpuTimeP50 * b.requests;
				}
				workerAvgCpuMs = workerRequests > 0 ? cpuSum / workerRequests : 0;
			} catch {
				// graceful
			}

			const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;
			const workerErrorRate = workerRequests > 0 ? workerErrors / workerRequests : 0;

			// CF GraphQL does not expose raw latency percentiles in httpRequests1hGroups;
			// we approximate using a fixed value of 0 since it requires edge latency datasets
			// not available in the standard analytics API.
			return {
				avgResponseMs: 0,
				p95ResponseMs: 0,
				errorRate,
				threatsBlocked: totalThreats,
				workerAvgCpuMs,
				workerErrorRate,
				from: range.from,
				to: range.to,
			};
		} catch {
			return empty;
		}
	}

	// -------------------------------------------------------------------------
	// getErrors
	// -------------------------------------------------------------------------

	async getErrors(
		zoneId?: string,
		from?: string,
		to?: string,
	): Promise<{ errors: ErrorBreakdown[]; totalErrors: number; from: string; to: string }> {
		const range = parseDateRange(from, to);

		try {
			const ctx = await this.getClientAndZones();
			if (!ctx || ctx.zoneIds.length === 0)
				return { errors: [], totalErrors: 0, from: range.from, to: range.to };

			const targetZones = zoneId ? [zoneId] : ctx.zoneIds;
			const { client } = ctx;

			const statusAgg: Record<number, number> = {};

			await Promise.allSettled(
				targetZones.map(async (zid) => {
					const def = GqlQueries.zoneTraffic(zid, range.from, range.to);
					const result = await client
						.graphql<unknown>(def.query, def.variables)
						.then(def.parseResponse);
					for (const e of result.errorStatusMap) {
						statusAgg[e.status] = (statusAgg[e.status] ?? 0) + e.requests;
					}
				}),
			);

			const totalErrors = Object.values(statusAgg).reduce((s, v) => s + v, 0);
			const errors: ErrorBreakdown[] = Object.entries(statusAgg)
				.map(([status, requests]) => ({
					status: Number(status),
					requests,
					percentage: totalErrors > 0 ? requests / totalErrors : 0,
				}))
				.sort((a, b) => b.requests - a.requests);

			return { errors, totalErrors, from: range.from, to: range.to };
		} catch {
			return { errors: [], totalErrors: 0, from: range.from, to: range.to };
		}
	}
}
