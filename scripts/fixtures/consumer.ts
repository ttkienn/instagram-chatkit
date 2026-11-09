import {
  InstagramClient, SessionStorage, ReconnectPolicy, filters,
  type SessionSnapshot, type InstagramEvent, type LogRecord, type Logger,
} from 'instagram-chatkit';
import { HttpTransport, MqttListener, parseSession } from 'instagram-chatkit/advanced';
import { SimpleBot, type BotCommand } from 'instagram-chatkit/bot';

const logger: Logger = { info(record) { const entry: LogRecord = record; void entry; } };
const client = new InstagramClient({ storage: new SessionStorage('.state/session.json'), logger, logLevel: 'debug' });
const signal = new AbortController().signal;

async function useClient() {
  await client.login({ signal });
  const snapshot: SessionSnapshot = await client.saveSession();
  await client.loadSession(snapshot);
  await client.account.currentUser({ signal });
  await client.users.infoByUsername('username', { signal });
  await client.search.all('coffee', { signal });
  const sent = await client.messages.send('123', 'hello', { signal });
  const messageId: string = sent.messageId;
  await client.messages.sendToGroup('123', 'reply', { replyToMessageId: messageId, signal });
  await client.messages.sendPhoto('123', new Uint8Array([255, 216, 255]), { mimeType: 'image/jpeg', signal });
  await client.messages.sendVoice('123', new Uint8Array([1]), { replyToMessageId: messageId, signal });
  await client.messages.sendVideo('123', new Uint8Array([1]), { replyToMessageId: messageId, signal });
  await client.threads.history('123', { limit: 10, signal });
  await client.media.info('123', { signal });
  const realtime = await client.connectRealtime({ reconnectPolicy: new ReconnectPolicy({ maxAttempts: 2 }) });
  await realtime.indicateTyping('123', true, { signal });
  await client.close();
  return messageId;
}

client.on('event', event => { const update: InstagramEvent = event; void update; });
const unsubscribe = client.onMessage(filters.all(filters.text, filters.incoming), async (message, owner) => {
  const text: string = message.text;
  const sameClient: InstagramClient = owner;
  await message.replyText(text);
  await message.replyPhoto(new Uint8Array([255, 216, 255]), { mimeType: 'image/jpeg', signal });
  await message.replyVideo(new Uint8Array([1]), { mimeType: 'video/mp4', signal });
  await message.replyVoice(new Uint8Array([1]), { mimeType: 'audio/mp4', signal });
  await message.replyAttachment({ attachmentId: '123', type: 'gif', signal });
  void sameClient;
}, { group: 1 });
client.onHandlerError(error => { const code: string = error.code; void code; });
unsubscribe();
const bot = new SimpleBot({ client, admins: ['123'] });
const command: BotCommand = { name: 'custom', usage: 'custom', admin: true, run: async context => context.reply('hello') };
bot.commands.set('custom', command);
const transport = new HttpTransport({ cookies: 'sessionid=fake', timeoutMs: 1000, logger: record => { const entry: LogRecord = record; void entry; } });
new InstagramClient({ logger: console, logLevel: 'warn' });
new InstagramClient({ logger: false });
const listener = new MqttListener({
  session: parseSession('integration supplied HTML', 'sessionid=fake'),
  getBootstrap: async () => ({ sequenceId: '1', snapshotAtMs: 1700000000000, deviceId: 'web-device', actorId: '123' }),
});
void [useClient, transport, listener];
