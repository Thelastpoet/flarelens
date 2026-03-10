import { AccountsRepository, TeamMembersRepository, UsersRepository } from '@flarelens/db';
import { Resend } from 'resend';
import type { Env } from '../env.js';

export async function runDailyDigest(env: Env): Promise<void> {
	if (!env.RESEND_API_KEY) return;
	const DB = (env as unknown as { DB: D1Database }).DB;
	const resend = new Resend(env.RESEND_API_KEY);

	const accountRows = await DB.prepare(
		"SELECT DISTINCT account_id FROM team_members WHERE status = 'active'",
	).all<{ account_id: string }>();

	for (const { account_id } of accountRows.results ?? []) {
		try {
			await sendDigest(account_id, DB, resend, env.WEB_URL);
		} catch (err) {
			console.error(`[DailyDigest] Account ${account_id} failed:`, err);
		}
	}
}

async function sendDigest(
	accountId: string,
	DB: D1Database,
	resend: Resend,
	webUrl: string,
): Promise<void> {
	const accounts = new AccountsRepository(DB, accountId);
	const account = await accounts.findById();
	if (!account) return;

	const settings = account.settings
		? (JSON.parse(account.settings) as Record<string, unknown>)
		: {};
	if (!settings.digest_enabled) return;

	const members = new TeamMembersRepository(DB, accountId);
	const users = new UsersRepository(DB, accountId);

	const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const recentAnomalies =
		(
			await DB.prepare(
				'SELECT * FROM anomalies WHERE account_id = ? AND detected_at >= ? ORDER BY detected_at DESC LIMIT 100',
			)
				.bind(accountId, since)
				.all<{ severity: string; metric: string; resource_id: string; detected_at: string }>()
		).results ?? [];

	const adminMember = (await members.list()).find(
		(m) => m.role === 'admin' && m.status === 'active',
	);
	if (!adminMember?.user_id) return;
	const adminUser = await users.findById(adminMember.user_id);
	if (!adminUser) return;

	const criticalCount = recentAnomalies.filter((a) => a.severity === 'critical').length;
	const highCount = recentAnomalies.filter((a) => a.severity === 'high').length;
	const warningCount = recentAnomalies.filter((a) => a.severity === 'warning').length;

	const rows = recentAnomalies
		.slice(0, 10)
		.map(
			(a) =>
				`<tr><td>${a.severity}</td><td>${a.metric}</td><td>${a.resource_id}</td><td>${new Date(a.detected_at).toLocaleString()}</td></tr>`,
		)
		.join('');

	const html = `
		<h2>FlareLens Daily Digest — ${new Date().toDateString()}</h2>
		<p>Hi ${adminUser.name}, here's your daily summary for ${account.name}.</p>
		<h3>Anomalies (last 24h)</h3>
		<ul>
			<li>Critical: ${criticalCount}</li>
			<li>High: ${highCount}</li>
			<li>Warning: ${warningCount}</li>
		</ul>
		${
			recentAnomalies.length > 0
				? `
		<table border="1" cellpadding="4" cellspacing="0">
			<tr><th>Severity</th><th>Metric</th><th>Resource</th><th>Detected</th></tr>
			${rows}
		</table>`
				: '<p>No anomalies detected in the last 24 hours. 🎉</p>'
		}
		<p><a href="${webUrl}/dashboard">View Dashboard</a></p>
	`;

	await resend.emails.send({
		from: 'FlareLens <noreply@flarelens.com>',
		to: [adminUser.email],
		subject: `FlareLens Daily Digest — ${criticalCount + highCount} issues`,
		html,
	});
}
