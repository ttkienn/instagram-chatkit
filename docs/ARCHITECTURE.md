# Code structure

[README](https://github.com/ttkienn/instagram-chatkit#readme) · [API](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md) · **[Code structure](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/ARCHITECTURE.md)**

## Getting started

To create a bot, use the [plain function example](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js) and [receiving API](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#receive-messages-and-events). You do not need to edit the library or use the optional `SimpleBot` framework.

Clone the repository to work on the library:

```bash
git clone https://github.com/ttkienn/instagram-chatkit.git instagram-chatkit
cd instagram-chatkit
npm ci
```

Use Node.js 24 or newer. Public entry points are `instagram-chatkit`, `instagram-chatkit/bot`, and `instagram-chatkit/advanced`; app code should import those rather than internal `src/` paths.

## Files and folders

| File or folder | What it contains |
| --- | --- |
| [src/index.js](https://github.com/ttkienn/instagram-chatkit/blob/main/src/index.js) | Exports available from `instagram-chatkit` |
| [src/client.js](https://github.com/ttkienn/instagram-chatkit/blob/main/src/client.js) | The main client for login, sending, and receiving |
| [src/auth/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/auth), [src/client/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/client) | Login and connection management |
| [src/features/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/features) | API groups: messages, threads, users, media, and notes |
| [src/transport/http/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/transport/http) | Sends requests to Instagram and reads responses |
| [src/realtime/mqtt/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/realtime/mqtt) | Receives messages and reconnects after connection loss |
| [src/receiving/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/receiving) | Filters and handlers for received messages |
| [src/storage/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/storage) | Reads and saves sessions |
| [src/shared/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/shared) | Cookies, errors, input checks, and logging |
| [src/bot/](https://github.com/ttkienn/instagram-chatkit/tree/main/src/bot) | Built-in bot, imported from `instagram-chatkit/bot` |
| [types/](https://github.com/ttkienn/instagram-chatkit/tree/main/types) | TypeScript declarations |
| [examples/](https://github.com/ttkienn/instagram-chatkit/tree/main/examples) | Examples of using the library |
| [scripts/](https://github.com/ttkienn/instagram-chatkit/tree/main/scripts) | Code and package checks |

## How a message reaches your handler

1. `InstagramClient` connects `SessionManager`, `RealtimeManager`, API groups, and `MessageHandlers`.
2. Login reads browser cookies or session storage. `auth/realtime-bootstrap.js` obtains web session fields, inbox context, and the Iris sync position.
3. `realtime/mqtt/mqtt-listener.js` subscribes to Iris over MQTT, confirms sends, and manages retries. `delta-parser.js` validates patches; `shared/message-parser.js` produces message data.
4. The client emits `event` and queues supported receiving events. `receiving/message-handlers.js` creates `ReceivedMessage`, checks the account identity, awaits filters, and runs the matching handler in each group.
5. Your handler reads `message.text` and calls methods such as `message.replyText()`. Exceptions go to `onHandlerError()` with the original failure in `error.cause`.

The receiving queue is bounded and processed in order. `client.on('event', ...)` is the lower-level EventEmitter interface; it does not await or catch exceptions from your async event callbacks. Prefer `onMessage()` for command handlers. Fetching `threads.history()` returns data directly and does not replay it through the receiving queue.

## How replies are sent

`ReceivedMessage` binds a reply to its original message and checks that the client still uses the same account session:

| Reply | Path |
| --- | --- |
| `replyText()` with an Iris `itemId` | Realtime `sendText()` with the original item ID and optional client context |
| `replyText()` with a web MID | `messages.send()` or `sendToGroup()`, then the web text mutation with `reply_to_message_id` |
| `replyPhoto/replyVideo/replyVoice()` | Validate the original web MID, resolve the thread, upload through Mercury, then send the web media mutation with `reply_to_message_id` |
| `replyAttachment()` | Send an existing upload ID with the original web MID |

Iris item IDs, web MIDs, Direct thread IDs, and messaging FBIDs are distinct. A media reply requires a real web MID; an Iris-only event is rejected before upload. No reply method silently replaces a missing quote with a plain send. See [ID types](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#id-types).

`features/messages/` owns payloads, upload validation, and confirmation checks. `features/threads/thread-identifiers.js` maps Direct IDs to messaging FBIDs using actual inbox data. `transport/http/` owns cookies, request cancellation, provider errors, and response parsing. A missing delivery confirmation must not trigger an automatic resend.

## Logs and shutdown

Pass `{ logger: console, logLevel: 'info' }` to enable lifecycle, reconnect, request failure, and handler failure records. `shared/logger.js` selects safe metadata and omits cookies, tokens, raw payloads, and message text. `debug` also includes successful HTTP requests and receiving event types. Applications can use a callback instead of `console` without changing the transport or receiving modules.

`disconnectRealtime()` stops the listener while keeping the HTTP session. `waitForHandlers()` waits for already queued handlers. `close()` closes receiving, HTTP, and realtime; it drops queued handlers rather than draining them. For a planned drain, disconnect realtime, wait for handlers, then close. `logout()` separately clears the local session and its storage.

## Making changes

Edit the matching group in `src/features/`, then update its declarations in `types/`. For example, message sending lives in `features/messages/`, and chat management lives in `features/threads/`.

Keep setup and coordination in `src/client/`, parsing and wire behavior in their owning modules, and optional bot commands in `src/bot/`. Internal modules import their owners directly, rather than importing `src/index.js`. API groups share payload/media helpers rather than constructing another group's API class. `scripts/check-architecture.js` checks these boundaries, unresolved imports, and circular dependencies.

## Checks

```bash
npm run verify
```

| Command | Checks |
| --- | --- |
| `npm run check` | Module boundaries, JavaScript syntax, text reply checks, and media reply checks |
| `npm run check:types` | TypeScript consumer fixture against public declarations |
| `npm run check:package` | Packed file list, fresh tarball installation, public imports, and runtime/TypeScript consumer checks |

`verify` runs all three and writes the checked package to `artifacts/`. These checks use fixtures and mocked requests; they do not log in or prove that Instagram's current endpoints accept a live request.
