import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const npm = process.env.npm_execpath;
assert.ok(npm, 'Run this check with npm run check:package.');
const temporaryRoot = resolve(tmpdir());
const directory = await mkdtemp(join(temporaryRoot, 'igchat-package-'));
const run = (command, args, cwd = directory) => execute(command, args, {
  cwd, windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024,
});

try {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'instagram-chatkit');
  const { stdout } = await run(process.execPath, [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', directory], root);
  const [packed] = JSON.parse(stdout);
  assert.equal(packed.name, manifest.name);
  assert.equal(packed.filename, `instagram-chatkit-${manifest.version}.tgz`);
  const names = packed.files.map(file => file.path);
  for (const entry of [
    'src/index.js', 'types/index.d.ts', 'types/bot.d.ts', 'types/advanced.d.ts',
    'docs/DOCS.md', 'docs/ARCHITECTURE.md', 'examples/receive-message.js',
    'scripts/set-private-permissions.ps1',
    'licenses/THIRD_PARTY_NOTICES.txt', 'licenses/igchat-v2.txt', 'LICENSE',
  ]) {
    assert.ok(names.includes(entry), `Missing package file: ${entry}`);
  }
  for (const name of names) {
    assert.ok(!/^docs\/(?:API|COMPATIBILITY|MIGRATION|PUBLISHING|guide-[^/]+)\.md$/.test(name), `Old documentation in package: ${name}`);
    assert.ok(!/(^|\/)(node_modules|test|\.state|build|\.git)(\/|$)|(^|\/)\.env(?:\.|$)|(^|\/)config\.json$|\.(?:db|sqlite|log|tgz)$/.test(name), `Unwanted package file: ${name}`);
    assert.ok(!/bridge|e2ee|scripts\/patches/i.test(name), `Removed integration in package: ${name}`);
    assert.ok(!/transport\/mobile|mobile-session|auth\/(?:password-login|login-request)|password-encryption|publish-input|upload-payloads/.test(name), `Removed native integration in package: ${name}`);
  }
  const consumer = join(directory, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'igchat-consumer-check', private: true, type: 'module' }));
  await run(process.execPath, [npm, 'install', join(directory, packed.filename), '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'], consumer);
  await copyFile(join(root, 'scripts/fixtures/consumer.ts'), join(consumer, 'consumer.ts'));
  await writeFile(join(consumer, 'smoke.mjs'), `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { InstagramClient, SessionStorage, filters } from 'instagram-chatkit';
import { SimpleBot } from 'instagram-chatkit/bot';
import * as advanced from 'instagram-chatkit/advanced';
const { parseCookies } = advanced;
const logs = [];
const require = createRequire(import.meta.url);
assert.equal(require('instagram-chatkit/package.json').name, 'instagram-chatkit');
assert.equal(require('instagram-chatkit').InstagramClient, InstagramClient);
assert.equal(typeof SimpleBot, 'function');
assert.equal(typeof filters.all, 'function');
assert.equal(new SessionStorage().format, 'snapshot');
assert.equal(parseCookies('ds_user_id=123').get('ds_user_id'), '123');
let calls = 0;
const client = new InstagramClient({
  cookies: 'sessionid=fake; ds_user_id=123; csrftoken=csrf',
  logger: record => logs.push(record), logLevel: 'debug',
  fetch: async (url, options) => {
    calls++;
    assert.equal(url.hostname, 'www.instagram.com');
    assert.equal(options.headers.has('authorization'), false);
    if (url.pathname === '/direct/inbox/') {
      const define = [
        ['DTSGInitialData', [], { token: 'fake-dtsg' }], ['LSD', [], { token: 'fake-lsd' }],
        ['SiteData', [], { client_revision: '123' }],
        ['IGDMqttWebDeviceID', [], { clientId: '00000000-0000-4000-8000-000000000001' }],
        ['PolarisViewer', [], { data: { fbid: '999', id: '123', username: 'test' } }],
      ];
      return new Response('<script type="application/json">' + JSON.stringify({ define }) + '</script>');
    }
    const friendlyName = options.body.get('fb_api_req_friendly_name');
    if (friendlyName === 'PolarisDirectInboxQuery') return new Response(JSON.stringify({ data: { get_slide_mailbox_for_iris_subscription: { iris_inactive_subscription_uq_seq_id: '1' } } }));
    assert.equal(friendlyName, 'PolarisSearchBoxRefetchableQuery');
    return new Response(JSON.stringify({ data: { xdt_api__v1__fbsearch__topsearch_connection: { users: [], hashtags: [], places: [] } } }));
  },
});
assert.equal(calls, 0);
assert.equal(client.mobile, undefined);
assert.equal(typeof client.onMessage, 'function');
assert.equal(typeof client.messages.sendVoice, 'function');
assert.equal(typeof client.media.download, 'function');
let received = 0;
const removeHandler = client.onMessage(filters.text, message => { assert.equal(message.text, 'fixture'); received++; });
client.emit('event', { type: 'message', data: { id: '1', senderId: '456', nativeThreadId: '123', text: 'fixture' } });
await client.waitForHandlers();
assert.equal(received, 1);
removeHandler();
assert.equal(client.bridge, undefined);
assert.equal(advanced.BridgeClient, undefined);
assert.equal(advanced.BridgeActions, undefined);
assert.equal(advanced.loginWithPassword, undefined);
await assert.rejects(client.connectRealtime({ transport: 'e2ee' }), { code: 'VALIDATION_ERROR' });
assert.deepEqual(await client.users.search('someone'), []);
assert.equal(calls, 3);
const storage = new SessionStorage('./private-session.json');
await storage.save(await client.saveSession());
assert.deepEqual(await client.saveSession(), { version: 2, cookies: 'sessionid=fake; ds_user_id=123; csrftoken=csrf' });
const restored = new InstagramClient();
await restored.loadSession(await storage.load());
assert.equal(restored.isLoggedIn(), true);
await restored.close();
await storage.clear();
assert.equal(await storage.load(), null);
await client.close();
assert.ok(logs.some(record => record.event === 'http.requestCompleted' && record.level === 'debug' && record.status === 200));
assert.ok(logs.some(record => record.event === 'receiving.updateReceived'));
assert.ok(logs.some(record => record.event === 'client.closed'));
for (const record of logs) {
  assert.ok(Number.isFinite(Date.parse(record.time)));
  assert.ok(['debug', 'info', 'warn', 'error'].includes(record.level));
  assert.ok(Object.keys(record).every(key => ['time', 'level', 'event', 'method', 'status', 'code', 'retryable', 'durationMs', 'state', 'attempt', 'nextRetryIn', 'updateType', 'group'].includes(key)));
}
assert.doesNotMatch(JSON.stringify(logs), /fake-dtsg|fake-lsd|sessionid|csrftoken|fixture|someone/);
const failures = [];
const failedHttp = new advanced.HttpTransport({
  cookies: 'sessionid=SECRET_COOKIE', logger: record => failures.push(record),
  fetch: async () => new Response(JSON.stringify({ status: 'fail', message: 'SECRET_BODY' })),
});
await assert.rejects(failedHttp.get('/api/v1/example/SECRET_PATH/', { query: { token: 'SECRET_QUERY' } }), { code: 'PROVIDER_ERROR' });
assert.equal(failures.length, 1);
assert.equal(failures[0].event, 'http.requestFailed');
assert.equal(failures[0].code, 'PROVIDER_ERROR');
assert.doesNotMatch(JSON.stringify(failures), /SECRET/);
failedHttp.close();
const brokenLogger = new InstagramClient({ logger: async () => { throw new Error('SECRET_LOGGER'); } });
await brokenLogger.close();
const throwingLogger = new InstagramClient({ logger: { info() { throw new Error('SECRET_LOGGER'); } } });
await throwingLogger.close();
await new Promise(resolve => setImmediate(resolve));
let nestedLogin;
let loginRequests = 0;
const reentrant = new InstagramClient({
  cookies: 'sessionid=fake; ds_user_id=123; csrftoken=csrf',
  logger: record => { if (record.event === 'session.loginStarted') nestedLogin = reentrant.login(); },
  fetch: async () => {
    loginRequests++;
    return new Response('"csrf_token":"csrf" "viewerId":"123" "session_id":"fake" "client_revision":12345,');
  },
});
const login = reentrant.login();
assert.equal(nestedLogin, login);
await login;
assert.equal(loginRequests, 1);
await reentrant.close();
await assert.rejects(import('instagram-chatkit/src/client.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
console.log('Installed tarball: ESM, Node 24 require, bot, advanced, logging, domain request and private session storage passed.');
`);
  const runtime = await run(process.execPath, ['smoke.mjs'], consumer);
  process.stdout.write(runtime.stdout);
  await run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--strict', '--noEmit', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2023', '--lib', 'ES2023,DOM', 'consumer.ts'], consumer);
  const artifacts = join(root, 'artifacts');
  await mkdir(artifacts, { recursive: true });
  const output = join(artifacts, packed.filename);
  await copyFile(join(directory, packed.filename), output);
  console.log(`Installed tarball TypeScript check passed (${names.length} packed files).`);
  console.log(`Package: ${output}`);
} catch (error) {
  process.stderr.write(error.stdout ?? '');
  process.stderr.write(error.stderr ?? '');
  throw error;
} finally {
  assert.equal(dirname(resolve(directory)), temporaryRoot);
  assert.ok(resolve(directory).startsWith(`${temporaryRoot}${sep}igchat-package-`));
  await rm(directory, { recursive: true, force: true });
}
