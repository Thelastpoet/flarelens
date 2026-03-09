import { Hono } from 'hono';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';

const billing = new Hono<AppContext>();
billing.use('*', authMiddleware, reposMiddleware);

// GET /billing/overview
billing.get('/overview', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const snapshot = await repos.billingSnapshots.getCurrent();
	if (!snapshot) return c.json({ current_spend: 0, projected_monthly: 0, daily_average: 0, budget_limit: null });

	const breakdown = JSON.parse(snapshot.breakdown) as Record<string, number>;
	const periodStart = new Date(snapshot.period_start);
	const now = new Date();
	const daysElapsed = Math.max(1, Math.floor((now.getTime() - periodStart.getTime()) / 86400000));
	const dailyAverage = snapshot.total_cost / daysElapsed;
	const daysInMonth = 30;
	const projected = dailyAverage * daysInMonth;

	return c.json({
		current_spend: snapshot.total_cost,
		projected_monthly: Math.round(projected * 100) / 100,
		daily_average: Math.round(dailyAverage * 100) / 100,
		budget_limit: snapshot.budget_limit,
		period_start: snapshot.period_start,
		period_end: snapshot.period_end,
		breakdown,
	});
});

// GET /billing/breakdown
billing.get('/breakdown', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const snapshot = await repos.billingSnapshots.getCurrent();
	if (!snapshot) return c.json({ breakdown: {} });

	const breakdown = JSON.parse(snapshot.breakdown) as Record<string, number>;
	const total = snapshot.total_cost;

	const services = Object.entries(breakdown).map(([service, cost]) => ({
		service,
		cost,
		pct: total > 0 ? Math.round((cost / total) * 1000) / 10 : 0,
	}));
	services.sort((a, b) => b.cost - a.cost);

	return c.json({ total, services });
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
	const limit = await repos.billingSnapshots.getBudget();
	const snapshot = await repos.billingSnapshots.getCurrent();
	return c.json({
		budget_limit: limit,
		current_spend: snapshot?.total_cost ?? 0,
		pct_used: limit && limit > 0 ? Math.round(((snapshot?.total_cost ?? 0) / limit) * 1000) / 10 : null,
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
		return c.json({ success: true, budget_limit: limit });
	},
);

// GET /billing/top-drivers
billing.get('/top-drivers', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const snapshot = await repos.billingSnapshots.getCurrent();
	if (!snapshot) return c.json({ drivers: [] });

	const breakdown = JSON.parse(snapshot.breakdown) as Record<string, number>;
	const drivers = Object.entries(breakdown)
		.map(([service, cost]) => ({ service, cost }))
		.sort((a, b) => b.cost - a.cost)
		.slice(0, 5);

	return c.json({ drivers });
});

export { billing as billingRoutes };
