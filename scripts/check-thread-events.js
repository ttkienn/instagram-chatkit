import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { normalizeDelta } from '../src/realtime/mqtt/delta-parser.js';
import { MqttListener } from '../src/realtime/mqtt/mqtt-listener.js';
import { ReconnectPolicy } from '../src/realtime/reconnect-policy.js';
import { getInstagramBootstrap } from '../src/auth/realtime-bootstrap.js';

// Constructed protocol fixtures; no private session or captured conversation data.
const thread = { thread_id: '100', thread_fbid: '200', is_group: true,
  thread_title: 'Before', users: [{ pk: '300', username: 'member' }] };
const signal = new AbortController().signal;
const bootstrap = await getInstagramBootstrap(null, { signal }, async function (options) {
  assert.equal(options.refresh, true);
  assert.equal(options.signal, signal);
  return { deviceId: 'fixture-device', actorId: '300', result: {
    data: { get_slide_mailbox_for_iris_subscription: {
      iris_inactive_subscription_uq_seq_id: '10',
      threads_by_folder: { edges: [{ node: { as_ig_direct_thread: thread } }, { node: null }] },
    } },
    extensions: { server_metadata: { request_start_time_ms: '1700000000000' } },
  } };
});
assert.equal(bootstrap.sequenceId, '10');
assert.equal(bootstrap.snapshotAtMs, 1700000000000);
assert.deepEqual(bootstrap.threads, [thread]);
const properties = [
  ['thread_title', 'After'], ['theme', { id: '123', accessibility_label: 'Blue' }],
  ['theme_data', { theme_id: '123', name: 'Blue' }],
  ['thread_theme', { id: '123' }], ['nicknames', { 300: 'Friend' }], ['nicknames/300', 'Friend'],
  ['nicknames', { nicknames: { igid: '300', nickname: 'Friend' } }],
  ['users', thread.users], ['users/0', thread.users[0]], ['participants/300', { pk: '300' }], ['is_group', false],
];
for (const prefix of ['/direct_v2/inbox/threads/100', '/direct_v2/threads/100']) {
  const whole = normalizeDelta({ op: 'replace', path: prefix, sequence: '10', value: thread });
  assert.equal(whole.type, 'threadUpdate');
  assert.equal(whole.data.nativeThreadId, '100');
  assert.equal(whole.data.property, undefined);
  assert.equal(whole.data.raw, thread);
  for (const [property, value] of properties) {
    const event = normalizeDelta({ op: 'replace', path: prefix + '/' + property, sequence: '11', value });
    assert.equal(event.type, 'threadUpdate');
    assert.equal(event.data.id, '100');
    assert.equal(event.data.threadId, '100');
    assert.equal(event.data.nativeThreadId, '100');
    assert.equal(event.data.change, 'replace');
    assert.equal(event.data.sequence, '11');
    assert.equal(event.data.property, property);
    assert.equal(event.data.raw, value);
  }
  const removed = normalizeDelta({ op: 'remove', path: prefix + '/users/0', sequence: '12' });
  assert.equal(removed.type, 'threadUpdate');
  assert.equal(removed.data.change, 'remove');
  assert.equal(removed.data.property, 'users/0');
  assert.equal(removed.data.raw, undefined);
}
const message = normalizeDelta({ op: 'add', path: '/direct_v2/threads/100/items/400', sequence: '11',
  value: { item_id: '400', user_id: '300', item_type: 'text', text: 'hello' } });
assert.equal(message.type, 'message');
assert.equal(message.data.itemId, '400');
const action = { item_id: '401', user_id: '300', item_type: 'action_log',
  action_log: { description: 'Changed the group', bold: [{ start: 0, end: 7 }] } };
const system = normalizeDelta({ op: 'add', path: '/direct_v2/threads/100/items/401', sequence: '12', value: action });
assert.equal(system.type, 'message');
assert.equal(system.data.raw, action);
assert.equal(normalizeDelta({ op: 'replace', path: '/direct_v2/threads/100/items/400/text', value: 'edited' }).type, 'messageEdit');
assert.equal(normalizeDelta({ op: 'replace', path: '/direct_v2/threads/100/last_seen_at/300',
  value: { item_id: '400', timestamp: '1000000' } }).type, 'readReceipt');
assert.notEqual(normalizeDelta({ op: 'replace', path: '/direct_v2/threads/100/participants/300/has_seen',
  value: { item_id: '400', timestamp: '1000000' } })?.type, 'threadUpdate');
assert.equal(normalizeDelta({ op: 'replace', path: '/direct_v2/threads/100/items/400/unknown', value: {} }), null);
assert.equal(normalizeDelta({ op: 'replace', path: '/direct_v2/inbox/threads/not-an-id/thread_title', value: 'bad' }), null);

