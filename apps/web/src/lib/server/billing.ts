import {
	expectArray,
	expectNullableNumber,
	expectNullableString,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

function parseBreakdownMap(value: unknown, path: string): Record<string, number> {
	const map = expectObject(value, path);
	return Object.fromEntries(
		Object.entries(map).map(([key, entry]) => [key, expectNumber(entry, `${path}.${key}`)]),
	);
}

export interface BillingPageData {
	overview: {
		source: 'estimated_snapshots' | 'billing_snapshot' | 'none';
		is_estimated: boolean;
		current_estimated_spend: number;
		projected_monthly_estimated: number;
		daily_estimated_average: number;
		budget_limit: number | null;
		period_start: string | null;
		period_end: string | null;
		breakdown: Record<string, number>;
	};
	breakdown: {
		source: 'estimated_snapshots' | 'billing_snapshot' | 'none';
		is_estimated: boolean;
		total: number;
		services: Array<{ service: string; cost: number; pct: number }>;
	};
	budget: {
		budget_limit: number | null;
		current_estimated_spend: number;
		is_estimated: boolean;
		source: 'estimated_snapshots' | 'billing_snapshot' | 'none';
		pct_used: number | null;
	};
	topDrivers: Array<{ service: string; cost: number }>;
	invoices: Array<{
		id: string;
		period_start: string;
		period_end: string;
		total_cost: number;
		status: 'active' | 'invoice';
	}>;
}

export async function loadBillingPage(fetchFn: typeof fetch): Promise<BillingPageData> {
	const [overviewPayload, breakdownPayload, budgetPayload, driversPayload, invoicesPayload] =
		await Promise.all([
			fetchJson(fetchFn, '/billing/overview'),
			fetchJson(fetchFn, '/billing/breakdown'),
			fetchJson(fetchFn, '/billing/budget'),
			fetchJson(fetchFn, '/billing/top-drivers'),
			fetchJson(fetchFn, '/billing/invoices'),
		]);

	const overview = expectObject(overviewPayload, 'billing.overview');
	const breakdown = expectObject(breakdownPayload, 'billing.breakdown');
	const budget = expectObject(budgetPayload, 'billing.budget');
	const drivers = expectObject(driversPayload, 'billing.drivers');
	const invoices = expectObject(invoicesPayload, 'billing.invoices');

	return {
		overview: {
			source: expectString(overview.source, 'billing.overview.source') as BillingPageData['overview']['source'],
			is_estimated: overview.is_estimated === true,
			current_estimated_spend: expectNumber(
				overview.current_estimated_spend,
				'billing.overview.current_estimated_spend',
			),
			projected_monthly_estimated: expectNumber(
				overview.projected_monthly_estimated,
				'billing.overview.projected_monthly_estimated',
			),
			daily_estimated_average: expectNumber(
				overview.daily_estimated_average,
				'billing.overview.daily_estimated_average',
			),
			budget_limit: expectNullableNumber(overview.budget_limit, 'billing.overview.budget_limit'),
			period_start: expectNullableString(overview.period_start, 'billing.overview.period_start'),
			period_end: expectNullableString(overview.period_end, 'billing.overview.period_end'),
			breakdown: parseBreakdownMap(overview.breakdown, 'billing.overview.breakdown'),
		},
		breakdown: {
			source: expectString(breakdown.source, 'billing.breakdown.source') as BillingPageData['breakdown']['source'],
			is_estimated: breakdown.is_estimated === true,
			total: expectNumber(breakdown.total, 'billing.breakdown.total'),
			services: expectArray(breakdown.services, 'billing.breakdown.services').map((item, index) => {
				const row = expectObject(item, `billing.breakdown.services[${index}]`);
				return {
					service: expectString(row.service, `billing.breakdown.services[${index}].service`),
					cost: expectNumber(row.cost, `billing.breakdown.services[${index}].cost`),
					pct: expectNumber(row.pct, `billing.breakdown.services[${index}].pct`),
				};
			}),
		},
		budget: {
			budget_limit: expectNullableNumber(budget.budget_limit, 'billing.budget.budget_limit'),
			current_estimated_spend: expectNumber(
				budget.current_estimated_spend,
				'billing.budget.current_estimated_spend',
			),
			is_estimated: budget.is_estimated === true,
			source: expectString(budget.source, 'billing.budget.source') as BillingPageData['budget']['source'],
			pct_used: expectNullableNumber(budget.pct_used, 'billing.budget.pct_used'),
		},
		topDrivers: expectArray(drivers.drivers, 'billing.drivers.drivers').map((item, index) => {
			const row = expectObject(item, `billing.drivers.drivers[${index}]`);
			return {
				service: expectString(row.service, `billing.drivers.drivers[${index}].service`),
				cost: expectNumber(row.cost, `billing.drivers.drivers[${index}].cost`),
			};
		}),
		invoices: expectArray(invoices.invoices, 'billing.invoices.invoices').map((item, index) => {
			const row = expectObject(item, `billing.invoices.invoices[${index}]`);
			return {
				id: expectString(row.id, `billing.invoices.invoices[${index}].id`),
				period_start: expectString(
					row.period_start,
					`billing.invoices.invoices[${index}].period_start`,
				),
				period_end: expectString(
					row.period_end,
					`billing.invoices.invoices[${index}].period_end`,
				),
				total_cost: expectNumber(
					row.total_cost,
					`billing.invoices.invoices[${index}].total_cost`,
				),
				status: expectString(
					row.status,
					`billing.invoices.invoices[${index}].status`,
				) as 'active' | 'invoice',
			};
		}),
	};
}
