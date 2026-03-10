// Typed GraphQL query builders for Cloudflare Analytics API

// ---------------------------------------------------------------------------
// Return type interfaces
// ---------------------------------------------------------------------------

export interface ZoneTrafficBucket {
	datetime: string;
	requests: number;
	cachedRequests: number;
	uncachedRequests: number;
	bytes: number;
	cachedBytes: number;
	threats: number;
	pageViews: number;
}

export interface ZoneCountryData {
	country: string;
	requests: number;
	bytes: number;
	threats: number;
}

export interface ErrorStatusData {
	status: number;
	requests: number;
}

export interface ZoneTrafficResult {
	buckets: ZoneTrafficBucket[];
	countryMap: ZoneCountryData[];
	errorStatusMap: ErrorStatusData[];
}

export interface EndpointData {
	path: string;
	requests: number;
	bytes: number;
	cachedRequests: number;
}

export interface ClientData {
	browser: string;
	requests: number;
	bytes: number;
}

export interface WorkerMetricsBucket {
	datetime: string;
	scriptName: string;
	requests: number;
	errors: number;
	cpuTimeP50: number;
	cpuTimeP99: number;
}

export interface R2MetricsBucket {
	datetime: string;
	bucketName: string;
	classAOperations: number;
	classBOperations: number;
	uploadedBytes: number;
	downloadedBytes: number;
}

export interface KvMetricsBucket {
	datetime: string;
	namespaceId: string;
	readOperations: number;
	writeOperations: number;
	deleteOperations: number;
	listOperations: number;
}

export interface D1MetricsBucket {
	datetime: string;
	databaseId: string;
	readQueries: number;
	writeQueries: number;
	rowsRead: number;
	rowsWritten: number;
}

// ---------------------------------------------------------------------------
// Raw GraphQL response shapes (internal)
// ---------------------------------------------------------------------------

interface RawZoneTrafficResponse {
	viewer: {
		zones: Array<{
			httpRequests1hGroups?: Array<{
				dimensions: { datetime: string };
				sum: {
					requests: number;
					cachedRequests: number;
					bytes: number;
					cachedBytes: number;
					threats: number;
					pageViews: number;
					countryMap: Array<{
						clientCountryName: string;
						requests: number;
						bytes: number;
						threats: number;
					}>;
					responseStatusMap: Array<{ edgeResponseStatus: number; requests: number }>;
				};
			}>;
			httpRequests1mGroups?: Array<{
				dimensions: { datetime: string };
				sum: {
					requests: number;
					cachedRequests: number;
					bytes: number;
					cachedBytes: number;
					threats: number;
					pageViews: number;
					countryMap: Array<{
						clientCountryName: string;
						requests: number;
						bytes: number;
						threats: number;
					}>;
					responseStatusMap: Array<{ edgeResponseStatus: number; requests: number }>;
				};
			}>;
		}>;
	};
}

interface RawTopEndpointsResponse {
	viewer: {
		zones: Array<{
			httpRequestsAdaptiveGroups: Array<{
				dimensions: { clientRequestPath: string };
				sum: { edgeResponseBytes: number; requests: number };
				count: number;
			}>;
		}>;
	};
}

interface RawClientDistributionResponse {
	viewer: {
		zones: Array<{
			httpRequestsAdaptiveGroups: Array<{
				dimensions: { userAgentBrowser: string };
				sum: { edgeResponseBytes: number; requests: number };
			}>;
		}>;
	};
}

interface RawWorkerMetricsResponse {
	viewer: {
		accounts: Array<{
			workersInvocationsAdaptive: Array<{
				dimensions: { datetime: string; scriptName: string };
				sum: { requests: number; errors: number };
				quantiles: { cpuTimeP50: number; cpuTimeP99: number };
			}>;
		}>;
	};
}

interface RawR2MetricsResponse {
	viewer: {
		accounts: Array<{
			r2OperationsAdaptiveGroups: Array<{
				dimensions: { datetime: string; bucketName: string };
				sum: {
					classAOperations: number;
					classBOperations: number;
					uploadedBytes: number;
					downloadedBytes: number;
				};
			}>;
		}>;
	};
}

