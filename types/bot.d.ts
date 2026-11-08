import type { InstagramClient } from './index.js';
import type { ProviderObject, SentMessage } from './common.js';
import type { IrisSendResult, MqttRealtimeOptions } from './realtime.js';

export type BotReply = SentMessage | IrisSendResult;
export interface BotAttachment { type: string; url: string; previewUrl: string; }

export interface BotMessage {
  type: 'message' | 'messageEdit' | 'messageUnsend';
  id: string; senderId: string; threadId: string;
  threadKey: string; text: string; attachments: BotAttachment[]; fromMe: boolean;
  nativeThreadId?: string; clientContext?: string; messageId?: string;
}
export interface BotStatus { type: string; name?: string; code?: string; status?: number; transport?: 'mqtt'; dropped?: number; }
export interface CommandContext {
  bot: SimpleBot; client: InstagramClient; message: BotMessage; argument: string;
  reply(text: string): Promise<BotReply>;
  replyResult(value: unknown): Promise<BotReply>;
}
export interface BotCommand { name: string; usage?: string; admin?: boolean; run(context: CommandContext): unknown | Promise<unknown>; }
export interface SimpleBotOptions {
  client: InstagramClient; prefix?: string; admins?: string[]; transport?: 'mqtt';
  realtime?: Omit<MqttRealtimeOptions, 'transport'>;
  maxQueue?: number; maxRecent?: number; maxCached?: number;
  logger?: (type: string, data: ProviderObject) => void; clock?: () => number;
}
export class SimpleBot {
  constructor(options: SimpleBotOptions);
  readonly client: InstagramClient; prefix: string; transport: 'mqtt';
  logger: (type: string, data: ProviderObject) => void;
  commands: Map<string, BotCommand>;
  isAdmin(senderId: string): boolean;
  start(): Promise<this>;
  close(): Promise<void>;
  enqueue(event: unknown): boolean;
  processEvent(event: unknown): Promise<void>;
  dispatch(message: BotMessage, name: string, argument: string): Promise<void>;
  reply(message: BotMessage, text: string): Promise<BotReply>;
  log(type: string, data?: ProviderObject): void;
  on(event: 'status', listener: (status: BotStatus) => void): this;
  once(event: 'status', listener: (status: BotStatus) => void): this;
  off(event: 'status', listener: (status: BotStatus) => void): this;
}
export function normalizeMessage(event: unknown): BotMessage | null;
