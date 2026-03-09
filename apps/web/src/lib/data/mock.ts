// Static demo data matching screenshots exactly

export const currentUser = {
	name: 'Jane Doe',
	email: 'jane@example.com',
	initials: 'JD',
	avatar: null,
};

export const account = {
	name: 'Cloudflare',
	subtitle: 'Pro Plan',
	plan: 'pro' as const,
};

export const dashboardOverview = {
	status: 'All Systems Normal',
	period: 'Last 24 Hours',
	totalRequests: { value: '1.2M', trend: '+5%', direction: 'up' as const },
	workerExecutions: { value: '450K', trend: '-4%', direction: 'down' as const },
	estimatedCost: { value: '$12.50', trend: '', subtitle: '25% of $50 limit' },
	quickStats: {
		botActivity: '18.4%',
		topSources: [
			{ country: 'United States', flag: '🇺🇸', pct: 45 },
			{ country: 'Germany', flag: '🇩🇪', pct: 22 },
			{ country: 'United Kingdom', flag: '🇬🇧', pct: 10 },
		],
	},
	recentActivity: [
		{
			icon: 'alert',
			title: 'Rate limit triggered',
			description: 'API endpoint /v1/users experienced a surge',
			time: '',
		},
		{
			icon: 'check',
			title: 'Cost optimization applied',
			description: 'Automatically cached 65 static assets',
			time: '',
		},
		{ icon: 'deploy', title: 'Worker script deployed', description: '', time: '' },
	],
};

export const trafficChartData = {
	labels: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', 'Now'],
	actual: [20, 18, 22, 35, 50, 45, 42, 48],
	baseline: [22, 20, 24, 32, 45, 43, 40, 44],
};

export const billingOverview = {
	cycle: 'Oct 1 - Oct 31',
	month: 'October 2023',
	spentThisMonth: { value: '$450.25', trend: '+12%', subtitle: '72% of $620 budget' },
	projected: { value: '$580.00', trend: '+6%', subtitle: 'Estimated total by end of month' },
	dailyAverage: { value: '$14.52', trend: '-2%', subtitle: 'Based on last 30 days usage' },
	breakdown: [
		{ service: 'Workers', amount: 202.61, color: 'bg-brand-500' },
		{ service: 'CDN', amount: 112.56, color: 'bg-blue-500' },
		{ service: 'WAF', amount: 67.53, color: 'bg-green-500' },
		{ service: 'R2 Storage', amount: 45.02, color: 'bg-indigo-500' },
		{ service: 'KV', amount: 22.53, color: 'bg-yellow-500' },
	],
	topDrivers: [
		{ name: 'api.example.com', type: 'Worker Requests', amount: 84.2, trend: '+15% vs last week' },
		{ name: 'static-assets', type: 'R2 Storage Egress', amount: 32.5, trend: '-4% vs last week' },
		{ name: 'auth-middleware', type: 'Worker Executions', amount: 28.1, trend: 'Stable' },
	],
	recentInvoices: [
		{ period: 'Sep 2023', status: 'Paid', date: 'Oct 1, 2023', amount: 425.8 },
		{ period: 'Aug 2023', status: 'Paid', date: 'Sep 1, 2023', amount: 390.15 },
		{ period: 'Jul 2023', status: 'Paid', date: 'Aug 1, 2023', amount: 385.4 },
	],
};

export const rules = [
	{
		id: '1',
		name: 'KV Read Spike',
		condition: '> $5.00/hr',
		service: 'KV',
		enabled: true,
		icon: '💾',
	},
	{
		id: '2',
		name: 'Workers CPU Limit',
		condition: '> 50ms avg/req',
		service: 'Workers',
		enabled: true,
		icon: '🌐',
	},
	{
		id: '3',
		name: 'Bandwidth Surge',
		condition: '> 1TB/day',
		service: 'CDN',
		enabled: false,
		icon: '📊',
	},
	{
		id: '4',
		name: 'DDoS Alert',
		condition: '> 10k req/sec',
		service: 'WAF',
		enabled: true,
		icon: '🛡️',
	},
];

