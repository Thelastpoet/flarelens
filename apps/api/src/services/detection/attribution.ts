import { CloudflareClient } from '../cloudflare/client.js';

export interface AttributionContributor {
	type: 'endpoint' | 'user_agent' | 'country' | 'asn';
	value: string;
	requests: number;
	contributionPct: number;
	baselineRequests?: number;
	changeFromBaseline?: number;
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

export async function analyzeAttribution(
	client: CloudflareClient,
	zoneId: string,
	from: Date,
	to: Date,
	totalRequests: number,
): Promise<AttributionResult> {
	const [endpointResult, userAgentResult, countryResult] = await Promise.allSettled([
		queryDimension(client, zoneId, from, to, 'clientRequestPath'),
		queryDimension(client, zoneId, from, to, 'userAgentBrowser'),
		queryDimension(client, zoneId, from, to, 'clientCountryName'),
	]);

	const contributors: AttributionContributor[] = [];

	if (endpointResult.status === 'fulfilled') {
		for (const group of endpointResult.value.slice(0, 5)) {
			contributors.push({
				type: 'endpoint',
				value: group.dimensions['clientRequestPath'] ?? '(unknown)',
				requests: group.count,
				contributionPct: totalRequests > 0 ? (group.count / totalRequests) * 100 : 0,
			});
		}
	}

	if (userAgentResult.status === 'fulfilled') {
		for (const group of userAgentResult.value.slice(0, 5)) {
			contributors.push({
				type: 'user_agent',
				value: group.dimensions['userAgentBrowser'] ?? '(unknown)',
				requests: group.count,
				contributionPct: totalRequests > 0 ? (group.count / totalRequests) * 100 : 0,
			});
		}
	}

	if (countryResult.status === 'fulfilled') {
		for (const group of countryResult.value.slice(0, 5)) {
			contributors.push({
				type: 'country',
				value: group.dimensions['clientCountryName'] ?? '(unknown)',
				requests: group.count,
				contributionPct: totalRequests > 0 ? (group.count / totalRequests) * 100 : 0,
			});
		}
	}

	// Sort by contribution descending
	contributors.sort((a, b) => b.contributionPct - a.contributionPct);

	return {
		contributors,
		analysisWindow: {
			from: from.toISOString(),
			to: to.toISOString(),
		},
	};
}
