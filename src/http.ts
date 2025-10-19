import { WorkflowAPIError } from './errors';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  RequestOptions,
  WorkflowClientOptions,
  WorkflowClientRetryConfig,
} from './types';

const DEFAULT_RETRYABLE_STATUSES = [
  408, // Request Timeout
  425, // Too Early
  429, // Too Many Requests
];

const SDK_VERSION = '0.1.0';

interface NormalizedRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs: number;
  retry: Required<WorkflowClientRetryConfig>;
}

interface HttpClientOptions extends WorkflowClientOptions {
  baseUrl: string; // Required for HttpClient
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly defaultTimeout: number;
  private readonly defaultRetry: Required<WorkflowClientRetryConfig>;

  constructor(options: HttpClientOptions) {
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new Error(
        'No fetch implementation available. Provide options.fetch when constructing the client.',
      );
    }

    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.fetchImpl = fetchImpl.bind(globalThis);
    this.defaultHeaders = buildDefaultHeaders(
      this.apiKey,
      options.defaultHeaders,
      options.userAgentSuffix,
    );
    this.defaultTimeout = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.defaultRetry = normalizeRetryConfig(options.retry);
  }

  async request<TResponse = unknown>(
    path: string,
    init: RequestOptions = {},
  ): Promise<TResponse> {
    const resolved = this.normalizeInit(init);
    const url = this.resolveUrl(path);
    const body = resolved.body ?? init.body;

    const headers = this.mergeHeaders(init.headers, body);

    const requestInit: RequestInit = {
      ...resolved,
      headers,
      body: serializeBody(body, headers),
    };

    delete (requestInit as any).timeoutMs;
    delete (requestInit as any).retry;

    const requestDescriptor = {
      method: (requestInit.method ?? 'GET').toUpperCase(),
      url,
      body: prepareDebugBody(body),
    };

    const maxAttempts = resolved.retry.maxAttempts;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.performRequest(
          url,
          requestInit,
          resolved.timeoutMs,
        );

        if (response.ok) {
          return (await parseSuccessResponse(
            response,
            requestDescriptor,
          )) as TResponse;
        }

        const error = await toWorkflowError(response, requestDescriptor);

        if (
          attempt < maxAttempts &&
          shouldRetry(response.status, resolved.retry)
        ) {
          await delayWithBackoff(attempt, resolved.retry);
          continue;
        }

        throw error;
      } catch (error) {
        if (error instanceof WorkflowAPIError) {
          throw error;
        }

        if (
          attempt < maxAttempts &&
          isRetryableNetworkError(error) &&
          resolved.retry.maxAttempts > 1
        ) {
          await delayWithBackoff(attempt, resolved.retry);
          continue;
        }

        throw new WorkflowAPIError({
          message:
            error instanceof Error
              ? error.message
              : 'Request failed without a message',
          status: 0,
          statusText: 'NETWORK_ERROR',
          data: null,
          headers: {},
          request: requestDescriptor,
          cause: error,
        });
      }
    }

    // Should never reach here
    throw new WorkflowAPIError({
      message: 'Exceeded maximum retry attempts',
      status: 0,
      statusText: 'RETRY_EXHAUSTED',
      data: null,
      headers: {},
      request: requestDescriptor,
    });
  }

  private resolveUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private normalizeInit(init: RequestOptions): NormalizedRequestInit {
    const retry = normalizeRetryConfig(init.retry, this.defaultRetry);
    const timeoutMs = init.timeoutMs ?? this.defaultTimeout;

    return {
      ...init,
      timeoutMs,
      retry,
      method: (init.method ?? 'GET').toUpperCase(),
    };
  }

  private mergeHeaders(customHeaders?: HeadersInit, body?: unknown): Headers {
    const headers = new Headers(this.defaultHeaders);

    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => headers.set(key, value));
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => headers.set(key, value));
    } else if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, value]) =>
        headers.set(key, value),
      );
    }

    if (
      body != null &&
      typeof body === 'object' &&
      !(body instanceof ArrayBuffer) &&
      !(body instanceof Blob) &&
      !(body instanceof FormData) &&
      headers.get('content-type') == null
    ) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private async performRequest(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal = init.signal;

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', () => controller.abort(), {
          once: true,
        });
      }
    }

    try {
      const response = await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (controller.signal.aborted) {
        if (externalSignal?.aborted) {
          throw error;
        }
        throw new Error(
          `Request aborted after ${timeoutMs}ms (${init.method ?? 'GET'} ${url})`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildDefaultHeaders(
  apiKey: string,
  overrides?: Record<string, string>,
  userAgentSuffix?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': buildUserAgent(userAgentSuffix),
    'x-api-key': apiKey,
  };

  if (overrides) {
    Object.entries(overrides).forEach(([key, value]) => {
      headers[key] = value;
    });
  }

  return headers;
}

function buildUserAgent(userAgentSuffix?: string): string {
  const base = `syncteams-sdk/${SDK_VERSION}`;
  if (!userAgentSuffix) {
    return base;
  }
  return `${base} ${userAgentSuffix}`.trim();
}

function normalizeRetryConfig(
  retry?: WorkflowClientRetryConfig,
  fallback?: Required<WorkflowClientRetryConfig>,
): Required<WorkflowClientRetryConfig> {
  const base: Required<WorkflowClientRetryConfig> = fallback ?? {
    maxAttempts: 3,
    initialDelayMs: 1_000,
    backoffFactor: 2,
    maxDelayMs: 30_000,
    retryOnStatuses: [...DEFAULT_RETRYABLE_STATUSES, ...range(500, 599)],
  };

  if (!retry) {
    return base;
  }

  return {
    maxAttempts: Math.max(retry.maxAttempts ?? base.maxAttempts, 1),
    initialDelayMs: retry.initialDelayMs ?? base.initialDelayMs,
    backoffFactor: retry.backoffFactor ?? base.backoffFactor,
    maxDelayMs: retry.maxDelayMs ?? base.maxDelayMs,
    retryOnStatuses:
      Array.isArray(retry.retryOnStatuses) && retry.retryOnStatuses.length > 0
        ? retry.retryOnStatuses
        : base.retryOnStatuses,
  };
}

async function parseSuccessResponse(
  response: Response,
  request: { method: string; url: string },
): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    return response.text();
  }

  try {
    return await response.json();
  } catch (error) {
    throw new WorkflowAPIError({
      message: 'Failed to parse JSON response',
      status: response.status,
      statusText: response.statusText,
      data: null,
      headers: response.headers,
      request,
      cause: error,
    });
  }
}

