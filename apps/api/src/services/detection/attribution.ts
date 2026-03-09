import { CloudflareClient } from '../cloudflare/client.js';

export interface AttributionContributor {
	type: 'endpoint' | 'user_agent' | 'country' | 'asn';
	value: string;
	requests: number;
	contributionPct: number;
	baselineRequests?: number;
	changeFromBaseline?: number; // percentage change vs baseline period
}

export interface AttributionResult {
	contributors: AttributionContributor[];
	analysisWindow: { from: string; to: string };
}

interface GraphQLGroup {
	count: number;
	dimensions: Record<string, string>;
}

interface GraphQLData {
	viewer: {
		zones: Array<{
			httpRequestsAdaptiveGroups: GraphQLGroup[];
		}>;
	};
}

async function queryDimension(
	client: CloudflareClient,
	zoneId: string,
	from: Date,
	to: Date,
	groupByField: string,
): Promise<GraphQLGroup[]> {
	const query = `
    query($zoneTag: String!, $from: String!, $to: String!) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          httpRequestsAdaptiveGroups(
            filter: { datetime_geq: $from, datetime_leq: $to }
            limit: 10
            orderBy: [count_DESC]
          ) {
            count
            dimensions {
              ${groupByField}
            }
          }
        }
      }
    }
  `;

	const data = await client.graphql<GraphQLData>(query, {
		zoneTag: zoneId,
		from: from.toISOString(),
		to: to.toISOString(),
	});

	return data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
}

function buildContributors(
	groups: GraphQLGroup[],
	type: AttributionContributor['type'],
	dimensionKey: string,
	totalRequests: number,
	baselineByValue?: Map<string, number>,
): AttributionContributor[] {
	return groups.slice(0, 5).map((group) => {
		const value = group.dimensions[dimensionKey] ?? '(unknown)';
		const requests = group.count;
		const contributionPct = totalRequests > 0 ? (requests / totalRequests) * 100 : 0;
		const baselineRequests = baselineByValue?.get(value);
		const changeFromBaseline =
			baselineRequests != null && baselineRequests > 0
				? ((requests - baselineRequests) / baselineRequests) * 100
				: undefined;

		return { type, value, requests, contributionPct, baselineRequests, changeFromBaseline };
	});
}

function groupsToMap(groups: GraphQLGroup[], dimensionKey: string): Map<string, number> {
	return new Map(groups.map((g) => [g.dimensions[dimensionKey] ?? '(unknown)', g.count]));
}

export async function analyzeAttribution(
	client: CloudflareClient,
	zoneId: string,
	from: Date,
	to: Date,
	totalRequests: number,
): Promise<AttributionResult> {
	// Baseline window: same duration 7 days prior
	const durationMs = to.getTime() - from.getTime();
	const baselineTo = new Date(from.getTime());
	const baselineFrom = new Date(from.getTime() - durationMs - 7 * 24 * 60 * 60 * 1000);

	const [
		endpointResult,
		userAgentResult,
		countryResult,
		asnResult,
		baselineEndpointResult,
		baselineUserAgentResult,
		baselineCountryResult,
		baselineAsnResult,
	] = await Promise.allSettled([
		queryDimension(client, zoneId, from, to, 'clientRequestPath'),
		queryDimension(client, zoneId, from, to, 'userAgentBrowser'),
		queryDimension(client, zoneId, from, to, 'clientCountryName'),
		queryDimension(client, zoneId, from, to, 'clientASNDescription'),
		queryDimension(client, zoneId, baselineFrom, baselineTo, 'clientRequestPath'),
		queryDimension(client, zoneId, baselineFrom, baselineTo, 'userAgentBrowser'),
		queryDimension(client, zoneId, baselineFrom, baselineTo, 'clientCountryName'),
		queryDimension(client, zoneId, baselineFrom, baselineTo, 'clientASNDescription'),
	]);

	const contributors: AttributionContributor[] = [];

	if (endpointResult.status === 'fulfilled') {
		const baselineMap =
			baselineEndpointResult.status === 'fulfilled'
				? groupsToMap(baselineEndpointResult.value, 'clientRequestPath')
				: undefined;
		contributors.push(
			...buildContributors(
				endpointResult.value,
				'endpoint',
				'clientRequestPath',
				totalRequests,
				baselineMap,
			),
		);
	}

	if (userAgentResult.status === 'fulfilled') {
		const baselineMap =
			baselineUserAgentResult.status === 'fulfilled'
				? groupsToMap(baselineUserAgentResult.value, 'userAgentBrowser')
				: undefined;
		contributors.push(
			...buildContributors(
				userAgentResult.value,
				'user_agent',
				'userAgentBrowser',
				totalRequests,
				baselineMap,
			),
		);
	}

	if (countryResult.status === 'fulfilled') {
		const baselineMap =
			baselineCountryResult.status === 'fulfilled'
				? groupsToMap(baselineCountryResult.value, 'clientCountryName')
				: undefined;
		contributors.push(
			...buildContributors(
				countryResult.value,
				'country',
				'clientCountryName',
				totalRequests,
				baselineMap,
			),
		);
	}

	if (asnResult.status === 'fulfilled') {
		const baselineMap =
			baselineAsnResult.status === 'fulfilled'
				? groupsToMap(baselineAsnResult.value, 'clientASNDescription')
				: undefined;
		contributors.push(
			...buildContributors(
				asnResult.value,
				'asn',
				'clientASNDescription',
				totalRequests,
				baselineMap,
			),
		);
	}

	// Rank by contribution descending
	contributors.sort((a, b) => b.contributionPct - a.contributionPct);

	return {
		contributors,
		analysisWindow: {
			from: from.toISOString(),
			to: to.toISOString(),
		},
	};
}