export const notifications = [
	{
		id: '1',
		severity: 'critical' as const,
		title: 'Bandwidth Usage Spike Detected',
		body: 'Egress traffic for domain example.com has increased by 300% in the last 10 minutes, potentially exceeding daily limits.',
		time: '15 mins ago',
		actions: ['View Details', 'Dismiss'],
	},
	{
		id: '2',
		severity: 'warning' as const,
		title: 'Monthly Budget at 80%',
		body: 'Your current estimated monthly cost is $400, approaching your $500 limit. At current burn rate, budget will be depleted in 5 days.',
		time: '2 hours ago',
		actions: ['Manage Budget', 'Dismiss'],
	},
	{
		id: '3',
		severity: 'high' as const,
		title: 'Unusual Worker Execution Rate',
		body: 'Worker api-gateway has triggered 50,000 requests in the last hour. This is 5x higher than historical average.',
		time: '5 hours ago',
		actions: ['Investigate', 'Dismiss'],
	},
	{
		id: '4',
		severity: 'info' as const,
		title: 'New Billing Cycle Started',
		body: 'Your new billing cycle for October has begun. Budgets have been reset.',
		time: '1 day ago',
		actions: [],
	},
];

export const integrations = [
	{
		type: 'slack',
		name: 'Slack',
		description: "Receive alerts directly in your team's designated Slack channels.",
		status: 'connected' as const,
		icon: 'slack',
	},
	{
		type: 'discord',
		name: 'Discord',
		description: 'Send budget alerts and summaries to Discord text channels via webhooks.',
		status: 'disconnected' as const,
		icon: 'discord',
	},
	{
		type: 'pagerduty',
		name: 'PagerDuty',
		description: 'Trigger incidents automatically for critical cost thresholds or anomalies.',
		status: 'connected' as const,
		icon: 'pagerduty',
	},
	{
		type: 'webhook',
		name: 'Custom Webhook',
		description: 'Integrate with any other tool by sending POST requests to a custom URL.',
		status: 'disconnected' as const,
		icon: 'webhook',
	},
];

export const teamMembers = [
	{
		id: '1',
		name: 'Alice Smith',
		email: 'alice@example.com',
		initials: 'AS',
		role: 'Admin' as const,
		status: 'Active' as const,
		lastActive: '2 mins ago',
	},
	{
		id: '2',
		name: 'Bob Jones',
		email: 'bob@example.com',
		initials: 'BJ',
		role: 'Editor' as const,
		status: 'Active' as const,
		lastActive: '1 hour ago',
	},
	{
		id: '3',
		name: 'Charlie Brown',
		email: 'charlie@example.com',
		initials: 'CB',
		role: 'Viewer' as const,
		status: 'Active' as const,
		lastActive: '2 days ago',
	},
	{
		id: '4',
		name: '',
		email: 'david@example.com',
		initials: '',
		role: 'Viewer' as const,
		status: 'Pending' as const,
		lastActive: '-',
	},
];

export const teamInvites = [
	{
		email: 'david@example.com',
		role: 'Viewer',
		date: 'Today at 10:24 AM',
		invitedBy: 'Alice Smith',
		status: 'Awaiting Reply' as const,
	},
	{
		email: 'charlie@example.com',
		role: 'Viewer',
		date: 'Oct 24 at 2:15 PM',
		invitedBy: 'Alice Smith',
		status: 'Accepted' as const,
	},
];

export const auditLogs = [
	{
		id: '1',
		timestamp: 'Oct 25, 2023 14:32',
		user: 'Alice Smith',
		action: 'Created',
		entity: 'Rule',
		description: 'Created rule "KV Read Spike"',
		ip: '192.168.1.1',
	},
	{
		id: '2',
		timestamp: 'Oct 25, 2023 13:15',
		user: 'Bob Jones',
		action: 'Updated',
		entity: 'Integration',
		description: 'Updated Slack webhook configuration',
		ip: '192.168.1.2',
	},
	{
		id: '3',
		timestamp: 'Oct 25, 2023 11:00',
		user: 'Alice Smith',
		action: 'Invited',
		entity: 'Team',
		description: 'Invited david@example.com as Viewer',
		ip: '192.168.1.1',
	},
	{
		id: '4',
		timestamp: 'Oct 24, 2023 16:45',
		user: 'System',
		action: 'Triggered',
		entity: 'Alert',
		description: 'Bandwidth spike alert triggered for example.com',
		ip: '',
	},
	{
		id: '5',
		timestamp: 'Oct 24, 2023 09:00',
		user: 'Alice Smith',
		action: 'Deleted',
		entity: 'Rule',
		description: 'Deleted rule "Old CPU Alert"',
		ip: '192.168.1.1',
	},
];

