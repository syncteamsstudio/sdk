export type ErrorResponseData = Record<string, unknown> | string | null;

export interface WorkflowAPIErrorRequest {
  method: string;
  url: string;
  body?: unknown;
}

export interface WorkflowAPIErrorInit {
  message: string;
  status: number;
  statusText?: string;
  headers?: Headers | Record<string, string>;
  data?: ErrorResponseData;
  request: WorkflowAPIErrorRequest;
  cause?: unknown;
}

/**
 * Raised when the SyncTeams API returns a non-2xx response or the request fails irrecoverably.
 * Surfaces HTTP metadata and the parsed response body to aid in caller debugging.
 */
export class WorkflowAPIError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Record<string, string>;
  readonly data: ErrorResponseData;
  readonly request: WorkflowAPIErrorRequest;
  readonly cause?: unknown;

  constructor(init: WorkflowAPIErrorInit) {
    super(init.message);
    this.name = 'WorkflowAPIError';
    this.status = init.status;
    this.statusText = init.statusText ?? '';
    this.headers = normalizeHeaders(init.headers);
    this.data = init.data ?? null;
    this.request = init.request;

    // Manually set cause for better compatibility
    if (init.cause !== undefined) {
      this.cause = init.cause;
    }
  }
}

export function isWorkflowAPIError(error: unknown): error is WorkflowAPIError {
  return error instanceof WorkflowAPIError;
}

function normalizeHeaders(
  headers?: Headers | Record<string, string>,
): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const normalized: Record<string, string> = {};
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  return { ...headers };
}
