import type { Anomaly } from '@flarelens/shared';
import { newId } from '@flarelens/shared';
import type { Repos } from '../../../middleware/repos.js';

function metricLabel(metric: Anomaly['metric']): string {
	if (metric === 'requests') return 'traffic';
	if (metric === 'bytes') return 'bandwidth';
	if (metric === 'cached_requests') return 'cache activity';
	return 'threat traffic';
}

function titleForAnomaly(anomaly: Anomaly): string {
	const metric = metricLabel(anomaly.metric);
	if (anomaly.baseline_value != null) {
		if (anomaly.current_value > anomaly.baseline_value) {
			return `${metric[0].toUpperCase()}${metric.slice(1)} increased`;
		}
		if (anomaly.current_value < anomaly.baseline_value) {
			return `${metric[0].toUpperCase()}${metric.slice(1)} dropped`;
		}
	}
	return `${metric[0].toUpperCase()}${metric.slice(1)} changed`;
}

export async function sendInAppNotification(repos: Repos, anomaly: Anomaly): Promise<void> {
	const resource = await repos.resources.findById(anomaly.resource_id);
	const resourceLabel = resource?.name ?? anomaly.resource_id;
	const metric = metricLabel(anomaly.metric);
	await repos.notifications.create({
		id: newId(),
		user_id: null,
		type: 'anomaly',
		title: `${titleForAnomaly(anomaly)} on ${resourceLabel}`,
		body: `${metric[0].toUpperCase()}${metric.slice(1)} changed unexpectedly on ${resourceLabel}. Open the detail view to see why it matters and what to check next.`,
		severity:
			anomaly.severity === 'critical'
				? 'critical'
				: anomaly.severity === 'high'
					? 'warning'
					: 'info',
		link: `/anomalies/${anomaly.id}`,
	});
}
