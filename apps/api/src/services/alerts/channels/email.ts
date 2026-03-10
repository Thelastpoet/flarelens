import type { Anomaly } from '@flarelens/shared';
import { Resend } from 'resend';
import type { Env } from '../../../env.js';

export async function sendEmailAlert(
	env: Env,
	toEmail: string,
	_toName: string,
	anomaly: Anomaly,
): Promise<void> {
	try {
		const resend = new Resend(env.RESEND_API_KEY);
		const webUrl = env.WEB_URL || 'https://app.flarelens.com';

		const subject = `[${anomaly.severity.toUpperCase()}] ${anomaly.metric} anomaly detected`;

		const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 24px; }
    .card { background: #fff; border-radius: 8px; padding: 24px; max-width: 600px; margin: 0 auto; }
    .severity { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
    .severity-warning { background: #fef9c3; color: #854d0e; }
    .severity-high { background: #fee2e2; color: #991b1b; }
    .severity-critical { background: #7f1d1d; color: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    td:first-child { font-weight: bold; color: #6b7280; width: 40%; }
    .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h2 style="margin-top:0">FlareLens Anomaly Alert</h2>
    <p>An anomaly has been detected in your Cloudflare resources.</p>

    <span class="severity severity-${anomaly.severity}">${anomaly.severity}</span>

    <table>
      <tr><td>Metric</td><td>${anomaly.metric}</td></tr>
      <tr><td>Current Value</td><td>${anomaly.current_value.toLocaleString()}</td></tr>
      ${anomaly.baseline_value !== null ? `<tr><td>Baseline Value</td><td>${anomaly.baseline_value.toLocaleString()}</td></tr>` : ''}
      ${anomaly.deviation !== null ? `<tr><td>Deviation (z-score)</td><td>${anomaly.deviation.toFixed(2)}</td></tr>` : ''}
      <tr><td>Detected At</td><td>${anomaly.detected_at}</td></tr>
      <tr><td>Detection Type</td><td>${anomaly.detection_type}</td></tr>
    </table>

    <p style="margin-top:20px">
      <a href="${webUrl}/anomalies/${anomaly.id}"
         style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">
        View Anomaly
      </a>
    </p>

    <div class="footer">
      You are receiving this because you are an admin of a FlareLens account.
      <br/>To manage notification settings, visit your account settings.
    </div>
  </div>
</body>
</html>
    `.trim();

		await resend.emails.send({
			from: 'FlareLens Alerts <alerts@flarelens.com>',
			to: [toEmail],
			subject,
			html,
		});
	} catch (err) {
		console.error('[EmailAlert] Failed to send alert email:', err);
	}
}
