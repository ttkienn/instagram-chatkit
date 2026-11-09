# instagram-chatkit API

[README](https://github.com/ttkienn/instagram-chatkit#readme) · **[API](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md)** · [Code structure](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/ARCHITECTURE.md)

Requires Node.js 24 or newer. See the [README](https://github.com/ttkienn/instagram-chatkit#readme) to install and log in, and [package.json](https://github.com/ttkienn/instagram-chatkit/blob/main/package.json) for the package version. In the tables, `options?` means optional; methods that send requests usually accept `{ signal }` to cancel the operation.

| Messages | Content | Handling |
| --- | --- | --- |
| [Send](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#send-messages) · [Receive](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#receive-messages-and-events) | [Media](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#media) · [Threads](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#threads) | [Filters](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#filters) · [Errors](https://github.com/ttkienn/instagram-chatkit/blob/main/docs/DOCS.md#errors) |

## Client

| Method | Purpose |
| --- | --- |
| `new InstagramClient(options)` | Create a client without logging in |
| `login(options?)`, `InstagramClient.connect(options)` | Log in; the second method also creates the client |
| `isLoggedIn()`, `isSessionValid(options?)` | Check cookies locally / check the session with Instagram |
| `saveSession()`, `loadSession(data)` | Export/load login data as `{ version: 2, cookies }` |
| `saveSessionToFile(path)`, `loadSessionFromFile(path)` | Save/load a file; loading returns `false` if the file is missing |
| `connectRealtime(options?)`, `disconnectRealtime()` | Open/close MQTT while keeping the HTTP session |
| `logout(options?)` | Clear cookies, session storage, and connections; does not revoke the session on Instagram |
| `close()` | Cancel pending requests and close the client; this client cannot be reused |

Common options: `cookies`, `storage`, `timeoutMs`, `receiving`, `logger`, `logLevel`. See the [API declarations](https://github.com/ttkienn/instagram-chatkit/blob/main/types/index.d.ts) for parameter details.

`SessionStorage(path)` saves login data to a file, defaulting to `.state/session.json`. `FileSessionStorage(path, { key: 'cookies' })` uses an existing configuration file. `EnvSessionStorage('IGCHAT_COOKIES')` only changes the running process's environment variable, not the `.env` file.

## ID types

Keep IDs as strings. Do not convert them to `Number`.

| Name | Meaning |
| --- | --- |
| `userPk` | Instagram account ID |
| `userFbid` | User ID in the messaging system |
| `nativeThreadId`, `threadId` | Direct/Iris conversation ID |
| `threadFbid` | Thread ID used by web Direct; the `id` returned by `threads.inbox()` |
| `itemId` | Iris message ID |
| `messageId`, web MID | Web message ID, used to edit, unsend, or react |

These IDs are not interchangeable. Do not infer an FBID from a Direct thread ID's length. `cursor/next_max_id` identifies the next page; use the exact value returned by the method.

## Send messages

| Method | Input |
| --- | --- |
| `messages.send(threadFbid, text, options?)` | Messaging FBID; options include `replyToMessageId/replyToUserId` to quote a message |
| `messages.edit(threadFbid, messageId, text, options?)` | Messaging FBID and web MID |
| `messages.unsend(threadFbid, messageId, options?)` | Messaging FBID and web MID |
| `messages.react(threadFbid, messageId, emoji, options?)` | Web MID; use `remove: true` to remove a reaction |
| `messages.sendToUser(username, text, options?)` | Find the exact username; may open a new DM |
| `messages.sendToGroup(nativeThreadId, text, options?)` | Direct thread ID; also works for DMs; accepts `replyToMessageId` to quote a web MID |
| `messages.markSeen/deleteItem(nativeThreadId, messageId, options?)` | Mark as read/unsend; requires a web MID |
| `messages.broadcast(options)` | `item: 'text'`, `form: { text }`, and exactly one of `threadIds/userIds` |

`send()` returns `{ messageId, offlineThreadingId }`; sending by username/thread returns an object containing `payload.message_id`. Broadcast accepts one thread or one list of user PKs per call.

The object returned by `connectRealtime()` accepts **Direct thread IDs**:

| Method | Purpose |
| --- | --- |
| `sendText(nativeThreadId, text, options?)` | Send text; options include `replyToId/replyToClientContext/clientContext` |
| `sendLike(nativeThreadId, options?)` | Send a heart |
| `sendMediaShare(nativeThreadId, mediaId, options?)` | Share a post; use `isClip: true` for a reel |
| `indicateTyping(nativeThreadId, active, options?)` | Turn the typing indicator on/off; it does not turn off automatically |

Send methods wait for confirmation from Instagram and return a message ID. If you supply `clientContext`, use a string containing a positive integer. On `DELIVERY_UNKNOWN`, check the conversation before sending again.

## Receive messages and events

Start with [examples/receive-message.js](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js) for a complete bot with cookies from `.env`, console logs, startup error handling, and Ctrl+C cleanup. A command handler is a regular function with `if` statements:

```js
import { filters } from 'instagram-chatkit';

async function handleMessage(message) {
  if (message.text === '/ping') {
    await message.replyText('Pong!');
  }

  if (message.text === '/help') {
    await message.replyText('Commands: /ping, /help');
  }
}

client.onMessage(filters.incoming, handleMessage);
await client.connectRealtime();
```

Register handlers before connecting. `connectRealtime()` logs in if needed and resolves after the Iris subscription is ready. Test from another Instagram account: `filters.incoming` skips the bot's own messages.

Registration methods accept `(handler, options?)` or `(filter, handler, options?)`. Handlers receive `(data, client)` and may be async. Registration returns a function that removes the handler.

| Method | Receives |
| --- | --- |
| `onMessage/onMessageEdit/onMessageDelete` | New/edited/unsent messages |
| `onThreadUpdate/onUnseenCount/onRawDelta` | Thread changes/unseen counts/Iris data |
| `onHandlerError(handler)` | Errors from filters or handlers |
| `waitForHandlers()` | Wait for already received, queued data to finish processing |

Options include `group`, defaulting to 0. For each event, only the first matching handler in each group runs, ordered by ascending group number and then registration order. Use different groups to let multiple handlers receive the same message.

Your own messages are included by default; use `filters.incoming` or `receiving: { receiveOwnMessages: false }` to skip them. Events and their handlers run in order, so a long-running handler delays later messages. The default queue size is 1000, with at most 256 registered handlers. When the queue is full, new data is dropped and `HANDLER_QUEUE_FULL` is reported.

### Message data

A message may include `text/senderId/nativeThreadId/threadFbid/itemId/messageId/fromMe/isGroup/attachments/raw`. Methods on the message:

| Method | Purpose |
| --- | --- |
| `replyText(text, options?)`, `getThread(options?)` | Reply quoting this message / get thread details |
| `replyPhoto/replyVideo/replyVoice(bytes, options?)` | Reply with JPEG/PNG, video, or voice, quoting this message; accepts `mimeType/signal` |
| `replyAttachment(options)` | Quote this message with an uploaded attachment; accepts the same options as `messages.sendAttachment()` except `replyToMessageId` |
| `markSeen(options?)`, `react(emoji, options?)` | Require a real web MID; react accepts `remove: true` to remove the reaction |
| `downloadMedia(options?)` | Download from an available URL; does not search history for one |

`replyText()` uses the original Iris item ID over realtime, or a real web MID over HTTP. If the required ID is unavailable, it rejects the call instead of sending an unquoted message. `messageId` may be a fallback item ID; methods that require a MID reject the call until a real web MID is available. After cookies or accounts change, methods on old messages report `SESSION_CHANGED`.

Media replies require a real web MID on the original message. Iris events containing only an item ID cannot be used for media replies; these methods reject before uploading. The quoted message may itself contain text, a photo, video, or voice.

```js
await message.replyPhoto(jpegBytes);
await message.replyVideo(mp4Bytes);
await message.replyVoice(m4aBytes);
await message.replyAttachment({ attachmentId: uploaded.uploadId, type: 'image' });
```

### Connection events

`client.on('state', handler)` receives `state/attempt/nextRetryIn/reason`. `client.on('listenerError', handler)` receives connection errors. `client.on('event', handler)` receives `{ type, data }`, including messages, reactions, readReceipt, and thread changes when Iris sends them. Use `onMessage/onHandlerError` to have the library catch errors from async handlers.

| State | Meaning |
| --- | --- |
| `starting` | Connecting and subscribing to Iris |
| `connected` | Ready to receive events and send realtime messages |
| `reconnecting` | A retryable connection failure; `nextRetryIn` is the wait in milliseconds |
| `auth_required` | Authentication failed; renew browser cookies before reconnecting |
| `fatal` | Connection stopped after a nonretryable failure or the retry limit |
| `stopped` | Realtime was closed |

Reconnect is enabled by default for retryable failures. Avoid starting another connection on every `reconnecting` event. After `fatal` or `auth_required`, call `disconnectRealtime()` before starting a fresh listener; update expired cookies first.

### Group changes

`onThreadUpdate()` receives whole-thread snapshots and individual metadata patches from both Iris thread paths. `nativeThreadId` identifies the conversation, `change` is the patch operation, `property` is the relative field path for a partial update, and `raw` contains its value. Removals may have no value. Message items and read receipts remain separate events.

```js
client.onThreadUpdate(function (update) {
  if (update.initial) return;
  console.log('Thread changed:', update.nativeThreadId, update.property, update.change);
});
```

On the first successful connection, inbox metadata is emitted with `initial: true` and `change: 'snapshot'` before buffered changes. Use these snapshots as a baseline; do not announce them as new members or group changes. The listener preserves the existing baseline on automatic reconnect and replays subsequent changes. A whole member list with no earlier baseline cannot identify who just joined or left.

Applications can compare these fields with the baseline to produce name/theme, nickname, and membership notifications. Actors may be missing from metadata patches; do not treat an absent actor as the bot or another member.

### Stop the bot

Use `await client.close()` on Ctrl+C or startup failure. Closing is idempotent, cancels HTTP/realtime work, and clears queued handlers; it does not log out or erase saved cookies. For a planned shutdown that finishes queued handlers, first `await client.disconnectRealtime()`, then `await client.waitForHandlers()`, then `await client.close()`. Create a new client after closing.

## Filters

| Filter | Matches |
| --- | --- |
| `text/photo/video/voice/gif/link/like/reel/post/media` | Content type |
| `self/me/incoming` | Your own messages / messages from others |
| `private/group` | DMs/groups; may make an HTTP request to determine the type |
| `chat(threadId)`, `fromUser(userPk)` | Thread/sender |
| `regex(pattern, flags?)` | Text matching the pattern |
| `command(nameOrNames, options?)` | Command names; defaults to prefix `/` and is case-insensitive |
| `all(...filters)`, `any(...filters)`, `not(filter)` | All/any/inverted conditions |
| `create(predicate)` | Your own function returning true/false; may be async |

The library awaits async filters. If you call a combined filter outside a registration method, use `await`.

## Media

```js
import { readFile } from 'node:fs/promises';

const image = await readFile('./photo.jpg');
await client.messages.sendPhoto(nativeThreadId, image, {
  mimeType: 'image/jpeg',
});
```

| Method | Purpose |
| --- | --- |
| `messages.sendPhoto/sendVideo/sendVoice(nativeThreadId, bytes, options?)` | Send JPEG/PNG, video, or voice; default MIME types are `image/jpeg`, `video/mp4`, `audio/mp4`; accepts `replyToMessageId` to quote a web MID |
| `messages.sendImageToUser(username, path, options?)` | Send an image file to a DM |
| `messages.sendVideoToUser(username, path, options?)` | Send a video; options include `durationMs/width/height/clientContext` |
| `messages.upload(bytes, options?)` | Upload a file and return `{ uploadId, mediaType }`; options include `mimeType/voice` |
| `messages.sendAttachment(threadFbid, options)` | `attachmentId: uploadId`, `type: 'image'/'video'/'audio'/'gif'/'file'`; accepts `replyToMessageId/clientContext` |
| `media.info/like/unlike/likers(target, options?)` | Get details/like/unlike/list users who liked it |
| `media.comment(target, text, options?)` | Add a comment; use `replyToCommentId` to reply |
| `media.deleteComment(target, commentId, options?)` | Delete a comment |
| `media.comments(target, maxId, options?)` | `comments/next_max_id/has_more_comments` |
| `media.save(target, enabled, options?)` | Save/unsave; `enabled` defaults to true |
| `media.download(url, options?)` | Download from a CDN and return the path; options include `path/maxBytes/timeoutMs/signal` |

Sending by Direct thread ID requires a matching messaging FBID. `sendPhoto()` checks the current inbox result; `sendVideo()` and `sendVoice()` use the paginated thread lookup described below. If no matching thread is found, they report `THREAD_NOT_FOUND` before uploading the file. Media captions are not supported; send one attachment at a time. The library does not convert video or audio formats.

`target` accepts an ID, a post shortcode, or an Instagram link. Use `next_max_id` to read more comments. Downloads default to 100 MiB/30 seconds and accept only allowed HTTPS CDNs, without sending cookies or overwriting files. Received messages may lack a download URL.

## Threads

| Method | ID |
| --- | --- |
| `threads.inbox(options?)`, `threads.requests(options?)` | Return `{ threads, countThread, pageInfo }`; a thread's `id` is a messaging FBID |
| `threads.get(threadId, options?)`, `threads.list(cursor, options?)` | Direct thread ID; omit the cursor or pass null for the first page |
| `threads.history(threadId, options?)` | Direct thread ID; options include `cursor/limit` |
| `threads.getByParticipants(userPks, options?)` | Instagram user PKs |
| `threads.createGroup(userPks, title, options?)` | At least two people other than the logged-in account |
| `threads.approve/mute/unmute/leave(threadId, options?)` | Direct thread ID |
| `threads.addMembers(threadId, userPks, options?)`, `threads.updateTitle(threadId, title, options?)` | Direct thread ID |
| `threads.accept(threadFbid, options?)`, `threads.rename(threadFbid, name, options?)` | Messaging FBID |
| `threads.nickname(threadFbid, userFbid, name, options?)`, `threads.emoji(threadFbid, value, options?)` | Messaging FBID; older web endpoints, not rechecked with a live session |
| `threads.admin(threadFbid, userPk, enabled, options?)` | Messaging FBID; enabled defaults to true |
| `threads.getSyncSequence(options?)` | Return the Iris sync position as a string |

`history()` returns `{ messages, pageInfo: { hasNextPage, endCursor } }`, newest first, with a limit of 1–100. Use `endCursor` for the next page. History is not replayed through message handlers.

`get()` searches up to three pages of the inbox/message requests. If group creation reports `DELIVERY_UNKNOWN`, check the inbox before creating it again. `requests` accepts a cursor; inbox `folder: 'ARCHIVED'` has not been verified.

## Users, account, and Notes

| Method | Purpose |
| --- | --- |
| `account.currentUser(options?)`, `account.logout(options?)` | Current account `{ status: 'ok', user }` / local logout |
| `users.info(userPk, options?)`, `users.infoByUsername(username, options?)` | Profile details |
| `users.search/searchContacts(query, options?)` | Array of users/messaging users |
| `users.profile(target, options?)` | Username or messaging user FBID; does not accept an Instagram PK |
| `users.getFollowers/getFollowing(userPk, maxId, options?)` | `users/next_max_id/more_available` |
| `users.follow/unfollow(userPk, options?)`, `users.bio(text, options?)`, `users.notifications(options?)` | Follow/unfollow, change bio, read notifications |
| `friendships.create/destroy/show/approve/ignore(userPk, options?)` | Follow/unfollow, status, accept/ignore requests |
| `friendships.showMany(userPks, options?)`, `friendships.getPendingRequests(options?)` | Multiple users' statuses / pending requests |
| `notes.list(options?)`, `notes.create(text, options?)`, `notes.delete(noteId, options?)` | Read/create/delete notes |
| `notes.searchMusic(query, options?)`, `notes.createMusic(trackOrQuery, options?)` | Find tracks/create music notes |

Text notes allow up to 80 Unicode characters; audience accepts `followers/closeFriends` or `0/1`. Music notes accept a full track from `searchMusic()` or a search query, not a cluster ID alone. Options include `text/durationMs/startTimeMs/audience/signal`. Creating a note returns `{ noteId, data }`.

## Feed and search

| Method | Result |
| --- | --- |
| `feed.getFeed(maxId, options?)` | Home feed containing `feed_items` |
| `feed.getUserFeed(userPk, maxId, options?)`, `feed.getReelsFeed(maxId, options?)` | `items/next_max_id/more_available` |
| `search.all(query, options?)` | `users/hashtags/places`; options include `count/rankToken/searchType/signal` |
| `search.users/hashtags(query, count, options?)` | Users/hashtags |
| `search.locations(query, null, null, count, options?)` | Places; coordinates are not supported |
| `hashtags.search(query, options?)`, `locations.search(query, null, null, options?)` | Keyword search |

For the first page, omit maxId or pass null. Use `next_max_id` to read more. Search count defaults to 30 and accepts 1–100; searchType only accepts `'blended'`. Hashtag/place searches may return empty arrays.

## Logging

Logging is off by default. Enable the built-in records when creating the client:

```js
const client = new InstagramClient({
  cookies: process.env.IGCHAT_COOKIES,
  logger: console,
  logLevel: 'info',
});
```

| Event | What it tells you |
| --- | --- |
| `session.loginStarted/loginCompleted/loginFailed` | Login progress and failure code |
| `realtime.stateChanged` | Connection state, retry attempt, and delay |
| `realtime.failed` | Terminal connection failure |
| `receiving.handlerFailed` | A filter or handler failed |
| `http.requestFailed` | Request failure, HTTP status when available, and duration |
| `client.closed` | Shutdown finished |

Levels are `debug/info/warn/error`; `logLevel` is the minimum level to emit. Use `debug` to include `http.requestCompleted` and `receiving.updateReceived`. Records contain `time/level/event` and selected state/error metadata, without cookies, tokens, request URLs, or message content. A logger callback can format or save these records; logger exceptions do not stop the client. `logger: false` disables logging.

## Errors

| Error code | Action |
| --- | --- |
| `AUTHENTICATION_REQUIRED` | Check login/verification in the browser and update cookies |
| `RATE_LIMITED` | Wait and reduce the request rate |
| `THREAD_NOT_FOUND` | Check the ID type and whether the thread is in the inbox |
| `DELIVERY_UNKNOWN` | Check the actual result before retrying |
| `SESSION_CHANGED`, `HANDLER_QUEUE_FULL` | Get fresh data after changing sessions / reduce waiting in handlers |
| `UNSUPPORTED_OPERATION` | The method is not supported yet |

Errors thrown by a filter or handler are reported as `HANDLER_ERROR`; inspect `error.cause` for the original error and its code. For example, use `onHandlerError()` when the app needs to react to a failed reply:

```js
client.onHandlerError(function (error) {
  if (error.cause && error.cause.code === 'DELIVERY_UNKNOWN') {
    console.error('Check the conversation before sending that reply again.');
  }
});
```

Built-in logging already records handler and connection failures when enabled. Avoid logging whole errors, raw events, cookies, or session objects if your bot handles private conversations.

## Not supported yet

| Area | Not supported |
| --- | --- |
| Login | Username/password, bearer tokens instead of cookies |
| `account` | `login/encryptPassword/syncLoginExperiments/sendRecoveryFlowEmail/sendRecoveryFlowSms` |
| `users/friendships` | Block/unblock, removeFollower, mute/unmute relationships |
| `threads` | `rankedRecipients/presence/decline/theme/themes`; no kick/removeMember |
| `media` | `delete/edit/seen/publishPhoto/deleteCometStory/archiveCometStory` |
| `feed` | Publishing posts, `getTag/getLiked/getSaved/getLocation/getExploreFeed` |
| `uploads/stories/highlights/live` | All methods; `messages.upload` for Direct still works |
| `search/hashtags/locations` | Search history/suggestions, coordinates; hashtags/locations only support search |
| `messages` | Media captions, multiple attachments, media broadcasts, or older signed/query options |

## Examples

Examples: [send messages](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/send-message.js), [receive messages](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/receive-message.js), [SimpleBot](https://github.com/ttkienn/instagram-chatkit/blob/main/examples/optional/bot.js). `SimpleBot` from `instagram-chatkit/bot` uses `start()/close()`; type `/` to see commands. It skips the bot's own messages, so test with another account.
