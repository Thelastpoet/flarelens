export interface VelocityResult {
	velocity: number; // rate of change per interval (last interval)
	acceleration: number; // change in velocity (last interval)
	isRapidIncrease: boolean; // velocity > 3x baseline_velocity (or doubled if no baseline)
	isSustainedAcceleration: boolean; // accel > 0 for 3+ consecutive points
	severity: 'warning' | 'high' | 'critical' | null;
}

export function evaluateVelocity(values: number[], baselineVelocity?: number): VelocityResult {
	if (values.length < 3) {
		return {
			velocity: 0,
			acceleration: 0,
			isRapidIncrease: false,
			isSustainedAcceleration: false,
			severity: null,
		};
	}

	// Compute per-interval velocities
	const velocities: number[] = [];
	for (let i = 1; i < values.length; i++) {
		velocities.push(values[i] - values[i - 1]);
	}

	const lastVelocity = velocities[velocities.length - 1];
	const prevVelocity = velocities[velocities.length - 2];
	const acceleration = lastVelocity - prevVelocity;

	// isRapidIncrease: last velocity > 3x baselineVelocity if provided,
	// otherwise check if it's positive and at least doubles the previous velocity
	let isRapidIncrease: boolean;
	if (baselineVelocity !== undefined && baselineVelocity > 0) {
		isRapidIncrease = lastVelocity > 3 * baselineVelocity;
	} else {
		// No baseline: rapid if velocity is positive AND at least 2x the previous velocity
		isRapidIncrease = lastVelocity > 0 && prevVelocity > 0 && lastVelocity >= prevVelocity * 2;
	}

	// isSustainedAcceleration: last 3 velocities are all increasing
	// We need at least 3 velocities (i.e. at least 4 values)
	let isSustainedAcceleration = false;
	if (velocities.length >= 3) {
		const last3 = velocities.slice(-3);
		isSustainedAcceleration = last3[1] > last3[0] && last3[2] > last3[1];
	}

	// Severity determination
	let severity: 'warning' | 'high' | 'critical' | null = null;
	if (isRapidIncrease && isSustainedAcceleration) {
		severity = 'critical';
	} else if (isRapidIncrease) {
		severity = 'high';
	} else if (isSustainedAcceleration) {
		severity = 'warning';
	}

	return {
		velocity: lastVelocity,
		acceleration,
		isRapidIncrease,
		isSustainedAcceleration,
		severity,
	};
}
