import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [, , fileArg, ...bindingNames] = process.argv;

if (!fileArg || bindingNames.length === 0) {
	console.error('[flarelens] Usage: node scripts/scrub-worker-types.mjs <file> <binding> [binding...]');
	process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);
let fileText = readFileSync(filePath, 'utf8');
let changed = false;

for (const bindingName of bindingNames) {
	const escapedName = bindingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const patterns = [
		new RegExp(`(\\b${escapedName}:\\s*)"[^"]*";`, 'g'),
		new RegExp(`(\\b${escapedName}:\\s*)'[^']*';`, 'g'),
	];

	for (const pattern of patterns) {
		const nextText = fileText.replace(pattern, '$1string;');
		if (nextText !== fileText) {
			fileText = nextText;
			changed = true;
		}
	}
}

if (changed) {
	writeFileSync(filePath, fileText);
}
