import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkArchitecture } from './check-architecture.js';

async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (/\.[cm]?js$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit', windowsHide: true });
      if (result.status !== 0) process.exit(result.status ?? 1);
    }
  }
}
const { moduleCount } = await checkArchitecture();
console.log(`Architecture checks passed (${moduleCount} source modules).`);
for (const directory of ['src', 'examples', 'scripts']) await check(directory);
console.log('JavaScript syntax checks passed.');
