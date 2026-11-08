import type { JsonObject, RequestOptions, WebSession, LoggingOptions } from './common.js';
import type { MqttController, MqttListenerOptions } from './realtime.js';
export type { MqttListenerOptions } from './realtime.js';

export const IG_APP_ID: '936619743392459';
export function parseCookies(cookies: string): Map<string, string>;
export function serializeCookies(cookies: Iterable<readonly [string, string]>): string;
export function parseInstagramJson(text: string): JsonObject;
export function parseSession(html: string, cookies: string): WebSession;
export function validateSession(session: unknown): WebSession;
export function createSession(http: Pick<HttpTransport, 'getText' | 'cookies'>, options?: RequestOptions): Promise<WebSession>;
export function generateTotp(secretOrOtp: string, options?: { now?: number; digits?: 6 | 7 | 8; period?: number }): string;
export interface HttpOptions extends LoggingOptions {
  cookies?: string; session?: WebSession; fetch?: typeof globalThis.fetch; timeoutMs?: number; maxResponseBytes?: number;
}
export type FormFields = Record<string, string | number | bigint | boolean | null | undefined>;
export interface HttpRequestOptions extends RequestOptions {
  query?: Record<string, string | number | bigint | boolean | null | undefined>;
  headers?: Record<string, string>;
}
export class HttpTransport {
  constructor(options?: HttpOptions);
  readonly cookies: string; readonly signal: AbortSignal; session: WebSession | undefined;
  setCookies(cookies: string): void;
  form(extra?: FormFields): FormFields;
  get(path: string | URL, options?: HttpRequestOptions): Promise<JsonObject>;
  getText(path: string | URL, options?: HttpRequestOptions): Promise<string>;
  post(path: string | URL, form: FormFields, options?: HttpRequestOptions): Promise<JsonObject>;
  postBatch(path: string | URL, form: FormFields, options?: HttpRequestOptions): Promise<JsonObject[]>;
  graphql(docId: string | number, variables: JsonObject, options?: HttpRequestOptions & { friendlyName?: string; actor?: 'account' | 'viewer'; endpoint?: '/api/graphql' | '/graphql/query'; guard?: () => void }): Promise<JsonObject>;
  upload(path: string | URL, options: HttpRequestOptions & { data: Uint8Array; mimeType?: string }): Promise<JsonObject>;
  multipart(path: string | URL, form: FormData, options?: HttpRequestOptions): Promise<JsonObject>;
  close(): void;
}
export interface MqttListener extends MqttController {}
export class MqttListener {
  constructor(options: MqttListenerOptions);
  readonly lastSeqId: string | null;
}
