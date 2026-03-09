export interface AuthUser {
	id: string;
	email: string;
	name: string;
	avatar_url: string | null;
	email_verified: boolean;
	account: {
		id: string;
		name: string;
		plan: 'free' | 'pro' | 'enterprise';
	};
	role: 'admin' | 'editor' | 'viewer';
}

function createAuthStore() {
	let user = $state<AuthUser | null>(null);
	let loading = $state(false);
	let initialized = $state(false);

	return {
		get user() {
			return user;
		},
		get loading() {
			return loading;
		},
		get initialized() {
			return initialized;
		},
		get isAuthenticated() {
			return user !== null;
		},

		setUser(u: AuthUser | null) {
			user = u;
		},
		setLoading(l: boolean) {
			loading = l;
		},
		setInitialized(i: boolean) {
			initialized = i;
		},

		async logout() {
			try {
				await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
			} finally {
				user = null;
			}
		},
	};
}

export const authStore = createAuthStore();
