import type { Baseline, Severity } from '@flarelens/shared';
import { BASELINE_DEVIATION_THRESHOLDS } from '@flarelens/shared';

export interface BaselineResult {
	deviation: number; // z-score: (current - avg) / stddev
	deviationPct: number; // % above/below baseline
	severity: 'normal' | 'warning' | 'high' | 'critical' | null;
	baseline: Baseline;
}

export function evaluateBaseline(current: number, baseline: Baseline): BaselineResult {
	const { avg_value, stddev_value } = baseline;

	// If stddev is 0 there is no meaningful spread — cannot compute z-score
	if (stddev_value === 0) {
		return {
			deviation: 0,
			deviationPct: avg_value !== 0 ? ((current - avg_value) / avg_value) * 100 : 0,
			severity: null,
			baseline,
		};
	}

	const deviation = (current - avg_value) / stddev_value;
	const deviationPct = avg_value !== 0 ? ((current - avg_value) / avg_value) * 100 : 0;

	// Below baseline is not an anomaly
	if (deviation <= 0) {
		return { deviation, deviationPct, severity: null, baseline };
	}

	let severity: Severity | 'normal' | null;
	if (deviation >= BASELINE_DEVIATION_THRESHOLDS.critical) {
		severity = 'critical';
	} else if (deviation >= BASELINE_DEVIATION_THRESHOLDS.high) {
		severity = 'high';
	} else if (deviation >= BASELINE_DEVIATION_THRESHOLDS.warning) {
		severity = 'warning';
	} else {
		severity = 'normal';
	}

	return { deviation, deviationPct, severity, baseline };
}
