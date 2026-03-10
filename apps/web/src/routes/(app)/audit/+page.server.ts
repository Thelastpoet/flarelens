import { loadAuditPage } from '$lib/server/audit.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Number(pageParam) : 1;

	return loadAuditPage(fetch, {
		page: Number.isFinite(page) && page > 0 ? page : 1,
		action: url.searchParams.get('action') ?? '',
		from: url.searchParams.get('from') ?? '',
		to: url.searchParams.get('to') ?? '',
	});
};
