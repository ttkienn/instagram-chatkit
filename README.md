<div align="center">
  <img src="https://raw.githubusercontent.com/ttkienn/instagram-chatkit/main/assets/instagram-chatkit.png" alt="instagram-chatkit" width="900">
  <h1>instagram-chatkit</h1>
  <p>Send and receive Instagram messages with Node.js using browser cookies.</p>
  <p>
    <a href="https://www.npmjs.com/package/instagram-chatkit"><img src="https://img.shields.io/badge/npm-instagram--chatkit-CB3837?logo=npm&amp;logoColor=white" alt="npm: instagram-chatkit"></a>
    <img src="https://img.shields.io/badge/Node.js-24%2B-339933?logo=nodedotjs&amp;logoColor=white" alt="Node.js 24 or later">
    <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-333333" alt="MIT license"></a>
  </p>
  <p>
    <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md">API</a> ·
    <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js">Examples</a> ·
    <a href="https://github.com/ttkienn/instagram-chatkit">GitHub</a> ·
    <a href="https://github.com/ttkienn/instagram-chatkit/issues">Report an issue</a>
  </p>
  <p>
    <strong>English</strong> · <a href="https://github.com/ttkienn/instagram-chatkit/blob/main/README.vi.md">Tiếng Việt</a>
  </p>
</div>

---

## Install

Requires Node.js 24 or later.

```bash
npm install instagram-chatkit
```

## Get your cookies

In Chrome or Edge, log in to [Instagram](https://www.instagram.com), press F12, open **Network**, and reload the page. Select a request to `www.instagram.com` → **Headers → Request Headers → cookie**, right-click the value, and choose **Copy value**. Paste the full string into `IGCHAT_COOKIES` in `.env`:

```dotenv
IGCHAT_COOKIES="sessionid=...; csrftoken=...; ds_user_id=..."
```

## Your first bot

Save this as `bot.mjs`:

```js
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
```

Run it, wait for `Bot ready`, then send `/ping` or `/help` from another account:

```bash
node --env-file=.env bot.mjs
```

Press Ctrl+C to stop. This is the same code as [examples/receive-message.js](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js); no bot framework or extra dependency is needed.

`logger: console` prints login, connection state, reconnect attempts, request failures, and handler errors. Records include safe metadata such as `event`, `code`, and HTTP status; they do not include cookies or message contents. `Command failed` prints the underlying reply error code. The bot closes on startup failure, Ctrl+C, or a terminal connection state.

To change a reply, edit the strings in `handleMessage`. Add another `if` for a new command. `replyText` quotes the received message. Media replies such as `replyPhoto`, `replyVideo`, and `replyVoice` also need the original web MID; see [reply examples and limits](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md).

`handleEvent` catches SDK events through `client.on('event', ...)`. For `threadUpdate`, the log shows the thread, changed field, and patch operation. Typical fields are `thread_title` (name), `theme`/`theme_data` (theme), `nicknames` (nicknames), and `users` (members). Raw patches and initial snapshots are skipped in this log. To distinguish a join from a leave, store the initial members and compare later lists; `add/replace/remove` describe patch operations, not member actions. See [group changes](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#group-changes) for `onThreadUpdate()` and baseline handling. These metadata patches and initial snapshots require version 3.2.1 or newer.

## Documentation

| Need | Read |
| --- | --- |
| Sending, receiving, media, and filters | [API reference](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md) |
| Try sending or receiving messages | [Send](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/send-message.js) · [Receive](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js) |
| Run the built-in bot | [Bot example](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/optional/bot.js) |
| Work on the library | [Code structure](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/ARCHITECTURE.md) |

## Notes

- Keep cookies, `.env`, and saved sessions out of Git.
- Posting to your feed, using Stories/Highlights/Live, and adding captions to image messages are not supported yet.
- If you get `DELIVERY_UNKNOWN`, check the chat before sending again to avoid duplicates.

## Author

<table>
  <tr>
    <td align="center" width="100">
      <a href="https://github.com/ttkienn">
        <img src="https://github.com/ttkienn.png?size=160" alt="Thiệu Trung Kiên's GitHub avatar" width="80" height="80">
      </a>
    </td>
    <td>
      <strong>Thiệu Trung Kiên</strong><br>
      <a href="https://www.facebook.com/ttkiennn">Facebook</a> ·
      <a href="https://github.com/ttkienn">GitHub</a> ·
      <a href="https://www.npmjs.com/~thieutrungkien2">npm</a>
    </td>
  </tr>
</table>

## Donate

<p align="center">
  <img src="https://raw.githubusercontent.com/ttkienn/instagram-chatkit/main/assets/donate-mbbank.png" alt="MB Bank donation QR for account 543888999" width="240"><br>
  <strong>MB Bank · 543888999</strong>
</p>

Scan with your banking app and enter the amount you want to send.

## License

[MIT](https://github.com/ttkienn/instagram-chatkit/blob/main/LICENSE). Third-party licenses and attribution are included in [LICENSE](https://github.com/ttkienn/instagram-chatkit/blob/main/LICENSE).
