import type {
  Id, UserPk, MessagingUserFbid, ThreadFbid, NativeThreadId, Cursor, RequestOptions, JsonObject, StatusResponse,
  User, Contact, UsersPage, FeedPage, PublishedMedia, MediaInfo, CommentsPage, StoriesResponse, HighlightsResponse,
  ThreadResponse, InboxResponse, SentMessage, NativeSentMessage, WebInbox, UploadResponse,
  UploadPhotoOptions, UploadVideoOptions, ConfigureMediaOptions, PhotoPublishOptions, VideoPublishOptions, CarouselPublishOptions,
  StoryItem, StoryReel, ProviderObject,
} from './common.js';

export interface Credentials { username: string; password: string; signal?: AbortSignal; }
export interface AccountApi {
  login(credentials: Credentials, options?: RequestOptions): Promise<never>;
  login(username: string, password: string, options?: RequestOptions): Promise<never>;
  logout(options?: RequestOptions): Promise<StatusResponse & { scope: 'local' }>;
  currentUser(options?: RequestOptions): Promise<StatusResponse & { user: User }>;
  syncLoginExperiments(options?: RequestOptions): Promise<never>;
  encryptPassword(password: string): never;
  sendRecoveryFlowEmail(query: string, options?: RequestOptions): Promise<never>;
  sendRecoveryFlowSms(query: string, options?: RequestOptions): Promise<never>;
}
export interface UsersApi {
  search(query: string, options?: RequestOptions): Promise<User[]>;
  searchContacts(query: string, options?: RequestOptions): Promise<Contact[]>;
  infoByUsername(username: string, options?: RequestOptions): Promise<User>;
  info(userPk: UserPk, options?: RequestOptions): Promise<User>;
  profile(usernameOrMessagingUserFbid: Id, options?: RequestOptions): Promise<Contact>;
  getFollowers(userPk: UserPk, maxId?: Cursor | null, options?: RequestOptions): Promise<UsersPage>;
  getFollowing(userPk: UserPk, maxId?: Cursor | null, options?: RequestOptions): Promise<UsersPage>;
  follow(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  unfollow(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  removeFollower(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  block(userPk: UserPk, enabled?: boolean, options?: RequestOptions): Promise<StatusResponse>;
  bio(text: string, options?: RequestOptions): Promise<StatusResponse>;
  notifications(options?: RequestOptions): Promise<StatusResponse>;
}
export interface FriendshipMuteOptions extends RequestOptions { muteStories?: boolean; mutePosts?: boolean; }
export interface FriendshipUnmuteOptions extends RequestOptions { unmuteStories?: boolean; unmutePosts?: boolean; }
export interface FriendshipsApi {
  create(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  destroy(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  show(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  showMany(userPks: UserPk[], options?: RequestOptions): Promise<StatusResponse>;
  approve(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  ignore(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  removeFollower(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  block(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  unblock(userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  mute(userPk: UserPk, options?: FriendshipMuteOptions): Promise<StatusResponse>;
  unmute(userPk: UserPk, options?: FriendshipUnmuteOptions): Promise<StatusResponse>;
  getPendingRequests(options?: RequestOptions): Promise<UsersPage>;
}
export interface SendToUserOptions extends RequestOptions { clientContext?: string; }
export interface SendImageOptions extends SendToUserOptions { caption?: string; }
export interface SendVideoOptions extends SendImageOptions { durationMs?: number; width?: number; height?: number; }
interface BroadcastFields extends RequestOptions {
  item: string; form?: JsonObject; signed?: boolean; query?: Record<string, string | number | boolean>;
  clientContext?: string;
}
export type BroadcastOptions = BroadcastFields & ({ threadIds: NativeThreadId[]; userIds?: never } | { userIds: UserPk[]; threadIds?: never });
export interface AttachmentOptions extends RequestOptions {
  attachmentId: Id | Id[]; type?: 'gif' | 'image' | 'video' | 'file' | 'audio'; content?: string; replyToMessageId?: Id; clientContext?: string;
}
export interface MessagesApi {
  sendPhoto(nativeThreadId: NativeThreadId, data: Uint8Array, options?: RequestOptions & { mimeType?: 'image/jpeg' | 'image/png'; replyToMessageId?: Id }): Promise<SentMessage>;
  sendVideo(nativeThreadId: NativeThreadId, data: Uint8Array, options?: RequestOptions & { mimeType?: string; replyToMessageId?: Id }): Promise<SentMessage>;
  sendVoice(nativeThreadId: NativeThreadId, data: Uint8Array, options?: RequestOptions & { mimeType?: string; replyToMessageId?: Id }): Promise<SentMessage>;
  send(threadFbid: ThreadFbid, text: string, options?: RequestOptions & { replyToMessageId?: Id; replyToUserId?: MessagingUserFbid }): Promise<SentMessage>;
  edit(threadFbid: ThreadFbid, messageId: Id, text: string, options?: RequestOptions): Promise<ProviderObject>;
  unsend(threadFbid: ThreadFbid, messageId: Id, options?: RequestOptions): Promise<ProviderObject>;
  react(threadFbid: ThreadFbid, messageId: Id, emoji: string, options?: RequestOptions & { remove?: boolean }): Promise<ProviderObject>;
  upload(data: Uint8Array, options?: RequestOptions & { mimeType?: string; voice?: boolean }): Promise<{ uploadId: string; mediaType: number }>;
  sendAttachment(threadFbid: ThreadFbid, options: AttachmentOptions): Promise<SentMessage>;
  sendToUser(username: string, text: string, options?: SendToUserOptions): Promise<NativeSentMessage>;
  sendImageToUser(username: string, imagePath: string, options?: SendImageOptions): Promise<NativeSentMessage>;
  sendVideoToUser(username: string, videoPath: string, options?: SendVideoOptions): Promise<NativeSentMessage>;
  broadcast(options: BroadcastOptions): Promise<NativeSentMessage>;
  sendToGroup(threadId: NativeThreadId, text: string, options?: SendToUserOptions & { replyToMessageId?: Id }): Promise<NativeSentMessage>;
  markSeen(threadId: NativeThreadId, messageId: string, options?: RequestOptions): Promise<StatusResponse>;
  deleteItem(threadId: NativeThreadId, messageId: string, options?: RequestOptions): Promise<StatusResponse>;
}
export interface ThreadsApi {
  history(threadId: NativeThreadId, options?: RequestOptions & { cursor?: string | null; limit?: number }): Promise<{ messages: import('./realtime.js').IncomingMessage[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }>;
  get(threadId: NativeThreadId, options?: RequestOptions): Promise<ThreadResponse>;
  getByParticipants(userPks: UserPk[], options?: RequestOptions): Promise<ThreadResponse>;
  list(cursor?: string | null, options?: RequestOptions): Promise<InboxResponse>;
  createGroup(userPks: UserPk[], title: string, options?: RequestOptions): Promise<ThreadResponse>;
  rankedRecipients(mode?: string, query?: string, options?: RequestOptions): Promise<StatusResponse>;
  presence(options?: RequestOptions): Promise<StatusResponse>;
  approve(threadId: NativeThreadId, options?: RequestOptions): Promise<StatusResponse>;
  decline(threadId: NativeThreadId, options?: RequestOptions): Promise<StatusResponse>;
  mute(threadId: NativeThreadId, options?: RequestOptions): Promise<StatusResponse>;
  unmute(threadId: NativeThreadId, options?: RequestOptions): Promise<StatusResponse>;
  addMembers(threadId: NativeThreadId, userPks: UserPk[], options?: RequestOptions): Promise<StatusResponse>;
  leave(threadId: NativeThreadId, options?: RequestOptions): Promise<StatusResponse>;
  updateTitle(threadId: NativeThreadId, title: string, options?: RequestOptions): Promise<StatusResponse>;
  inbox(options?: RequestOptions & { folder?: 'INBOX' | 'PENDING' | 'ARCHIVED' }): Promise<WebInbox>;
  requests(options?: RequestOptions & { cursor?: string }): Promise<WebInbox>;
  getSyncSequence(options?: RequestOptions): Promise<string>;
  accept(threadFbid: ThreadFbid, options?: RequestOptions): Promise<ProviderObject>;
  rename(threadFbid: ThreadFbid, name: string, options?: RequestOptions): Promise<ProviderObject>;
  nickname(threadFbid: ThreadFbid, userFbid: MessagingUserFbid, nickname: string, options?: RequestOptions): Promise<ProviderObject>;
  emoji(threadFbid: ThreadFbid, value: string, options?: RequestOptions): Promise<ProviderObject>;
  admin(threadFbid: ThreadFbid, userPk: UserPk, enabled?: boolean, options?: RequestOptions): Promise<ProviderObject>;
  theme(threadFbid: ThreadFbid, themeId: Id, options?: RequestOptions): Promise<ProviderObject>;
  themes(options?: RequestOptions): Promise<ProviderObject[]>;
}
export interface MediaLikeOptions extends RequestOptions { module_name?: string; trackingToken?: string; }
export interface DownloadMediaOptions extends RequestOptions { path?: string; maxBytes?: number; timeoutMs?: number; }
export interface MediaApi {
  download(url: string, options?: DownloadMediaOptions): Promise<string>;
  info(target: Id, options?: RequestOptions): Promise<MediaInfo>;
  like(target: Id, options?: MediaLikeOptions): Promise<StatusResponse>;
  like(target: Id, legacyOptions?: boolean | MediaLikeOptions, requestOptions?: MediaLikeOptions): Promise<StatusResponse>;
  unlike(target: Id, options?: MediaLikeOptions, requestOptions?: MediaLikeOptions): Promise<StatusResponse>;
  comment(target: Id, text: string, options?: RequestOptions & { replyToCommentId?: Id }): Promise<StatusResponse>;
  deleteComment(target: Id, commentId: Id, options?: RequestOptions): Promise<StatusResponse>;
  delete(target: Id, mediaType?: string, options?: RequestOptions): Promise<StatusResponse>;
  edit(target: Id, caption: string, options?: RequestOptions): Promise<StatusResponse>;
  seen(reels: Record<string, string[]>, options?: RequestOptions): Promise<StatusResponse>;
  likers(target: Id, options?: RequestOptions): Promise<UsersPage>;
  comments(target: Id, maxId?: Cursor | null, options?: RequestOptions): Promise<CommentsPage>;
  save(target: Id, enabled?: boolean, options?: RequestOptions & { loggingInfoToken?: string }): Promise<StatusResponse>;
  publishPhoto(data: Uint8Array, options?: RequestOptions & { caption?: string; story?: boolean; mimeType?: string }): Promise<PublishedMedia>;
  deleteCometStory(base64StoryId: string, options?: RequestOptions): Promise<never>;
  archiveCometStory(base64StoryId: string, options?: RequestOptions): Promise<never>;
}
export interface UploadsApi {
  photo(options: UploadPhotoOptions): Promise<UploadResponse>;
  video(options: UploadVideoOptions): Promise<UploadResponse>;
  configure(options: ConfigureMediaOptions): Promise<PublishedMedia>;
  configurePhoto(options: ConfigureMediaOptions): Promise<PublishedMedia>;
  configureVideo(options: ConfigureMediaOptions): Promise<PublishedMedia>;
  createPhotoRuploadParams(options: Partial<UploadPhotoOptions>, uploadId: Id): JsonObject;
  createVideoRuploadParams(options: Partial<UploadVideoOptions>, uploadId: Id): JsonObject;
}
export interface FeedApi {
  upload(options: PhotoPublishOptions, requestOptions?: RequestOptions): Promise<PublishedMedia>;
  uploadVideo(options: VideoPublishOptions, requestOptions?: RequestOptions): Promise<PublishedMedia>;
  uploadCarousel(options: CarouselPublishOptions, requestOptions?: RequestOptions): Promise<PublishedMedia>;
  getFeed(maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getUserFeed(userPk: UserPk, maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getTag(tag: string, maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getLiked(maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getSaved(maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getLocation(locationId: Id, maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getExploreFeed(maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getReelsFeed(maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
}
export interface StoriesApi {
  react(options: RequestOptions & { storyId: Id; reaction?: string }, requestOptions?: RequestOptions): Promise<StatusResponse>;
  getFeed(options?: RequestOptions): Promise<StoriesResponse>;
  getUser(userPk: UserPk, options?: RequestOptions): Promise<StoriesResponse>;
  upload(options: PhotoPublishOptions, requestOptions?: RequestOptions): Promise<PublishedMedia>;
  uploadVideo(options: VideoPublishOptions, requestOptions?: RequestOptions): Promise<PublishedMedia>;
  seen(itemsOrReels: StoryItem[] | Record<string, StoryReel & { items: StoryItem[] }>, sourceId?: UserPk | null, options?: RequestOptions): Promise<StatusResponse>;
  getHighlights(userPk: UserPk, options?: RequestOptions): Promise<HighlightsResponse>;
  getHighlight(highlightId: Id, options?: RequestOptions): Promise<HighlightsResponse>;
  viewers(storyId: Id, options?: RequestOptions): Promise<UsersPage>;
}
export interface HighlightsApi {
  getHighlightsTray(userPk: UserPk, options?: RequestOptions): Promise<HighlightsResponse>;
  getHighlight(highlightId: Id, options?: RequestOptions): Promise<HighlightsResponse>;
  create(title: string, storyIds: Id[], coverMediaId?: Id | null, options?: RequestOptions): Promise<HighlightsResponse>;
  edit(highlightId: Id, title: string, storyIds: Id[], coverMediaId?: Id | null, options?: RequestOptions): Promise<HighlightsResponse>;
  delete(highlightId: Id, options?: RequestOptions): Promise<StatusResponse>;
  addStories(highlightId: Id, storyIds: Id[], options?: RequestOptions): Promise<StatusResponse>;
  removeStories(highlightId: Id, storyIds: Id[], options?: RequestOptions): Promise<StatusResponse>;
  updateCover(highlightId: Id, coverMediaId: Id, options?: RequestOptions): Promise<StatusResponse>;
}
export interface HashtagsApi {
  info(tag: string, options?: RequestOptions): Promise<StatusResponse>;
  search(query: string, options?: RequestOptions): Promise<StatusResponse>;
  getFeed(tag: string, maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getStories(tag: string, options?: RequestOptions): Promise<StoriesResponse>;
  follow(tag: string, options?: RequestOptions): Promise<StatusResponse>;
  unfollow(tag: string, options?: RequestOptions): Promise<StatusResponse>;
  getRelated(tag: string, options?: RequestOptions): Promise<StatusResponse>;
  getFollowing(options?: RequestOptions): Promise<StatusResponse>;
}
export interface LocationsApi {
  info(locationId: Id, options?: RequestOptions): Promise<StatusResponse>;
  search(query: string, latitude?: number | null, longitude?: number | null, options?: RequestOptions): Promise<StatusResponse>;
  searchByCoordinates(latitude: number, longitude: number, options?: RequestOptions): Promise<StatusResponse>;
  getFeed(locationId: Id, maxId?: Cursor | null, options?: RequestOptions): Promise<FeedPage>;
  getStories(locationId: Id, options?: RequestOptions): Promise<StoriesResponse>;
  getRelated(locationId: Id, options?: RequestOptions): Promise<StatusResponse>;
}
export interface SearchOptions extends RequestOptions { searchType?: 'blended'; count?: number; rankToken?: string; }
export interface SearchApi {
  all(query: string, options?: SearchOptions): Promise<StatusResponse>;
  users(query: string, count?: number, options?: RequestOptions): Promise<UsersPage>;
  hashtags(query: string, count?: number, options?: RequestOptions): Promise<StatusResponse>;
  locations(query: string, latitude?: number | null, longitude?: number | null, count?: number, options?: RequestOptions): Promise<StatusResponse>;
  recent(options?: RequestOptions): Promise<StatusResponse>;
  clearHistory(options?: RequestOptions): Promise<StatusResponse>;
  suggestedUsers(options?: RequestOptions): Promise<StatusResponse>;
  suggestedHashtags(options?: RequestOptions): Promise<StatusResponse>;
}
export interface LiveApi {
  create(options?: RequestOptions & { previewWidth?: number; previewHeight?: number; broadcastMessage?: string }): Promise<StatusResponse & { broadcast_id: Id; upload_url?: string }>;
  start(broadcastId: Id, shouldSendNotifications?: boolean, options?: RequestOptions): Promise<StatusResponse>;
  end(broadcastId: Id, endAfterCopyrightWarning?: boolean, options?: RequestOptions): Promise<StatusResponse>;
  info(broadcastId: Id, options?: RequestOptions): Promise<StatusResponse>;
  getViewerList(broadcastId: Id, options?: RequestOptions): Promise<UsersPage>;
  comment(broadcastId: Id, text: string, options?: RequestOptions): Promise<StatusResponse>;
  like(broadcastId: Id, likeCount?: number, options?: RequestOptions): Promise<StatusResponse>;
  getHeartbeatAndViewerCount(broadcastId: Id, options?: RequestOptions): Promise<StatusResponse>;
  muteComment(broadcastId: Id, userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
  unmuteComment(broadcastId: Id, userPk: UserPk, options?: RequestOptions): Promise<StatusResponse>;
}
export type NoteAudience = 'followers' | 'closeFriends' | 0 | 1;
export interface Note { id: string; text: string; user: User | null; data: ProviderObject; }
export interface MusicTrack extends ProviderObject { audio_cluster_id: string; audio_asset_id: string; browse_session_id: string; alacorn_session_id: string; title?: string; duration_in_ms?: number; allow_media_creation_with_music: boolean; }
export interface NotesApi {
  list(options?: RequestOptions): Promise<Note[]>;
  create(text: string, options?: RequestOptions & { audience?: NoteAudience }): Promise<{ noteId: string; data: ProviderObject }>;
  delete(noteId: Id, options?: RequestOptions): Promise<{ success: true }>;
  searchMusic(query: string, options?: RequestOptions): Promise<MusicTrack[]>;
  createMusic(trackOrQuery: string | MusicTrack, options?: RequestOptions & { text?: string; durationMs?: number; startTimeMs?: number; audience?: NoteAudience }): Promise<{ noteId: string; data: ProviderObject }>;
}
