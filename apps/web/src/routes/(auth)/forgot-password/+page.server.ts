import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	forgot: async ({ request, fetch }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();

		if (!email) return fail(400, { error: 'Email is required' });

		await fetch('/api/auth/forgot-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email }),
		});

		// Always show success to prevent email enumeration
		return { success: true };
	},
};
