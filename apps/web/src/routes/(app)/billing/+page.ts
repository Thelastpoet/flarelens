import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface BillingOverview {
	source: 'estimated_snapshots' | 'billing_snapshot' | 'none';
	is_estimated: boolean;
	current_estimated_spend: number;
	projected_monthly_estimated: number;
	daily_estimated_average: number;
	budget_limit: number | null;
	period_start: string | null;
	period_end: string | null;
	breakdown: Record<string, number>;
}

interface BillingBreakdown {
	source: 'estimated_snapshots' | 'billing_snapshot' | 'none';
	is_estimated: boolean;
	total: number;
	services: Array<{ service: string; cost: number; pct: number }>;
}

interface BillingBudget {
	budget_limit: number | null;
	current_estimated_spend: number;
	is_estimated: boolean;
	source: 'estimated_snapshots' | 'billing_snapshot' | 'none';
	pct_used: number | null;
}

interface BillingDriver {
	service: string;
	cost: number;
}

interface InvoiceRecord {
	id: string;
	period_start: string;
	period_end: string;
	total_cost: number;
	status: 'active' | 'invoice';
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const [overview, breakdown, budget, topDrivers, invoices] = await Promise.all([
		api.get<BillingOverview>('/billing/overview'),
		api.get<BillingBreakdown>('/billing/breakdown'),
		api.get<BillingBudget>('/billing/budget'),
		api.get<{ drivers: BillingDriver[]; source: string; is_estimated: boolean }>('/billing/top-drivers'),
		api.get<{ invoices: InvoiceRecord[] }>('/billing/invoices'),
	]);

	return {
		overview,
		breakdown,
		budget,
		topDrivers: topDrivers.drivers,
		invoices: invoices.invoices,
	};
};