const wire = new EventEmitter();
const received = [];
let connections = 0;
wire.connect = function () { queueMicrotask(function () { wire.emit('connect', {}); }); };
wire.subscribe = function (topics, options, callback) {
  callback(null, topics.map(function (topic) { return { topic, qos: 0 }; }));
};
function patch(sequence, property, value) {
  return Buffer.from(JSON.stringify([{ event: 'patch', seq_id: sequence, data: [
    { op: 'replace', path: '/direct_v2/inbox/threads/100/' + property, value },
  ] }]));
}
wire.publish = function (topic, payload, options, callback) {
  assert.equal(topic, '/ig_sub_iris');
  assert.equal(JSON.parse(payload).seq_id, connections === 1 ? 10 : 12);
  callback();
  queueMicrotask(function () {
    wire.emit('message', '/ig_message_sync', connections === 1
      ? patch('11', 'thread_title', 'After') : patch('13', 'thread_title', 'Replayed'));
    wire.emit('message', '/ig_sub_iris_response', Buffer.from('{"succeeded":true}'));
  });
};
wire.end = function (force, options, callback) { callback(); };
const listener = new MqttListener({
  session: { cookieIGS: 'sessionid=fixture; ds_user_id=300' },
  reconnectPolicy: new ReconnectPolicy({ initialDelay: 1, maxDelay: 1, jitter: 0 }),
  connect: function () { connections++; return wire; },
  async getBootstrap() {
    if (connections) return { ...bootstrap, sequenceId: '20', threads: [{ ...thread, thread_title: 'Latest snapshot' }] };
    return bootstrap;
  },
});
listener.on('event', function (event) { if (event.type === 'threadUpdate') received.push(event.data); });
try {
  await listener.start();
  assert.equal(received.length, 2);
  assert.equal(received[0].initial, true);
  assert.equal(received[0].change, 'snapshot');
  assert.equal(received[0].nativeThreadId, '100');
  assert.equal(received[0].raw.thread_title, 'Before');
  assert.equal(received[1].property, 'thread_title');
  assert.equal(received[1].sequence, '11');
  assert.equal(received[1].raw, 'After');
  wire.emit('message', '/ig_sub_iris_response', Buffer.from('{"succeeded":true}'));
  wire.emit('message', '/ig_message_sync', patch('11', 'thread_title', 'After'));
  assert.equal(received.length, 2);
  wire.emit('message', '/ig_message_sync', patch('12', 'users', [...thread.users, { pk: '301' }]));
  assert.equal(received.length, 3);
  assert.equal(received[2].property, 'users');
  assert.equal(received[2].raw[1].pk, '301');
  const reconnected = new Promise(function (resolve, reject) {
    const timeout = setTimeout(function () { reject(new Error('Fixture reconnect timed out.')); }, 2000);
    listener.on('state', function ready(state) {
      if (state.state === 'connected' && connections === 2) {
        listener.off('state', ready);
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  wire.emit('close');
  await reconnected;
  assert.equal(connections, 2);
  assert.equal(received.length, 4);
  assert.equal(received.filter(function (event) { return event.initial; }).length, 1);
  assert.equal(received[3].raw, 'Replayed');
  assert.equal(received[3].sequence, '13');
} finally {
  await listener.close();
}

const closingWire = new EventEmitter();
closingWire.connect = function () { queueMicrotask(function () { closingWire.emit('connect', {}); }); };
closingWire.subscribe = wire.subscribe;
closingWire.end = wire.end;
closingWire.publish = function (topic, payload, options, callback) {
  callback();
  queueMicrotask(function () { closingWire.emit('message', '/ig_sub_iris_response', Buffer.from('{"succeeded":true}')); });
};
const closing = new MqttListener({
  session: { cookieIGS: 'sessionid=fixture; ds_user_id=300' },
  reconnectPolicy: new ReconnectPolicy({ enabled: false }),
  connect: function () { return closingWire; },
  async getBootstrap() { return { ...bootstrap, threads: [thread, { ...thread, thread_id: '101' }] }; },
});
const states = [];
let seeds = 0;
let stopped;
closing.on('state', function (state) { states.push(state.state); });
closing.on('event', function (event) {
  if (event.data.initial) {
    seeds++;
    stopped = closing.close();
  }
});
try {
  await assert.rejects(closing.start(), { code: 'stopped' });
  await stopped;
  assert.equal(seeds, 1);
  assert.equal(states.includes('connected'), false);
  assert.equal(closing.state.state, 'stopped');
} finally {
  await closing.close();
}
console.log('Thread event checks passed (nested patches, receipts, bootstrap ordering, reconnect replay and close during seeding).');
