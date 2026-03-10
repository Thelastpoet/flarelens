import { loadOnboardingSuccessPage } from '$lib/server/onboarding.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => loadOnboardingSuccessPage(fetch);
