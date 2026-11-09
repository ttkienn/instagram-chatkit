import { InstagramClient } from 'instagram-chatkit';

async function main() {
  const client = new InstagramClient({
    cookies: process.env.IGCHAT_COOKIES,
    logger: console,
    logLevel: 'info',
  });
  let stopping = false;

  async function stop() {
    if (stopping) return;
    stopping = true;

    try {
      await client.close();
      console.log('Bot stopped.');
    } catch (error) {
      console.error('Could not stop:', error.code || 'UNKNOWN_ERROR');
      process.exitCode = 1;
    }
  }

  async function handleMessage(message) {
    if (message.text === '/ping') {
      await message.replyText('pong');
      console.log('Replied to /ping.');
    }
    if (message.text === '/help') {
      await message.replyText('Commands: /ping, /help');
      console.log('Replied to /help.');
    }
  }

  function handleEvent(event) {
    if (event.type === 'raw') return;
    if (event.type === 'threadUpdate') {
      if (event.data.initial) return;
      console.log('Group event:', event.data.nativeThreadId,
        event.data.property || 'snapshot', event.data.change);
      return;
    }
    console.log('Event:', event.type);
  }

  client.onMessage(handleMessage);
  client.on('event', handleEvent);
  client.onHandlerError(function (error) {
    console.error('Command failed:', error.cause?.code || error.code);
  });
  client.on('state', function (state) {
    if (state.state === 'connected') {
      console.log('Bot ready. Send /ping or /help from another account. Ctrl+C to stop.');
    }
    if (state.state === 'fatal' || state.state === 'auth_required') {
      process.exitCode = 1;
      stop();
    }
  });

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  try {
    await client.login();
    if (stopping) return;
    await client.connectRealtime();
  } catch (error) {
    if (!stopping) {
      console.error('Could not start:', error.code || 'UNKNOWN_ERROR');
      process.exitCode = 1;
    }

    await stop();
  }
}

main().catch(function (error) {
  console.error('Could not create the client:', error.code || 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
