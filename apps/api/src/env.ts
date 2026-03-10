export interface Env {
	// D1 Database
	DB: D1Database;

	// KV Namespaces
	SESSIONS: KVNamespace;
	CACHE: KVNamespace;

	// Queues (producers)
	ALERT_DISPATCH_QUEUE: Queue;
	ANOMALY_CHECK_QUEUE: Queue;

	// Durable Objects
	LIVE_FEED: DurableObjectNamespace;

	// Environment
	ENVIRONMENT: string;
	WEB_URL: string;
	API_URL: string;

	// Secrets (set via `wrangler secret put`)
	TOKEN_ENCRYPTION_KEY: string; // AES-256-GCM key as a 64-character hex string
	RESEND_API_KEY: string; // Resend email API key

	// OAuth (optional)
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
}
