import { HttpClient } from './http';
import { WorkflowAPIError } from './errors';
import {
  ApprovalDecision,
  DEFAULT_BASE_URL,
  DEFAULT_MAX_WAIT_TIME_MS,
  DEFAULT_POLL_INTERVAL_MS,
  ExecuteAndWaitOptions,
  ExecuteWorkflowInput,
  ExecuteWorkflowResponse,
  TaskStatusResponse,
  WaitForCompletionOptions,
  WorkflowClientOptions,
  WorkflowStatus,
} from './types';

const TERMINAL_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.COMPLETED,
  WorkflowStatus.FAILED,
  WorkflowStatus.CANCELED,
];

export class WorkflowClient {
  private readonly http: HttpClient;

  constructor(private readonly options: WorkflowClientOptions) {
    if (!options.apiKey) {
      throw new Error('apiKey is required when constructing WorkflowClient');
    }

    this.http = new HttpClient({
      ...options,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
    });
  }

  /**
   * Initiates a workflow run.
   */
  async executeWorkflow(
    input: ExecuteWorkflowInput,
  ): Promise<ExecuteWorkflowResponse> {
    assertString(input.workflowId, 'workflowId');
    ensureSerializable(input.input, 'input');

    const payload = {
      workflowId: input.workflowId,
      uniqueId: input.uniqueId,
      input: input.input,
    };

    return this.http.request<ExecuteWorkflowResponse>('/api/v1', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Retrieves the latest status for a given task.
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    assertString(taskId, 'taskId');

    const query = new URLSearchParams({ taskId });
    return this.http.request<TaskStatusResponse>(
      `/api/v1/status?${query.toString()}`,
      {
        method: 'GET',
      },
    );
  }

  /**
   * Continues a waiting workflow with an approval decision.
   */
  async continueTask(params: {
    taskId: string;
    decision: ApprovalDecision;
    message?: string;
  }): Promise<TaskStatusResponse> {
    const { taskId, decision, message } = params;
    assertString(taskId, 'taskId');

    if (decision === ApprovalDecision.REJECT && !message) {
      throw new Error('message is required when decision is REJECT');
    }

    const payload = {
      taskId,
      type: decision,
      message,
    };

    return this.http.request<TaskStatusResponse>('/api/v1/continue', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Polls until the task reaches a terminal status (COMPLETED, FAILED, CANCELED by default).
   */
  async waitForCompletion(
    taskId: string,
    options: WaitForCompletionOptions = {},
  ): Promise<TaskStatusResponse> {
    assertString(taskId, 'taskId');

    const {
      pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
      maxWaitTimeMs = DEFAULT_MAX_WAIT_TIME_MS,
      terminalStatuses = TERMINAL_STATUSES,
      exitOnWaiting = false,
      signal,
      onUpdate,
    } = options;

    const terminalSet = new Set<WorkflowStatus>(terminalStatuses);
    const startedAt = Date.now();
    let lastStatus: WorkflowStatus | undefined;

    while (true) {
      if (signal?.aborted) {
        throw abortedError(signal);
      }

      const status = await this.getTaskStatus(taskId);

      if (status.status !== lastStatus) {
        lastStatus = status.status;
        onUpdate?.(status);
      }

      const isTerminal = terminalSet.has(status.status);
      const isWaiting = status.status === WorkflowStatus.WAITING;

      if (isTerminal || (isWaiting && exitOnWaiting)) {
        return status;
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed >= maxWaitTimeMs) {
        throw new WorkflowAPIError({
          message: `Timed out after ${maxWaitTimeMs}ms waiting for task ${taskId}`,
          status: 0,
          statusText: 'POLL_TIMEOUT',
          data: {
            taskId,
            lastStatus: status.status,
          },
          headers: {},
          request: {
            method: 'GET',
            url: `/api/v1/status?taskId=${taskId}`,
          },
        });
      }

      await sleep(pollIntervalMs, signal);
    }
  }

  /**
   * Convenience helper that kicks off a workflow and optionally waits until completion.
   * Supports approval callbacks via onWaiting.
   */
  async executeAndWait(
    input: ExecuteWorkflowInput,
    options: ExecuteAndWaitOptions = {},
  ): Promise<TaskStatusResponse> {
    const { onWaiting, ...waitOptions } = options;
    const initial = await this.executeWorkflow(input);

    if (!onWaiting) {
      return this.waitForCompletion(initial.taskId, waitOptions);
    }

    let continuePolling = true;

    while (continuePolling) {
      const current = await this.waitForCompletion(initial.taskId, {
        ...waitOptions,
        exitOnWaiting: true,
      });

      if (current.status !== WorkflowStatus.WAITING) {
        return current;
      }

      continuePolling = await onWaiting(current);
      if (!continuePolling) {
        return current;
      }
    }

    // This should never be reached since continuePolling starts as true
    // and the loop will always execute at least once and return
    throw new Error('Unexpected: executeAndWait exited without returning');
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = () => {
      cleanup();
      reject(abortedError(signal));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
    };

    if (signal.aborted) {
      cleanup();
      reject(abortedError(signal));
      return;
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

function ensureSerializable(value: unknown, field: string): void {
  try {
    JSON.stringify(value);
  } catch {
    throw new Error(`${field} must be JSON serializable`);
  }
}

function abortedError(signal: AbortSignal): DOMException {
  return signal.reason instanceof DOMException &&
    signal.reason.name === 'AbortError'
    ? signal.reason
    : new DOMException('The operation was aborted', 'AbortError');
}
