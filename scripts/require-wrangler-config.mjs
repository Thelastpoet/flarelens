import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appDirArg = process.argv[2];

if (!appDirArg) {
	console.error('[flarelens] Missing app directory argument for Wrangler config check.');
	process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const appDir = path.resolve(repoRoot, appDirArg);
const configPath = path.join(appDir, 'wrangler.local.jsonc');
const examplePath = path.join(appDir, 'wrangler.example.jsonc');

if (!existsSync(configPath)) {
	console.error(
		`[flarelens] Missing ${path.relative(repoRoot, configPath)}. Copy ${path.relative(repoRoot, examplePath)} to wrangler.local.jsonc and replace the __YOUR_*__ placeholders with resources from your Cloudflare account.`,
	);
	process.exit(1);
}

const configText = readFileSync(configPath, 'utf8');
if (configText.includes('__YOUR_')) {
	console.error(
		`[flarelens] ${path.relative(repoRoot, configPath)} still contains template placeholders. Replace every __YOUR_*__ value before running Cloudflare commands.`,
	);
	process.exit(1);
}
