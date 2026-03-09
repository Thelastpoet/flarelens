import type { Rule, RuleOperator } from '@flarelens/shared';

export interface ThresholdMatch {
	rule: Rule;
	currentValue: number;
	triggered: boolean;
}

function evaluate(operator: RuleOperator, current: number, threshold: number): boolean {
	switch (operator) {
		case 'gt':
			return current > threshold;
		case 'lt':
			return current < threshold;
		case 'gte':
			return current >= threshold;
		case 'lte':
			return current <= threshold;
	}
}

export function evaluateThresholds(
	rules: Rule[],
	currentValue: number,
	metric: string,
): ThresholdMatch[] {
	return rules
		.filter((rule) => rule.metric === metric && rule.enabled === 1)
		.map((rule) => ({
			rule,
			currentValue,
			triggered: evaluate(rule.operator, currentValue, rule.threshold),
		}));
}
