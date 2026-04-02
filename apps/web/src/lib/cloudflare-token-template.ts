const CLOUDFLARE_TOKEN_TEMPLATE_PERMISSIONS = [
	{ key: 'zone', type: 'read' },
	{ key: 'analytics', type: 'read' },
	{ key: 'workers_scripts', type: 'read' },
	{ key: 'workers_kv_storage', type: 'read' },
	{ key: 'd1', type: 'read' },
	{ key: 'workers_r2', type: 'read' },
] as const;

export function getCloudflareTokenTemplateUrl(name = 'FlareLens Integration'): string {
	const url = new URL('https://dash.cloudflare.com/');
	url.searchParams.set('to', '/:account/api-tokens');
	url.searchParams.set(
		'permissionGroupKeys',
		JSON.stringify(CLOUDFLARE_TOKEN_TEMPLATE_PERMISSIONS),
	);
	url.searchParams.set('name', name);
	return url.toString();
}
