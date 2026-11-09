import type { InstagramClient, InstagramError } from './index.js';
import type { DirectThread, RequestOptions, ProviderObject, SentMessage } from './common.js';
import type { IncomingMessage, IrisSendResult } from './realtime.js';

export interface ReceivingOptions { maxQueue?: number; maxHandlers?: number; receiveOwnMessages?: boolean; }
export interface HandlerOptions { group?: number; }
export type MessageFilter<T = ReceivedMessage> = (message: T, client?: InstagramClient) => boolean | Promise<boolean>;
export type MessageHandler<T = ReceivedMessage> = (message: T, client: InstagramClient) => unknown | Promise<unknown>;
export type Unsubscribe = () => void;
export interface HandlerRegistration<T> {
  (handler: MessageHandler<T>, options?: HandlerOptions): Unsubscribe;
  (filter: MessageFilter<T>, handler: MessageHandler<T>, options?: HandlerOptions): Unsubscribe;
}
export interface HandlerError extends InstagramError { updateType?: string; group?: number; }
export interface ReceivedMessage extends IncomingMessage {
  id: string; senderId: string; text: string;
  newText?: string;
  getThread(options?: RequestOptions): Promise<DirectThread>;
  replyText(text: string, options?: RequestOptions): Promise<SentMessage | IrisSendResult>;
  replyPhoto(data: Uint8Array, options?: RequestOptions & { mimeType?: 'image/jpeg' | 'image/png' }): Promise<SentMessage>;
  replyVideo(data: Uint8Array, options?: RequestOptions & { mimeType?: string }): Promise<SentMessage>;
  replyVoice(data: Uint8Array, options?: RequestOptions & { mimeType?: string }): Promise<SentMessage>;
  replyAttachment(options: Omit<import('./features.js').AttachmentOptions, 'replyToMessageId'>): Promise<SentMessage>;
  markSeen(options?: RequestOptions): Promise<ProviderObject>;
  react(emoji: string, options?: RequestOptions & { remove?: boolean }): Promise<ProviderObject>;
  downloadMedia(options?: import('./features.js').DownloadMediaOptions): Promise<string>;
}
export interface Filters {
  text: MessageFilter; photo: MessageFilter; video: MessageFilter; voice: MessageFilter; media: MessageFilter;
  gif: MessageFilter; reel: MessageFilter; post: MessageFilter; link: MessageFilter; like: MessageFilter;
  self: MessageFilter; me: MessageFilter; incoming: MessageFilter; private: MessageFilter; group: MessageFilter;
  all(...filters: MessageFilter[]): MessageFilter;
  any(...filters: MessageFilter[]): MessageFilter;
  not(filter: MessageFilter): MessageFilter;
  create(filter: MessageFilter): MessageFilter;
  chat(threadId: import('./common.js').NativeThreadId): MessageFilter;
  fromUser(userId: import('./common.js').UserPk): MessageFilter;
  regex(pattern: RegExp | string, flags?: string): MessageFilter;
  command(names: string | string[], options?: { prefix?: string; caseSensitive?: boolean }): MessageFilter;
}
export const filters: Readonly<Filters>;
