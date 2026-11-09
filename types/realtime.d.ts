import type { DirectThread, Id, NativeThreadId, ProviderObject, WebSession } from './common.js';
import type { ReconnectPolicy, InstagramError } from './index.js';

export interface ConnectionState {
  state: 'starting' | 'connected' | 'reconnecting' | 'auth_required' | 'fatal' | 'stopped';
  reason: string; attempt: number; nextRetryIn: number;
}
export interface Attachment extends ProviderObject {
  type?: string; url?: string; previewUrl?: string; mimeType?: string; fileName?: string;
  width?: number; height?: number; duration?: number; fileSize?: Id;
  id?: string; linkUrl?: string; raw?: ProviderObject;
}
export interface MessageReaction extends ProviderObject { senderId: string; emoji: string; timestampMs?: number; raw?: ProviderObject; }
export interface IncomingMessage extends ProviderObject {
  id?: string; messageID?: string; messageId?: string;
  text?: string; body?: string; senderId?: Id; userID?: Id;
  threadId?: Id; threadID?: Id; replyToID?: Id;
  nativeThreadId?: NativeThreadId; clientContext?: string | null;
  timestampMs?: number; attachments?: Attachment[];
  itemId?: string; itemType?: string; threadFbid?: string; fromMe?: boolean; isGroup?: boolean; nativeDirect?: boolean;
  media?: Attachment; reactions?: MessageReaction[]; raw?: ProviderObject;
}
export interface ThreadUpdate extends ProviderObject {
  id: NativeThreadId; threadId: NativeThreadId; nativeThreadId: NativeThreadId;
  change: 'snapshot' | 'add' | 'replace' | 'remove'; property?: string; sequence?: Id;
  initial?: boolean; raw?: unknown;
}
export type InstagramEvent =
  | { type: 'message'; data: IncomingMessage; timestamp?: number }
  | { type: 'messageEdit'; data: IncomingMessage & { messageId: string; newText: string }; timestamp?: number }
  | { type: 'messageUnsend'; data: IncomingMessage & { messageId: string }; timestamp?: number }
  | { type: 'threadUpdate'; data: ThreadUpdate; timestamp?: number }
  | { type: 'ready' | 'reconnected' | 'disconnected' | 'closed' | 'error' | 'raw' | 'typing' | 'presence' | 'reaction' | 'readReceipt' | 'unseenCount' | 'deviceDataChanged' | 'potential_message_gap'; data: ProviderObject; timestamp?: number };
export interface RealtimeEvents { event: InstagramEvent; state: ConnectionState; listenerError: InstagramError; }
export interface ClientEvents extends RealtimeEvents { handlerError: import('./receiving.js').HandlerError; }
export interface RealtimeController {
  readonly state: ConnectionState;
  start(): Promise<this>;
  close(): Promise<void>;
  on<K extends keyof RealtimeEvents>(event: K, listener: (payload: RealtimeEvents[K]) => void): this;
  once<K extends keyof RealtimeEvents>(event: K, listener: (payload: RealtimeEvents[K]) => void): this;
  off<K extends keyof RealtimeEvents>(event: K, listener: (payload: RealtimeEvents[K]) => void): this;
}
export interface MqttRealtimeOptions {
  transport?: 'mqtt'; reconnectPolicy?: ReconnectPolicy; connectTimeout?: number;
  maxPayloadBytes?: number; maxRecentMessages?: number; sendTimeout?: number; maxPendingSends?: number;
  getBootstrap?: (options: { signal: AbortSignal }) => IrisBootstrap | Promise<IrisBootstrap>;
}
export interface IrisBootstrap { sequenceId: Id; snapshotAtMs: number; deviceId: string; actorId: Id; threads?: DirectThread[]; }
export interface IrisSendOptions { replyToId?: string; replyToClientContext?: string; clientContext?: string; signal?: AbortSignal; }
export interface IrisActivityResult { nativeThreadId: string; clientContext: string; active: boolean; deliveryStatus: 'acknowledged'; }
export interface IrisSendResult extends ProviderObject { messageId: string; itemId?: string; nativeThreadId: string; clientContext: string; deliveryStatus: 'confirmed'; }
export type RealtimeOptions = MqttRealtimeOptions;
export interface MqttController extends RealtimeController {
  readonly lastSeqId: string | null;
  readonly pendingCount: number;
  sendText(nativeThreadId: NativeThreadId, text: string, options?: IrisSendOptions): Promise<IrisSendResult>;
  sendLike(nativeThreadId: NativeThreadId, options?: Pick<IrisSendOptions, 'clientContext' | 'signal'>): Promise<IrisSendResult>;
  sendMediaShare(nativeThreadId: NativeThreadId, mediaId: Id, options?: Pick<IrisSendOptions, 'clientContext' | 'signal'> & { isClip?: boolean }): Promise<IrisSendResult>;
  indicateTyping(nativeThreadId: NativeThreadId, active?: boolean, options?: Pick<IrisSendOptions, 'clientContext' | 'signal'>): Promise<IrisActivityResult>;
}
export interface MqttListenerOptions extends Omit<MqttRealtimeOptions, 'transport'> { session: WebSession; }