async function toWorkflowError(
  response: Response,
  requestDescriptor: { method: string; url: string; body?: unknown },
): Promise<WorkflowAPIError> {
  const data = await parseErrorBody(response);
  return new WorkflowAPIError({
    message: buildErrorMessage(response, data),
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data,
    request: requestDescriptor,
    cause: undefined,
  });
}

async function parseErrorBody(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  try {
    if (isJson) {
      return await response.json();
    }
    const text = await response.text();
    return text.length ? text : null;
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildErrorMessage(response: Response, data: unknown): string {
  if (typeof data === 'string' && data.length) {
    return `${response.status} ${response.statusText}: ${data}`;
  }

  if (data && typeof data === 'object') {
    const message =
      (data as Record<string, unknown>).message ??
      (data as Record<string, unknown>).error;
    if (typeof message === 'string' && message.length) {
      return `${response.status} ${response.statusText}: ${message}`;
    }
  }

  return `${response.status} ${response.statusText}`;
}

function shouldRetry(
  status: number,
  retry: Required<WorkflowClientRetryConfig>,
): boolean {
  return retry.retryOnStatuses.includes(status);
}

async function delayWithBackoff(
  attempt: number,
  retry: Required<WorkflowClientRetryConfig>,
): Promise<void> {
  const exponent = Math.max(0, attempt - 1);
  const rawDelay =
    retry.initialDelayMs * Math.pow(retry.backoffFactor, exponent);
  const delayMs = Math.min(rawDelay, retry.maxDelayMs);

  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (error instanceof Error) {
    const retryableMessages = [
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      'ETIMEDOUT',
      'socket hang up',
    ];
    return retryableMessages.some((msg) =>
      error.message.toUpperCase().includes(msg),
    );
  }

  return false;
}

function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body == null) {
    return undefined;
  }

  if (body instanceof URLSearchParams) {
    return body;
  }

  if (
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  ) {
    return body as BodyInit;
  }

  if (
    typeof body === 'object' &&
    headers.get('Content-Type')?.includes('application/json')
  ) {
    return JSON.stringify(body);
  }

  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}

function prepareDebugBody(body: unknown): unknown {
  if (body == null) {
    return undefined;
  }

  if (
    typeof body === 'string' ||
    typeof body === 'number' ||
    typeof body === 'boolean'
  ) {
    return body;
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  if ((body as any)?.toString === JSON.stringify) {
    return JSON.parse(body as string);
  }

  if (typeof body === 'object') {
    try {
      return JSON.parse(JSON.stringify(body));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function range(start: number, endInclusive: number): number[] {
  const values: number[] = [];
  for (let value = start; value <= endInclusive; value++) {
    values.push(value);
  }
  return values;
}
