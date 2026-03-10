import { CF_REQUIRED_CAPABILITIES, ValidationError } from '@flarelens/shared';
import { Hono } from 'hono';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { reposMiddleware } from '../middleware/repos.js';
import { AnalyticsService } from '../services/analytics.js';

const analytics = new Hono<AppContext>();
analytics.use('*', authMiddleware, reposMiddleware);

async function assertAnalyticsReady(c: {
	get: (key: 'repos') => import('../middleware/repos.js').Repos;
}): Promise<void> {
	const repos = c.get('repos');
	const verifiedTokens = await repos.cfTokens.findVerifiedByAccount(CF_REQUIRED_CAPABILITIES);
	if (verifiedTokens.length === 0) {
		throw new ValidationError(
			'No verified Cloudflare token with analytics capabilities is available for this account',
		);
	}
}

// GET /analytics/overview — KV-cached for 60s
analytics.get('/overview', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { from, to } = c.req.query();
	const session = c.get('session');
	const cacheKey = `analytics_overview:${session.account_id}:${from ?? ''}:${to ?? ''}`;
	const cached = await c.env.CACHE.get(cacheKey);
	if (cached) {
		return c.json(JSON.parse(cached));
	}
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getOverview(from, to);
	await c.env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 });
	c.header('Cache-Control', 'private, max-age=60');
	return c.json(data);
});

// GET /analytics/traffic
analytics.get('/traffic', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getTraffic(zone_id, from, to);
	return c.json(data);
});

// GET /analytics/cost
analytics.get('/cost', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getCost(from, to);
	return c.json(data);
});

// GET /analytics/top-endpoints
analytics.get('/top-endpoints', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to, limit } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getTopEndpoints(zone_id, from, to, limit ? parseInt(limit, 10) : 10);
	return c.json(data);
});

// GET /analytics/geo
analytics.get('/geo', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getGeo(zone_id, from, to);
	return c.json(data);
});

// GET /analytics/clients
analytics.get('/clients', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getClients(zone_id, from, to);
	return c.json(data);
});

// GET /analytics/baseline
analytics.get('/baseline', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getBaseline(from, to);
	return c.json(data);
});

// GET /analytics/bot-activity
analytics.get('/bot-activity', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getBotActivity(zone_id, from, to);
	return c.json(data);
});

// GET /analytics/performance
analytics.get('/performance', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getPerformance(zone_id, from, to);
	return c.json(data);
});

// GET /analytics/errors
analytics.get('/errors', rateLimit('reads'), async (c) => {
	await assertAnalyticsReady(c);
	const { zone_id, from, to } = c.req.query();
	const service = new AnalyticsService(c.get('repos'), c.env);
	const data = await service.getErrors(zone_id, from, to);
	return c.json(data);
});

export { analytics as analyticsRoutes };
