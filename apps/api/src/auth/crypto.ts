// AES-256-GCM encryption/decryption for Cloudflare API tokens.
// Uses only the Web Crypto API (crypto.subtle), which is available in the
// Cloudflare Workers runtime — no Node.js imports required.

const IV_LENGTH = 12; // 96-bit IV, standard for AES-GCM

function hexToBytes(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) {
		throw new Error('Invalid hex string: odd length');
	}
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
	}
	return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/**
 * Import a 256-bit AES-GCM key from a hex-encoded 32-byte string.
 * The key material is stored in env as TOKEN_ENCRYPTION_KEY.
 */
async function importKey(rawKey: string): Promise<CryptoKey> {
	const keyBytes = hexToBytes(rawKey);
	if (keyBytes.length !== 32) {
		throw new Error(
			`TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes); got ${keyBytes.length} bytes`,
		);
	}
	return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM', length: 256 }, false, [
		'encrypt',
		'decrypt',
	]);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * Returns a base64-encoded blob of: IV (12 bytes) || ciphertext.
 */
export async function encryptToken(plaintext: string, keyMaterial: string): Promise<string> {
	const key = await importKey(keyMaterial);

	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encoded = new TextEncoder().encode(plaintext);

	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

	// Concatenate IV + ciphertext into a single buffer
	const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), IV_LENGTH);

	return bytesToBase64(combined);
}

/**
 * Decrypt a base64-encoded AES-256-GCM blob produced by {@link encryptToken}.
 *
 * Expects: base64(IV[12] || ciphertext).
 */
export async function decryptToken(encrypted: string, keyMaterial: string): Promise<string> {
	const key = await importKey(keyMaterial);

	const combined = base64ToBytes(encrypted);
	if (combined.length <= IV_LENGTH) {
		throw new Error('Encrypted token is too short to contain a valid IV and ciphertext');
	}

	const iv = combined.slice(0, IV_LENGTH);
	const ciphertext = combined.slice(IV_LENGTH);

	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

	return new TextDecoder().decode(plaintext);
}
