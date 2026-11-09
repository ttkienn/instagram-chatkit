import assert from 'node:assert/strict';
import { ReceivedMessage } from '../src/receiving/received-message.js';
import { MessagesApi } from '../src/features/messages/messages-api.js';
import { parseIrisMessage, parseSlideMessage } from '../src/shared/message-parser.js';

const signal = new AbortController().signal;
const requests = [];
let inboxCalls = 0;
const messages = new MessagesApi({
  async graphql(document, variables, options) {
    requests.push({ variables, options });
    return { data: { xig_direct_text_send_with_slide_messaging_response: { message_id: 'mid.sent' } } };
  },
}, null, {
  async getInboxContext() {
    inboxCalls++;
    return {
      checkSession() {},
      result: { data: { get_slide_mailbox_for_iris_subscription: { threads_by_folder: {
        edges: [{ node: { as_ig_direct_thread: { thread_id: '100', thread_fbid: '200' } } }],
      } } } },
    };
  },
});
const realtimeCalls = [];
const client = {
  messages,
  realtime: { async sendText(...args) { realtimeCalls.push(args); return { itemId: 'sent-item' }; } },
};
const iris = parseIrisMessage({
  item_id: '340282366841710301244258766918846382001', user_id: '300', text: 'ping',
  message_id: 'mid.original', client_context: '1234567890123456789',
}, { nativeThreadId: '100', itemId: '340282366841710301244258766918846382001' });
assert.ok(iris);
assert.equal((await new ReceivedMessage(iris, client).replyText('pong', { signal })).itemId, 'sent-item');
assert.deepEqual(realtimeCalls.pop(), ['100', 'pong', {
  replyToId: iris.itemId, replyToClientContext: iris.clientContext, signal,
}]);
await new ReceivedMessage({ ...iris, clientContext: null }, client).replyText('pong', { signal });
assert.deepEqual(realtimeCalls.pop(), ['100', 'pong', { replyToId: iris.itemId, signal }]);
assert.equal(requests.length, 0);

const slide = parseSlideMessage({ message_id: 'mid.original', sender: { igid: '300' }, text_body: 'ping' },
  { nativeThreadId: '100', threadFbid: '200' });
assert.ok(slide);
assert.equal((await new ReceivedMessage(slide, client).replyText('pong', { signal })).messageId, 'mid.sent');
assert.equal(realtimeCalls.length, 0);
assert.equal(inboxCalls, 0);
let request = requests.pop();
assert.equal(request.variables.ig_thread_igid, '200');
assert.equal(request.variables.reply_to_message_id, 'mid.original');
assert.equal(request.options.signal, signal);

const fallback = await new ReceivedMessage({ ...slide, threadFbid: undefined }, client).replyText('pong', { signal });
assert.equal(fallback.payload.message_id, 'mid.sent');
assert.equal(fallback.payload.thread_id, '100');
request = requests.pop();
assert.equal(request.variables.ig_thread_igid, '200');
assert.equal(request.variables.reply_to_message_id, 'mid.original');
assert.equal(request.options.signal, signal);
assert.equal(inboxCalls, 1);

await messages.sendToGroup('100', 'ordinary message', { signal });
assert.equal(requests.pop().variables.reply_to_message_id, null);
const lookups = inboxCalls;
await assert.rejects(messages.sendToGroup('100', 'pong', { replyToMessageId: iris.itemId }), { code: 'VALIDATION_ERROR' });
assert.equal(inboxCalls, lookups);
assert.equal(requests.length, 0);
await assert.rejects(new ReceivedMessage({ ...iris, messageId: iris.itemId }, { messages }).replyText('pong'), { code: 'VALIDATION_ERROR' });
assert.equal(inboxCalls, lookups);
assert.equal(requests.length, 0);

const aborted = AbortSignal.abort();
await assert.rejects(new ReceivedMessage(iris, client).replyText('pong', { signal: aborted }), { name: 'AbortError' });
assert.equal(realtimeCalls.length, 0);
const signedIn = { ...client, session: { cookieIGS: 'ds_user_id=1; sessionid=old' } };
const stale = new ReceivedMessage(iris, signedIn);
signedIn.session.cookieIGS = 'ds_user_id=2; sessionid=new';
await assert.rejects(stale.replyText('pong'), { code: 'SESSION_CHANGED' });
assert.equal(realtimeCalls.length, 0);
console.log('Reply checks passed (Iris quotes, web quotes, native HTTP fallback, validation and session guards).');
