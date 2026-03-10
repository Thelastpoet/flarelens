import type { AccountSettings, BillingSnapshot, ZoneSnapshot } from '@flarelens/shared';

export type BillingSource = 'estimated_snapshots' | 'billing_snapshot' | 'none';

export interface BillingEstimateSummary {
	source: BillingSource;
	is_estimated: boolean;
	current_estimated_spend: number;
	projected_monthly_estimated: number;
	daily_estimated_average: number;
	period_start: string | null;
	period_end: string | null;
	breakdown: Record<string, number>;
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100;
}

function daysBetween(start: Date, end: Date): number {
	return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

export function getBudgetLimitFromSettings(
	accountSettings: AccountSettings | Record<string, unknown>,
): number | null {
	const raw = accountSettings.budget_limit;
	return typeof raw === 'number' ? raw : null;
}

export function summarizeBillingFromSnapshot(
	snapshot: BillingSnapshot,
	now = new Date(),
): BillingEstimateSummary {
	const breakdown = JSON.parse(snapshot.breakdown) as Record<string, number>;
	const periodStart = new Date(snapshot.period_start);
	const dailyAverage = snapshot.total_cost / daysBetween(periodStart, now);
	const projected = dailyAverage * 30;

	return {
		source: 'billing_snapshot',
		is_estimated: false,
		current_estimated_spend: roundMoney(snapshot.total_cost),
		projected_monthly_estimated: roundMoney(projected),
		daily_estimated_average: roundMoney(dailyAverage),
		period_start: snapshot.period_start,
		period_end: snapshot.period_end,
		breakdown,
	};
}

export function summarizeBillingFromZoneSnapshots(
	snapshots: ZoneSnapshot[],
	now = new Date(),
): BillingEstimateSummary {
	if (snapshots.length === 0) {
		return {
			source: 'none',
			is_estimated: true,
			current_estimated_spend: 0,
			projected_monthly_estimated: 0,
			daily_estimated_average: 0,
			period_start: null,
			period_end: null,
			breakdown: {},
		};
	}

	const ordered = [...snapshots].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
	const periodStart = ordered[0].timestamp;
	const periodEnd = ordered[ordered.length - 1].timestamp;
	const total = ordered.reduce((sum, snapshot) => sum + snapshot.estimated_cost, 0);
	const dailyAverage = total / daysBetween(new Date(periodStart), now);

	return {
		source: 'estimated_snapshots',
		is_estimated: true,
		current_estimated_spend: roundMoney(total),
		projected_monthly_estimated: roundMoney(dailyAverage * 30),
		daily_estimated_average: roundMoney(dailyAverage),
		period_start: periodStart,
		period_end: periodEnd,
		breakdown: {
			cdn_bandwidth_estimated: roundMoney(total),
		},
	};
}
