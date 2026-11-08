export type Id = string | number | bigint;
export type UserPk = Id;
export type MessagingUserFbid = Id;
export type ThreadFbid = Id;
export type NativeThreadId = Id;
export type Cursor = string | number | bigint;
export interface RequestOptions { signal?: AbortSignal; }
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogRecord {
  time: string; level: LogLevel; event: string;
  method?: 'GET' | 'POST'; status?: number; code?: string; retryable?: boolean; durationMs?: number;
  state?: string; attempt?: number; nextRetryIn?: number; updateType?: string; group?: number;
}
export type LogHandler = (record: LogRecord) => unknown;
export type Logger = Partial<Record<LogLevel, LogHandler>>;
export interface LoggingOptions { logger?: LogHandler | Logger | false; logLevel?: LogLevel; }
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface JsonObject { [key: string]: JsonValue | undefined; }
export interface ProviderObject { [key: string]: unknown; }
export interface StatusResponse extends ProviderObject { status: 'ok'; }
export interface User extends ProviderObject {
  pk?: Id; id?: Id; username: string; full_name?: string; biography?: string;
  is_private?: boolean; is_verified?: boolean; is_business?: boolean;
  follower_count?: number; following_count?: number; media_count?: number;
  profile_pic_url?: string; external_url?: string;
}
export interface Contact extends User { id: string; name: string; avatar: string | null; }
export interface UsersPage extends StatusResponse { users: User[]; next_max_id?: string; more_available?: boolean; }
export interface Media extends ProviderObject {
  id?: Id; pk?: Id; code?: string; media_type?: number; taken_at?: number; user?: User;
  caption?: { text?: string; user?: User } | null;
  image_versions2?: { candidates: Array<{ url: string; width?: number; height?: number }> };
  video_versions?: Array<{ url: string; width?: number; height?: number; type?: number }>;
  carousel_media?: Media[];
}
export interface FeedPage extends StatusResponse {
  items?: Media[]; feed_items?: Array<{ media_or_ad?: Media; [key: string]: unknown }>;
  next_max_id?: string; more_available?: boolean; num_results?: number;
  paging_info?: { max_id?: string; more_available?: boolean };
}
export interface PublishedMedia extends StatusResponse { media: Media; }
export interface MediaInfo extends StatusResponse { items?: Media[]; media?: Media; }
export interface CommentsPage extends StatusResponse {
  comments: Array<{ pk?: Id; user?: User; text?: string; created_at?: number; [key: string]: unknown }>;
  next_max_id?: string; has_more_comments?: boolean;
}
export interface StoryItem extends Media { id: Id; taken_at: number; user?: User; }
export interface StoryReel extends ProviderObject { id?: Id; items?: StoryItem[]; user?: User; }
export interface StoriesResponse extends StatusResponse { reel?: StoryReel; reels?: Record<string, StoryReel>; tray?: StoryReel[]; }
export interface HighlightReel extends StoryReel { title?: string; cover_media?: Media; }
export interface HighlightsResponse extends StatusResponse {
  tray?: HighlightReel[]; reel?: HighlightReel; reels?: Record<string, HighlightReel>; reels_media?: HighlightReel[];
}
export interface DirectItem extends ProviderObject { item_id?: Id; item_type?: string; text?: string; user_id?: UserPk; timestamp?: string; }
export interface DirectThread extends ProviderObject {
  thread_id: NativeThreadId; thread_title?: string; is_group?: boolean; users?: User[]; items?: DirectItem[];
  oldest_cursor?: string; newest_cursor?: string; has_older?: boolean;
}
export interface ThreadResponse extends StatusResponse { thread?: DirectThread; thread_id?: NativeThreadId; thread_fbid?: string; thread_title?: string; threads?: DirectThread[]; }
export interface InboxResponse extends StatusResponse {
  inbox?: { threads: DirectThread[]; oldest_cursor?: string; has_older?: boolean; [key: string]: unknown };
  threads?: DirectThread[];
}
export interface SentMessage { messageId: string; offlineThreadingId: string; timestamp?: number; }
export interface NativeSentMessage extends StatusResponse {
  payload?: { item_id?: Id; message_id?: string; thread_id?: NativeThreadId; timestamp?: string; [key: string]: unknown };
}
export interface WebThread { id: string; nativeThreadId?: string; shortId: string; name: string; isGroup: boolean; folder?: string; }
export interface WebInbox { threads: WebThread[]; countThread: number; pageInfo: { has_next_page?: boolean; end_cursor?: string } | null; }
export interface UploadResponse extends StatusResponse { upload_id: string; }
export interface SignalInOptions { signal?: AbortSignal; }
export type MediaBytes = Uint8Array;
export interface UploadPhotoOptions extends SignalInOptions {
  file: MediaBytes; uploadId?: Id; uploadName?: string; waterfallId?: string;
}
export interface UploadVideoOptions extends SignalInOptions {
  video: MediaBytes; uploadId?: Id; uploadName?: string; waterfallId?: string;
  duration_ms?: number | string; width?: number | string; height?: number | string; for_album?: boolean; offset?: number | string;
}
export interface ConfigureMediaOptions extends SignalInOptions {
  uploadId: Id; caption?: string; source_type?: Id; camera_position?: string;
  configure_mode?: 0 | 1 | '0' | '1';
  length?: number;
  audio_muted?: boolean; poster_frame_index?: number; filter_type?: Id; video_result?: string;
  clips?: Array<{ length?: number; source_type?: Id; camera_position?: string }>;
  location?: JsonObject;
}
export type PhotoSource = { imagePath: string; file?: never; data?: never } | { file: MediaBytes; imagePath?: never; data?: never } | { data: MediaBytes; imagePath?: never; file?: never };
export type VideoSource = { videoPath: string; video?: never; data?: never } | { video: MediaBytes; videoPath?: never; data?: never } | { data: MediaBytes; videoPath?: never; video?: never };
export type PhotoPublishOptions = PhotoSource & { caption?: string; signal?: AbortSignal; uploadId?: Id };
export type VideoPublishOptions = VideoSource & {
  caption?: string; signal?: AbortSignal; uploadId?: Id; duration_ms?: number; width?: number; height?: number;
};
export type CarouselItem = ({ type: 'photo' } & (PhotoSource | { path: string })) | ({ type: 'video'; duration_ms?: number; width?: number; height?: number } & (VideoSource | { path: string }));
export interface CarouselPublishOptions { items: CarouselItem[]; caption?: string; signal?: AbortSignal; }
export interface SessionSnapshot {
  version: 2; cookies: string;
}
export interface LegacySessionSnapshot {
  version: 1; cookies: string; device?: unknown; credentials?: unknown;
}
export interface SnapshotStorage {
  readonly format?: 'snapshot';
  load(): Promise<SessionSnapshot | LegacySessionSnapshot | null>;
  save(snapshot: SessionSnapshot): Promise<void>;
  clear?(): Promise<void>;
}
export interface CookieStorage {
  readonly format: 'cookies';
  load(): Promise<string | null>;
  save(cookies: string): Promise<void>;
  clear?(): Promise<void>;
}
export interface WebSession {
  IGSID: string; fb_dtsg: string; jazoest: string; sessionID: string; clientRevision: string; cookieIGS: string;
  fb_dtsg_ag?: string | null; hash?: string | null;
}
