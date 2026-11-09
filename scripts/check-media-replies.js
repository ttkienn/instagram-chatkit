import assert from 'node:assert/strict';
import { MessagesApi } from '../src/features/messages/messages-api.js';
import { ReceivedMessage } from '../src/receiving/received-message.js';

const signal = new AbortController().signal;
const uploads = [];
const sends = [];
let inboxCalls = 0;
const response = { data: { xig_direct_media_send_with_slide_messaging_response: { message_id: 'mid.media' } } };
const api = new MessagesApi({
  async multipart(path, body, options) {
    assert.equal(path, '/ajax/mercury/upload.php');
    uploads.push({ body, options });
    return { payload: { metadata: { 0: { fbid: '400' } } } };
  },
  async post(path, form, options) {
    assert.equal(path, '/api/graphql');
    sends.push({ variables: JSON.parse(form.variables), options });
    return response;
  },
  async graphql(document, variables, options) { sends.push({ variables, options }); return response; },
}, null, {
  async getInboxContext() {
    inboxCalls++;
    return { form: {}, headers: {}, checkSession() {}, result: {
      data: { get_slide_mailbox_for_iris_subscription: { threads_by_folder: {
        edges: [{ node: { as_ig_direct_thread: { thread_id: '100', thread_fbid: '200' } } }],
      } } },
    } };
  },
});
const client = { messages: api };
const original = { id: 'mid.original', messageId: 'mid.original', nativeThreadId: '100', threadFbid: '200', senderId: '300' };
const message = new ReceivedMessage(original, client);
const cases = [
  ['Photo', new Uint8Array([255, 216, 255]), 'image/jpeg'],
  ['Video', new Uint8Array([1, 2, 3]), 'video/mp4'],
  ['Voice', new Uint8Array([1, 2, 3]), 'audio/mp4'],
];
for (const [kind, data, mimeType] of cases) {
  assert.equal((await message['reply' + kind](data, { mimeType, signal })).messageId, 'mid.media');
  let sent = sends.pop();
  assert.equal(sent.variables.reply_to_message_id, 'mid.original');
  assert.equal(sent.variables.thread_id, '200');
  assert.equal(sent.variables.attachment_fbid, '400');
  assert.equal(sent.options.signal, signal);
  const upload = uploads.pop();
  assert.equal(upload.body.get('farr').type, mimeType);
  assert.equal(upload.body.get('voice_clip'), kind === 'Voice' ? 'true' : null);
  assert.equal(upload.options.signal, signal);

  await api['send' + kind]('100', data, { mimeType });
  assert.equal(sends.pop().variables.reply_to_message_id, null);
  uploads.pop();
  const lookups = inboxCalls;
  await assert.rejects(api['send' + kind]('100', data, { replyToMessageId: '123' }), { code: 'VALIDATION_ERROR' });
  const irisOnly = new ReceivedMessage({ ...original, id: '123', itemId: '123', messageId: '123' }, client);
  await assert.rejects(irisOnly['reply' + kind](data), { code: 'VALIDATION_ERROR' });
  await assert.rejects(message['reply' + kind](data, { signal: AbortSignal.abort() }), { name: 'AbortError' });
  assert.equal(inboxCalls, lookups);
  assert.equal(uploads.length, 0);
  assert.equal(sends.length, 0);
}

await api.sendVoice('100', cases[2][1], { replyToMessageId: ' mid.original ' });
assert.equal(sends.pop().variables.reply_to_message_id, 'mid.original');
uploads.pop();

let resolutions = 0;
const resolveThread = async (incoming, options) => {
  resolutions++;
  assert.equal(options.signal, signal);
  return { thread_id: '100', thread_fbid: '200' };
};
await new ReceivedMessage({ ...original, nativeThreadId: undefined }, client, resolveThread).replyPhoto(cases[0][1], { signal });
assert.equal(resolutions, 1);
assert.equal(sends.pop().variables.reply_to_message_id, 'mid.original');
uploads.pop();

await message.replyAttachment({ attachmentId: '400', type: 'gif', clientContext: '567', replyToMessageId: 'mid.override', signal });
let sent = sends.pop();
assert.equal(sent.variables.reply_to_message_id, 'mid.original');
assert.equal(sent.variables.offline_threading_id, '567');
assert.equal(sent.options.signal, signal);
await new ReceivedMessage({ ...original, threadFbid: undefined }, client, resolveThread).replyAttachment({ attachmentId: '400', signal });
assert.equal(sends.pop().variables.thread_id, '200');
assert.equal(resolutions, 2);
const irisOnly = new ReceivedMessage({ ...original, id: '123', itemId: '123', messageId: '123' }, client);
await assert.rejects(irisOnly.replyAttachment({ attachmentId: '400' }), { code: 'VALIDATION_ERROR' });
await assert.rejects(message.replyAttachment({ attachmentId: '400', signal: AbortSignal.abort() }), { name: 'AbortError' });
await assert.rejects(message.replyVoice(cases[2][1], { mimeType: 'video/mp4' }), { code: 'VALIDATION_ERROR' });
assert.equal(uploads.length, 0);
assert.equal(sends.length, 0);

const signedIn = { messages: api, session: { cookieIGS: 'ds_user_id=1; sessionid=old' } };
const stale = new ReceivedMessage(original, signedIn);
signedIn.session.cookieIGS = 'ds_user_id=2; sessionid=new';
await assert.rejects(stale.replyPhoto(cases[0][1]), { code: 'SESSION_CHANGED' });
await assert.rejects(stale.replyAttachment({ attachmentId: '400' }), { code: 'SESSION_CHANGED' });
assert.equal(uploads.length, 0);
assert.equal(sends.length, 0);
console.log('Media reply checks passed (photo, video, voice, uploaded attachments and pre-upload guards).');
