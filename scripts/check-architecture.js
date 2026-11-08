import { readdir, readFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = fileURLToPath(new URL('../src', import.meta.url));
const allowedDependencies = {
  shared: new Set(['shared']),
  transport: new Set(['transport', 'shared']),
  auth: new Set(['auth', 'transport', 'shared']),
  storage: new Set(['storage', 'shared']),
  features: new Set(['features', 'shared']),
  realtime: new Set(['realtime', 'shared']),
  receiving: new Set(['receiving', 'shared']),
  client: new Set(['client', 'auth', 'storage', 'transport', 'features', 'realtime', 'receiving', 'shared']),
  bot: new Set(['bot', 'shared']),
};

export async function inspectArchitecture(root = sourceRoot) {
  const sources = await sourceFiles(root);
  const graph = new Map(sources.map(file => [resolve(file), []]));
  const violations = [];
  const display = file => relative(root, file).split(sep).join('/');

  for (const file of sources) {
    const from = display(file);
    const zone = moduleZone(from);
    if (zone !== 'public' && !allowedDependencies[zone]) {
      violations.push(`${from}: unknown module boundary.`);
    }
    const source = await readFile(file, 'utf8');
    for (const specifier of importSpecifiers(source)) {
      if (isBuiltin(specifier)) continue;
      if (!specifier.startsWith('.')) {
        if (!['mqtt', 'ws'].includes(specifier) || !from.startsWith('realtime/mqtt/')) {
          violations.push(`${from}: external dependency ${specifier} is outside its transport boundary.`);
        }
        continue;
      }
      const target = resolve(dirname(file), specifier);
      const to = display(target);
      if (!graph.has(target)) {
        violations.push(`${from}: unresolved source import ${specifier}.`);
        continue;
      }
      graph.get(file).push(target);
      const targetZone = moduleZone(to);
      if (zone === 'public') continue;
      if (targetZone === 'public') {
        if (from !== 'bot/cli.js') violations.push(`${from}: internal modules must import their owner directly, not index.js.`);
        continue;
      }
      if (from === 'bot/config.js' && to === 'storage/private-file.js') continue;
      if (!allowedDependencies[zone]?.has(targetZone)) {
        violations.push(`${from} -> ${to}: dependency crosses the ${zone} boundary.`);
      }
      if (zone === 'features' && targetZone === 'features' && from.split('/')[1] !== to.split('/')[1] && to.endsWith('-api.js')) {
        violations.push(`${from} -> ${to}: features must share payload/media modules instead of constructing another feature API.`);
      }
    }
  }
  findCycles(graph, display, violations);
  return { moduleCount: sources.length, violations };
}

export async function checkArchitecture() {
  const result = await inspectArchitecture();
  if (result.violations.length) throw new Error(result.violations.join('\n'));
  return result;
}

function moduleZone(path) {
  if (path === 'index.js' || path === 'advanced.js') return 'public';
  if (path === 'client.js') return 'client';
  return path.split('/')[0];
}

async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.name.endsWith('.js')) files.push(path);
  }
  return files.sort();
}

function importSpecifiers(source) {
  const declarations = /^(?:import|export)\s+(?:[^;'"\n]*(?:\n[^;'"\n]*)*?\s+from\s*)?['"]([^'"\n]+)['"]/gm;
  const dynamic = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  return [...source.matchAll(declarations), ...source.matchAll(dynamic)].map(match => match[1]);
}

function findCycles(graph, display, violations) {
  const visited = new Set();
  const active = new Set();
  const stack = [];
  function visit(file) {
    if (active.has(file)) {
      const cycle = [...stack.slice(stack.indexOf(file)), file].map(display);
      violations.push(`Circular import: ${cycle.join(' -> ')}`);
      return;
    }
    if (visited.has(file)) return;
    active.add(file);
    stack.push(file);
    for (const dependency of graph.get(file)) visit(dependency);
    stack.pop();
    active.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkArchitecture().then(({ moduleCount }) => {
    console.log(`Architecture checks passed (${moduleCount} source modules).`);
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
