import type {
  CookieStorage, SnapshotStorage, SessionSnapshot, LegacySessionSnapshot, RequestOptions, WebSession, LoggingOptions,
} from './common.js';
import type {
  AccountApi, UsersApi, FriendshipsApi, MessagesApi, ThreadsApi, MediaApi, UploadsApi,
  FeedApi, StoriesApi, HighlightsApi, HashtagsApi, LocationsApi, SearchApi, LiveApi, NotesApi,
} from './features.js';
import type { ClientEvents, MqttRealtimeOptions, MqttController } from './realtime.js';
import type { HandlerRegistration, ReceivedMessage, MessageHandler, HandlerError, ReceivingOptions, Unsubscribe } from './receiving.js';
export type * from './common.js';
export type * from './features.js';
export type * from './realtime.js';
export type * from './receiving.js';
export { filters } from './receiving.js';

declare global {
  interface SymbolConstructor {
    readonly asyncDispose: unique symbol;
  }
}

export interface LoginOptions extends RequestOptions {}
export interface ClientOptions extends LoggingOptions {
  cookies?: string; storage?: SnapshotStorage | CookieStorage;
  fetch?: typeof globalThis.fetch; timeoutMs?: number; maxResponseBytes?: number;
  receiving?: ReceivingOptions;
}
export class InstagramClient {
  constructor(options?: ClientOptions);
  readonly account: AccountApi; readonly users: UsersApi; readonly friendships: FriendshipsApi;
  readonly messages: MessagesApi; readonly threads: ThreadsApi; readonly media: MediaApi; readonly uploads: UploadsApi;
  readonly feed: FeedApi; readonly stories: StoriesApi; readonly highlights: HighlightsApi;
  readonly hashtags: HashtagsApi; readonly locations: LocationsApi; readonly search: SearchApi; readonly live: LiveApi; readonly notes: NotesApi;
  readonly session: WebSession | undefined;
  storage: SnapshotStorage | CookieStorage | undefined;
  readonly realtime: MqttController | null;
  readonly closed: boolean;
  static connect(options?: ClientOptions): Promise<InstagramClient>;
  login(options?: LoginOptions): Promise<this>;
  logout(options?: RequestOptions): Promise<import('./common.js').StatusResponse & { scope: 'local' }>;
  isLoggedIn(): boolean;
  isSessionValid(options?: RequestOptions): Promise<boolean>;
  saveSession(): Promise<SessionSnapshot>;
  loadSession(snapshot: SessionSnapshot | LegacySessionSnapshot | string): Promise<this>;
  saveSessionToFile(filepath?: string): Promise<string>;
  loadSessionFromFile(filepath?: string): Promise<boolean>;
  connectRealtime(options?: MqttRealtimeOptions): Promise<MqttController>;
  onMessage: HandlerRegistration<ReceivedMessage>;
  onMessageEdit: HandlerRegistration<ReceivedMessage>;
  onMessageDelete: HandlerRegistration<ReceivedMessage>;
  onThreadUpdate: HandlerRegistration<import('./realtime.js').ThreadUpdate>;
  onUnseenCount: HandlerRegistration<import('./common.js').ProviderObject>;
  onRawDelta: HandlerRegistration<import('./common.js').ProviderObject>;
  onHandlerError(handler: MessageHandler<HandlerError>): Unsubscribe;
  waitForHandlers(): Promise<void>;
  disconnectRealtime(): Promise<void>;
  close(): Promise<void>;
  [Symbol.asyncDispose](): Promise<void>;
  on<K extends keyof ClientEvents>(event: K, listener: (payload: ClientEvents[K]) => void): this;
  once<K extends keyof ClientEvents>(event: K, listener: (payload: ClientEvents[K]) => void): this;
  off<K extends keyof ClientEvents>(event: K, listener: (payload: ClientEvents[K]) => void): this;
}
export class SessionStorage implements SnapshotStorage {
  constructor(filepath?: string);
  readonly format: 'snapshot'; readonly filepath: string;
  load(): Promise<SessionSnapshot | null>;
  save(snapshot: SessionSnapshot | LegacySessionSnapshot): Promise<void>;
  clear(): Promise<void>;
}
export class FileSessionStorage implements CookieStorage {
  constructor(filepath?: string, options?: { key?: string });
  readonly format: 'cookies'; readonly filepath: string; readonly key: string;
  load(): Promise<string | null>;
  save(cookies: string): Promise<void>;
  clear(): Promise<void>;
}
export class EnvSessionStorage implements CookieStorage {
  constructor(envVar?: string, environment?: Record<string, string | undefined>);
  readonly format: 'cookies';
  load(): Promise<string | null>;
  save(cookies: string): Promise<void>;
  clear(): Promise<void>;
}
export interface ReconnectPolicyOptions {
  enabled?: boolean; initialDelay?: number; maxDelay?: number; multiplier?: number; jitter?: number;
  maxAttempts?: number | null; stableResetAfter?: number; random?: () => number;
}
export class ReconnectPolicy {
  constructor(options?: ReconnectPolicyOptions);
  readonly enabled: boolean; readonly initialDelay: number; readonly maxDelay: number; readonly multiplier: number;
  readonly jitter: number; readonly maxAttempts: number | null; readonly stableResetAfter: number;
  allows(attempt: number): boolean;
  delay(attempt: number): number;
}
export interface InstagramErrorOptions { code?: string; status?: number; retryable?: boolean; cause?: unknown; }
export interface InstagramErrorInfo { name: string; message: string; code: string; status?: number; retryable: boolean; }
export class InstagramError extends Error {
  constructor(message: string, options?: InstagramErrorOptions);
  code: string; status: number | undefined; retryable: boolean;
  toJSON(): InstagramErrorInfo;
}
export class ValidationError extends InstagramError { constructor(message?: string, options?: InstagramErrorOptions); }
export class AuthenticationError extends InstagramError { constructor(message?: string, options?: InstagramErrorOptions); }
export class ConnectionError extends InstagramError { constructor(message?: string, options?: InstagramErrorOptions); }
export class TimeoutError extends ConnectionError { constructor(message?: string, options?: InstagramErrorOptions); }
export class DeliveryUnknownError extends InstagramError { constructor(message?: string, options?: InstagramErrorOptions); }
