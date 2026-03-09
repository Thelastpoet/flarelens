import type { Repos } from '../../../middleware/repos.js';
import type { Anomaly } from '@flarelens/shared';
import { newId } from '@flarelens/shared';

export async function sendInAppNotification(repos: Repos, anomaly: Anomaly): Promise<void> {
	await repos.notifications.create({
		id: newId(),
		user_id: null,
		type: 'anomaly',
		title: `${anomaly.severity} anomaly: ${anomaly.metric}`,
		body: `Detected ${anomaly.metric} = ${anomaly.current_value}`,
		severity: anomaly.severity === 'critical' ? 'critical' : anomaly.severity === 'high' ? 'warning' : 'info',
		link: `/anomalies/${anomaly.id}`,
	});
}
