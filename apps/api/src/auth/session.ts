// KV-based session management with sliding-window TTL refresh.
// Uses only the Web Crypto API (crypto.subtle / crypto.randomUUID),
// which are available in the Cloudflare Workers runtime.

import {
	SESSION_COOKIE_NAME,
	SESSION_KEY_PREFIX,
	SESSION_TTL_SECONDS,
} from '@flarelens/shared/constants';
import type { Role, SessionContext } from '@flarelens/shared/types';

// Re-export so consumers can use this module as a single import for session types.
export type { SessionContext };

export interface StoredSession {
	user_id: string;
	account_id: string;
	role: Role;
	created_at: string;
	expires_at: string;
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random session token.
 * Uses crypto.randomUUID() — available in all modern runtimes including
 * Cloudflare Workers, no external imports needed.
 */
export function generateSessionToken(): string {
	return crypto.randomUUID();
}

/**
 * Hash a session token with SHA-256 and return the hex-encoded digest.
 * The hash is used as the KV storage key so that raw tokens are never
 * persisted anywhere beyond the client cookie.
 */
export async function hashToken(token: string): Promise<string> {
	const encoded = new TextEncoder().encode(token);
	const digest = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Build the Set-Cookie header value for the session cookie.
 *
 * The `Secure` flag is omitted when the request originates from localhost so
 * that local development works over plain HTTP.  In every other environment
 * the flag is always set.
 *
 * @param token   Raw (unhashed) session token written to the cookie.
 * @param maxAge  Cookie max-age in seconds (0 clears the cookie immediately).
 * @param host    Optional hostname used to decide whether to add `Secure`.
 *                Pass `undefined` to always include `Secure` (safe default
 *                for production paths where the host is not available).
 */
export function buildSessionCookie(token: string, maxAge: number, host?: string): string {
	const isLocalhost =
		host === 'localhost' || host?.startsWith('localhost:') || host === '127.0.0.1';
	const secureFlag = isLocalhost ? '' : '; Secure';
	return `${SESSION_COOKIE_NAME}=${token}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/**
 * Build a Set-Cookie header that immediately clears the session cookie in the
 * browser by setting Max-Age=0.
 */
export function clearSessionCookie(): string {
	// Omit the Secure flag here intentionally — the browser will still clear
	// a Secure cookie when Max-Age=0 is sent, and omitting it keeps this safe
	// to call from any context without needing the request host.
	return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// ---------------------------------------------------------------------------
// KV helpers
// ---------------------------------------------------------------------------

function kvKey(tokenHash: string): string {
	return `${SESSION_KEY_PREFIX}${tokenHash}`;
}

// ---------------------------------------------------------------------------
// Public session API
// ---------------------------------------------------------------------------

/**
 * Persist a new session in KV and return the raw token plus a ready-to-use
 * Set-Cookie header value.
 *
 * @param kv      The SESSIONS KV namespace from env.
 * @param payload User/account identifiers to embed in the session.
 * @param host    Optional request hostname (forwarded to buildSessionCookie).
 */
export async function createSession(
	kv: KVNamespace,
	payload: { user_id: string; account_id: string; role: Role },
	host?: string,
): Promise<{ token: string; cookieHeader: string }> {
	const token = generateSessionToken();
	const tokenHash = await hashToken(token);

	const now = new Date();
	const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

	const stored: StoredSession = {
		user_id: payload.user_id,
		account_id: payload.account_id,
		role: payload.role,
		created_at: now.toISOString(),
		expires_at: expiresAt.toISOString(),
	};

	await kv.put(kvKey(tokenHash), JSON.stringify(stored), {
		expirationTtl: SESSION_TTL_SECONDS,
	});

	const cookieHeader = buildSessionCookie(token, SESSION_TTL_SECONDS, host);
	return { token, cookieHeader };
}

/**
 * Validate a raw session token, slide the TTL window forward, and return the
 * session context.  Returns `null` if the token is missing, malformed, or
 * expired (KV expiry acts as the authoritative expiry check).
 *
 * @param kv    The SESSIONS KV namespace from env.
 * @param token Raw session token read from the request cookie.
 */
export async function validateSession(
	kv: KVNamespace,
	token: string,
): Promise<SessionContext | null> {
	if (!token) return null;

	const tokenHash = await hashToken(token);
	const key = kvKey(tokenHash);

	const raw = await kv.get(key);
	if (!raw) return null;

	let stored: StoredSession;
	try {
		stored = JSON.parse(raw) as StoredSession;
	} catch {
		// Corrupt entry — delete and reject
		await kv.delete(key);
		return null;
	}

	// Guard: belt-and-suspenders expiry check in case KV TTL fires slightly late
	if (new Date(stored.expires_at) < new Date()) {
		await kv.delete(key);
		return null;
	}

	// Sliding window: extend TTL on every successful validation
	const newExpiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
	const refreshed: StoredSession = { ...stored, expires_at: newExpiresAt.toISOString() };
	await kv.put(key, JSON.stringify(refreshed), { expirationTtl: SESSION_TTL_SECONDS });

	return {
		user_id: stored.user_id,
		account_id: stored.account_id,
		role: stored.role,
		session_id: tokenHash,
	};
}

/**
 * Immediately delete a session from KV, invalidating the token server-side.
 *
 * @param kv    The SESSIONS KV namespace from env.
 * @param token Raw session token (from the client cookie).
 */
export async function destroySession(kv: KVNamespace, token: string): Promise<void> {
	if (!token) return;
	const tokenHash = await hashToken(token);
	await kv.delete(kvKey(tokenHash));
}