export const inventoryResources = [
	{
		id: '1',
		name: 'example.com',
		type: 'Zone' as const,
		status: 'Active' as const,
		monitoring: true,
		lastSynced: '5 mins ago',
		requests: '1.2M/day',
	},
	{
		id: '2',
		name: 'api.example.com',
		type: 'Zone' as const,
		status: 'Active' as const,
		monitoring: true,
		lastSynced: '5 mins ago',
		requests: '450K/day',
	},
	{
		id: '3',
		name: 'api-gateway',
		type: 'Worker' as const,
		status: 'Active' as const,
		monitoring: true,
		lastSynced: '5 mins ago',
		requests: '320K/day',
	},
	{
		id: '4',
		name: 'auth-middleware',
		type: 'Worker' as const,
		status: 'Active' as const,
		monitoring: true,
		lastSynced: '5 mins ago',
		requests: '180K/day',
	},
	{
		id: '5',
		name: 'static-assets',
		type: 'R2 Bucket' as const,
		status: 'Active' as const,
		monitoring: false,
		lastSynced: '12 hrs ago',
		requests: '50K ops/day',
	},
	{
		id: '6',
		name: 'session-store',
		type: 'KV Namespace' as const,
		status: 'Active' as const,
		monitoring: true,
		lastSynced: '5 mins ago',
		requests: '95K ops/day',
	},
	{
		id: '7',
		name: 'app-db',
		type: 'D1 Database' as const,
		status: 'Active' as const,
		monitoring: true,
		lastSynced: '5 mins ago',
		requests: '25K queries/day',
	},
];

export const developerTokens = [
	{
		id: '1',
		name: 'CI/CD Pipeline',
		prefix: 'fl_live_8x',
		created: 'Oct 15, 2023',
		lastUsed: '2 hours ago',
		expires: 'Never',
	},
	{
		id: '2',
		name: 'Monitoring Script',
		prefix: 'fl_live_3k',
		created: 'Oct 1, 2023',
		lastUsed: '1 day ago',
		expires: 'Dec 31, 2023',
	},
];

export const mitigationRules = [
	{
		id: '1',
		name: 'Auto Rate-Limit',
		trigger: 'Traffic rate > 10k req/min',
		action: 'Apply rate limiting',
		enabled: true,
		lastTriggered: '2 days ago',
		triggerCount: 3,
		savings: '$45.00',
	},
	{
		id: '2',
		name: 'Bot Shield',
		trigger: 'Bot traffic > 50%',
		action: 'Enable Under Attack Mode',
		enabled: true,
		lastTriggered: '1 week ago',
		triggerCount: 1,
		savings: '$120.00',
	},
	{
		id: '3',
		name: 'Cost Breaker',
		trigger: 'Hourly cost > $25',
		action: 'Pause non-critical workers',
		enabled: false,
		lastTriggered: 'Never',
		triggerCount: 0,
		savings: '$0.00',
	},
];

export const sidebarNav = {
	app: [
		{ label: 'Dashboard', href: '/dashboard', icon: 'home' },
		{ label: 'Anomalies', href: '/anomalies', icon: 'alert-triangle' },
		{ label: 'Analytics', href: '/analytics', icon: 'bar-chart' },
		{ label: 'Rules', href: '/rules', icon: 'sliders' },
		{ label: 'Alerts', href: '/notifications', icon: 'bell', badge: 3 },
		{ label: 'Billing', href: '/billing', icon: 'credit-card' },
		{ label: 'Integrations', href: '/integrations', icon: 'plug' },
		{ label: 'Inventory', href: '/inventory', icon: 'server' },
		{ label: 'Team', href: '/team', icon: 'users' },
		{ label: 'Mitigations', href: '/mitigations', icon: 'shield' },
		{ label: 'Audit', href: '/audit', icon: 'file-text' },
		{ label: 'Developer', href: '/developer', icon: 'code' },
		{ label: 'Settings', href: '/settings', icon: 'settings' },
	],
};
