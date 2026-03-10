function fail(path: string, expected: string): never {
	throw new Error(`Invalid data at ${path}: expected ${expected}`);
}

export function expectObject(value: unknown, path: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		fail(path, 'object');
	}
	return value as Record<string, unknown>;
}

export function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) {
		fail(path, 'array');
	}
	return value;
}

export function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string') {
		fail(path, 'string');
	}
	return value;
}

export function expectNullableString(value: unknown, path: string): string | null {
	if (value === null) {
		return null;
	}
	if (typeof value !== 'string') {
		fail(path, 'string | null');
	}
	return value;
}

export function expectNumber(value: unknown, path: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		fail(path, 'number');
	}
	return value;
}

export function expectNullableNumber(value: unknown, path: string): number | null {
	if (value === null) {
		return null;
	}
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		fail(path, 'number | null');
	}
	return value;
}

export function expectBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') {
		fail(path, 'boolean');
	}
	return value;
}