interface RawKvMetricsResponse {
	viewer: {
		accounts: Array<{
			kvOperationsAdaptiveGroups: Array<{
				dimensions: { datetime: string; namespaceId: string };
				sum: {
					readOperations: number;
					writeOperations: number;
					deleteOperations: number;
					listOperations: number;
				};
			}>;
		}>;
	};
}

interface RawD1MetricsResponse {
	viewer: {
		accounts: Array<{
			d1AnalyticsAdaptiveGroups: Array<{
				dimensions: { datetime: string; databaseId: string };
				sum: { readQueries: number; writeQueries: number; rowsRead: number; rowsWritten: number };
			}>;
		}>;
	};
}

// ---------------------------------------------------------------------------
// Query builder return type
// ---------------------------------------------------------------------------

export interface GqlQueryDef<T> {
	query: string;
	variables: Record<string, unknown>;
	parseResponse: (raw: unknown) => T;
}

// ---------------------------------------------------------------------------
// 1. Zone traffic (httpRequests1hGroups)
// ---------------------------------------------------------------------------

function zoneTraffic(
	zoneTag: string,
	from: string,
	to: string,
	limit = 168,
): GqlQueryDef<ZoneTrafficResult> {
	const query = `
    query ZoneTraffic($zoneTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1hGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [datetime_ASC]
          ) {
            dimensions { datetime }
            sum {
              requests
              cachedRequests
              bytes
              cachedBytes
              threats
              pageViews
              countryMap {
                clientCountryName
                requests
                bytes
                threats
              }
              responseStatusMap {
                edgeResponseStatus
                requests
              }
            }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): ZoneTrafficResult => {
		const data = raw as RawZoneTrafficResponse;
		const groups = data?.viewer?.zones?.[0]?.httpRequests1hGroups ?? [];

		const buckets: ZoneTrafficBucket[] = groups.map((g) => ({
			datetime: g.dimensions.datetime,
			requests: g.sum.requests ?? 0,
			cachedRequests: g.sum.cachedRequests ?? 0,
			uncachedRequests: (g.sum.requests ?? 0) - (g.sum.cachedRequests ?? 0),
			bytes: g.sum.bytes ?? 0,
			cachedBytes: g.sum.cachedBytes ?? 0,
			threats: g.sum.threats ?? 0,
			pageViews: g.sum.pageViews ?? 0,
		}));

		// Aggregate country data across all buckets
		const countryAgg: Record<string, ZoneCountryData> = {};
		for (const g of groups) {
			for (const c of g.sum.countryMap ?? []) {
				const key = c.clientCountryName;
				if (!countryAgg[key]) {
					countryAgg[key] = { country: key, requests: 0, bytes: 0, threats: 0 };
				}
				countryAgg[key].requests += c.requests ?? 0;
				countryAgg[key].bytes += c.bytes ?? 0;
				countryAgg[key].threats += c.threats ?? 0;
			}
		}
		const countryMap = Object.values(countryAgg).sort((a, b) => b.requests - a.requests);

		// Aggregate error status data
		const statusAgg: Record<number, ErrorStatusData> = {};
		for (const g of groups) {
			for (const s of g.sum.responseStatusMap ?? []) {
				const code = s.edgeResponseStatus;
				if (code >= 400) {
					if (!statusAgg[code]) statusAgg[code] = { status: code, requests: 0 };
					statusAgg[code].requests += s.requests ?? 0;
				}
			}
		}
		const errorStatusMap = Object.values(statusAgg).sort((a, b) => b.requests - a.requests);

		return { buckets, countryMap, errorStatusMap };
	};

	return { query, variables: { zoneTag, from, to, limit }, parseResponse };
}

function zoneTrafficRecent(
	zoneTag: string,
	from: string,
	to: string,
	limit = 5,
): GqlQueryDef<ZoneTrafficResult> {
	const query = `
    query ZoneTrafficRecent($zoneTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequests1mGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [datetime_ASC]
          ) {
            dimensions { datetime }
            sum {
              requests
              cachedRequests
              bytes
              cachedBytes
              threats
              pageViews
              countryMap {
                clientCountryName
                requests
                bytes
                threats
              }
              responseStatusMap {
                edgeResponseStatus
                requests
              }
            }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): ZoneTrafficResult => {
		const data = raw as RawZoneTrafficResponse;
		const groups = data?.viewer?.zones?.[0]?.httpRequests1mGroups ?? [];

		const buckets: ZoneTrafficBucket[] = groups.map((g) => ({
			datetime: g.dimensions.datetime,
			requests: g.sum.requests ?? 0,
			cachedRequests: g.sum.cachedRequests ?? 0,
			uncachedRequests: (g.sum.requests ?? 0) - (g.sum.cachedRequests ?? 0),
			bytes: g.sum.bytes ?? 0,
			cachedBytes: g.sum.cachedBytes ?? 0,
			threats: g.sum.threats ?? 0,
			pageViews: g.sum.pageViews ?? 0,
		}));

		const countryAgg: Record<string, ZoneCountryData> = {};
		for (const g of groups) {
			for (const c of g.sum.countryMap ?? []) {
				const key = c.clientCountryName;
				if (!countryAgg[key]) {
					countryAgg[key] = { country: key, requests: 0, bytes: 0, threats: 0 };
				}
				countryAgg[key].requests += c.requests ?? 0;
				countryAgg[key].bytes += c.bytes ?? 0;
				countryAgg[key].threats += c.threats ?? 0;
			}
		}
		const countryMap = Object.values(countryAgg).sort((a, b) => b.requests - a.requests);

		const statusAgg: Record<number, ErrorStatusData> = {};
		for (const g of groups) {
			for (const s of g.sum.responseStatusMap ?? []) {
				const code = s.edgeResponseStatus;
				if (code >= 400) {
					if (!statusAgg[code]) statusAgg[code] = { status: code, requests: 0 };
					statusAgg[code].requests += s.requests ?? 0;
				}
			}
		}
		const errorStatusMap = Object.values(statusAgg).sort((a, b) => b.requests - a.requests);

		return { buckets, countryMap, errorStatusMap };
	};

	return { query, variables: { zoneTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// 2. Top endpoints (httpRequestsAdaptiveGroups grouped by clientRequestPath)
// ---------------------------------------------------------------------------

function topEndpoints(
	zoneTag: string,
	from: string,
	to: string,
	limit = 20,
): GqlQueryDef<EndpointData[]> {
	const query = `
    query TopEndpoints($zoneTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [sum_requests_DESC]
          ) {
            dimensions { clientRequestPath }
            sum { edgeResponseBytes requests }
            count
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): EndpointData[] => {
		const data = raw as RawTopEndpointsResponse;
		const groups = data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
		return groups.map((g) => ({
			path: g.dimensions.clientRequestPath ?? '/',
			requests: g.sum.requests ?? 0,
			bytes: g.sum.edgeResponseBytes ?? 0,
			cachedRequests: 0, // not available in adaptive groups without extra dimension
		}));
	};

	return { query, variables: { zoneTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// 3. Client distribution (httpRequestsAdaptiveGroups grouped by userAgentBrowser)
// ---------------------------------------------------------------------------

function clientDistribution(
	zoneTag: string,
	from: string,
	to: string,
	limit = 20,
): GqlQueryDef<ClientData[]> {
	const query = `
    query ClientDistribution($zoneTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [sum_requests_DESC]
          ) {
            dimensions { userAgentBrowser }
            sum { edgeResponseBytes requests }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): ClientData[] => {
		const data = raw as RawClientDistributionResponse;
		const groups = data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
		return groups.map((g) => ({
			browser: g.dimensions.userAgentBrowser ?? 'Unknown',
			requests: g.sum.requests ?? 0,
			bytes: g.sum.edgeResponseBytes ?? 0,
		}));
	};

	return { query, variables: { zoneTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// 4. Worker metrics (workersInvocationsAdaptive)
// ---------------------------------------------------------------------------

function workerMetrics(
	accountTag: string,
	from: string,
	to: string,
	limit = 1000,
): GqlQueryDef<WorkerMetricsBucket[]> {
	const query = `
    query WorkerMetrics($accountTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          workersInvocationsAdaptive(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [datetime_ASC]
          ) {
            dimensions { datetime scriptName }
            sum { requests errors }
            quantiles { cpuTimeP50 cpuTimeP99 }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): WorkerMetricsBucket[] => {
		const data = raw as RawWorkerMetricsResponse;
		const rows = data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
		return rows.map((r) => ({
			datetime: r.dimensions.datetime,
			scriptName: r.dimensions.scriptName ?? '',
			requests: r.sum.requests ?? 0,
			errors: r.sum.errors ?? 0,
			cpuTimeP50: r.quantiles.cpuTimeP50 ?? 0,
			cpuTimeP99: r.quantiles.cpuTimeP99 ?? 0,
		}));
	};

	return { query, variables: { accountTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// 5. R2 metrics (r2OperationsAdaptiveGroups)
// ---------------------------------------------------------------------------

function r2Metrics(
	accountTag: string,
	from: string,
	to: string,
	limit = 1000,
): GqlQueryDef<R2MetricsBucket[]> {
	const query = `
    query R2Metrics($accountTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          r2OperationsAdaptiveGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [datetime_ASC]
          ) {
            dimensions { datetime bucketName }
            sum { classAOperations classBOperations uploadedBytes downloadedBytes }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): R2MetricsBucket[] => {
		const data = raw as RawR2MetricsResponse;
		const rows = data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups ?? [];
		return rows.map((r) => ({
			datetime: r.dimensions.datetime,
			bucketName: r.dimensions.bucketName ?? '',
			classAOperations: r.sum.classAOperations ?? 0,
			classBOperations: r.sum.classBOperations ?? 0,
			uploadedBytes: r.sum.uploadedBytes ?? 0,
			downloadedBytes: r.sum.downloadedBytes ?? 0,
		}));
	};

	return { query, variables: { accountTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// 6. KV metrics (kvOperationsAdaptiveGroups)
// ---------------------------------------------------------------------------

function kvMetrics(
	accountTag: string,
	from: string,
	to: string,
	limit = 1000,
): GqlQueryDef<KvMetricsBucket[]> {
	const query = `
    query KvMetrics($accountTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          kvOperationsAdaptiveGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [datetime_ASC]
          ) {
            dimensions { datetime namespaceId }
            sum { readOperations writeOperations deleteOperations listOperations }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): KvMetricsBucket[] => {
		const data = raw as RawKvMetricsResponse;
		const rows = data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups ?? [];
		return rows.map((r) => ({
			datetime: r.dimensions.datetime,
			namespaceId: r.dimensions.namespaceId ?? '',
			readOperations: r.sum.readOperations ?? 0,
			writeOperations: r.sum.writeOperations ?? 0,
			deleteOperations: r.sum.deleteOperations ?? 0,
			listOperations: r.sum.listOperations ?? 0,
		}));
	};

	return { query, variables: { accountTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// 7. D1 metrics (d1AnalyticsAdaptiveGroups)
// ---------------------------------------------------------------------------

function d1Metrics(
	accountTag: string,
	from: string,
	to: string,
	limit = 1000,
): GqlQueryDef<D1MetricsBucket[]> {
	const query = `
    query D1Metrics($accountTag: string!, $from: string!, $to: string!, $limit: int!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          d1AnalyticsAdaptiveGroups(
            limit: $limit,
            filter: { datetime_geq: $from, datetime_leq: $to },
            orderBy: [datetime_ASC]
          ) {
            dimensions { datetime databaseId }
            sum { readQueries writeQueries rowsRead rowsWritten }
          }
        }
      }
    }
  `;

	const parseResponse = (raw: unknown): D1MetricsBucket[] => {
		const data = raw as RawD1MetricsResponse;
		const rows = data?.viewer?.accounts?.[0]?.d1AnalyticsAdaptiveGroups ?? [];
		return rows.map((r) => ({
			datetime: r.dimensions.datetime,
			databaseId: r.dimensions.databaseId ?? '',
			readQueries: r.sum.readQueries ?? 0,
			writeQueries: r.sum.writeQueries ?? 0,
			rowsRead: r.sum.rowsRead ?? 0,
			rowsWritten: r.sum.rowsWritten ?? 0,
		}));
	};

	return { query, variables: { accountTag, from, to, limit }, parseResponse };
}

// ---------------------------------------------------------------------------
// Exported namespace
// ---------------------------------------------------------------------------

export const GqlQueries = {
	zoneTraffic,
	zoneTrafficRecent,
	topEndpoints,
	clientDistribution,
	workerMetrics,
	r2Metrics,
	kvMetrics,
	d1Metrics,
} as const;
