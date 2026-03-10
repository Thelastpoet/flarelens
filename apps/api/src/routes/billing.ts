import { Hono } from 'hono';
import { z } from 'zod';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import type { Repos } from '../middleware/repos.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';
import {
	getBudgetLimitFromSettings,
	summarizeBillingFromSnapshot,
	summarizeBillingFromZoneSnapshots,
} from '../services/billing.js';

const billing = new Hono<AppContext>();
billing.use('*', authMiddleware, reposMiddleware);

function currentMonthRange(now = new Date()): { from: string; to: string } {
	const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
	return { from: from.toISOString(), to: now.toISOString() };
}

async function resolveBillingSummary(repos: Repos) {
	const [snapshot, account] = await Promise.all([
		repos.billingSnapshots.getCurrent(),
		repos.accounts.findById(),
	]);
	const accountSettings = account?.settings
		? (JSON.parse(account.settings) as Record<string, unknown>)
		: {};
	const budgetLimit = getBudgetLimitFromSettings(accountSettings);

	if (snapshot) {
		return {
			summary: summarizeBillingFromSnapshot(snapshot),
			budgetLimit,
		};
	}

	const range = currentMonthRange();
	const estimatedRows = await repos.billingSnapshots.listCurrentPeriodEstimatedSnapshots(
		range.from,
		range.to,
	);
	return {
		summary: summarizeBillingFromZoneSnapshots(
			estimatedRows.map((row, index) => ({
				id: `estimated-${index}`,
				account_id: '',
				resource_id: '',
				timestamp: row.timestamp,
				requests: 0,
				cached_requests: 0,
				bytes: 0,
				threats: 0,
				page_views: 0,
				unique_visitors: 0,
				estimated_cost: row.estimated_cost,
				top_endpoints: '[]',
				top_countries: '[]',
				top_user_agents: '[]',
				created_at: row.timestamp,
			})),
			new Date(range.to),
		),
		budgetLimit,
	};
}

// GET /billing/overview
billing.get('/overview', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const { summary, budgetLimit } = await resolveBillingSummary(repos);

	return c.json({
		source: summary.source,
		is_estimated: summary.is_estimated,
		current_estimated_spend: summary.current_estimated_spend,
		projected_monthly_estimated: summary.projected_monthly_estimated,
		daily_estimated_average: summary.daily_estimated_average,
		budget_limit: budgetLimit,
		period_start: summary.period_start,
		period_end: summary.period_end,
		breakdown: summary.breakdown,
	});
});

// GET /billing/breakdown
billing.get('/breakdown', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const { summary } = await resolveBillingSummary(repos);
	const breakdown = summary.breakdown;
	const total = summary.current_estimated_spend;

	const services = Object.entries(breakdown).map(([service, cost]) => ({
		service,
		cost,
		pct: total > 0 ? Math.round((cost / total) * 1000) / 10 : 0,
	}));
	services.sort((a, b) => b.cost - a.cost);

	return c.json({ source: summary.source, is_estimated: summary.is_estimated, total, services });
});

// GET /billing/invoices
billing.get('/invoices', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const invoices = await repos.billingSnapshots.listInvoices();
	return c.json({ invoices });
});

// GET /billing/budget
billing.get('/budget', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const { summary, budgetLimit } = await resolveBillingSummary(repos);
	return c.json({
		budget_limit: budgetLimit,
		current_estimated_spend: summary.current_estimated_spend,
		is_estimated: summary.is_estimated,
		source: summary.source,
		pct_used:
			budgetLimit && budgetLimit > 0
				? Math.round((summary.current_estimated_spend / budgetLimit) * 1000) / 10
				: null,
	});
});

// PATCH /billing/budget
billing.patch(
	'/budget',
	requireRole('admin'),
	rateLimit('writes'),
	validate(z.object({ limit: z.number().nonnegative().nullable() })),
	async (c) => {
		const { limit } = c.get('validatedBody') as { limit: number | null };
		const repos = c.get('repos');
		await repos.billingSnapshots.setBudget(limit);
		await logAudit(c, {
			action: 'update',
			entity_type: 'settings',
			description: `Updated budget limit to ${limit ?? 'none'}`,
			metadata: { budget_limit: limit, source: 'account_settings' },
		});
		return c.json({ success: true, budget_limit: limit });
	},
);

// GET /billing/top-drivers
billing.get('/top-drivers', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const { summary } = await resolveBillingSummary(repos);
	const breakdown = summary.breakdown;
	const drivers = Object.entries(breakdown)
		.map(([service, cost]) => ({ service, cost }))
		.sort((a, b) => b.cost - a.cost)
		.slice(0, 5);

	return c.json({ source: summary.source, is_estimated: summary.is_estimated, drivers });
});

export { billing as billingRoutes };
