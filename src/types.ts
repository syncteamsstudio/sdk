import type { ExecutionEvent } from './event-types';

export type WorkflowStatus =
  | 'QUEUED'
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING'
  | 'CANCELED'
  | 'FAILED'
  | 'COMPLETED';

export type ApprovalDecision = 'APPROVE' | 'REJECT';

export type WorkflowEventType =
  | 'UserInputEvent'
  | 'ConnectorInputEvent'
  | 'TaskApprovalRequestEvent'
  | 'TaskApprovalResponseEvent'
  | 'CrewKickoffStartedEvent'
  | 'CrewKickoffCompletedEvent'
  | 'CrewKickoffFailedEvent'
  | 'CrewTestStartedEvent'
  | 'CrewTestCompletedEvent'
  | 'CrewTestFailedEvent'
  | 'CrewTrainStartedEvent'
  | 'CrewTrainCompletedEvent'
  | 'CrewTestResultEvent'
  | 'CrewTrainFailedEvent'
  | 'AgentExecutionStartedEvent'
  | 'AgentExecutionCompletedEvent'
  | 'AgentExecutionErrorEvent'
  | 'AgentReasoningStartedEvent'
  | 'AgentReasoningCompletedEvent'
  | 'AgentReasoningFailedEvent'
  | 'TaskStartedEvent'
  | 'TaskCompletedEvent'
  | 'TaskFailedEvent'
  | 'TaskEvaluationEvent'
  | 'TaskOutput'
  | 'ToolUsageStartedEvent'
  | 'ToolUsageFinishedEvent'
  | 'ToolUsageErrorEvent'
  | 'ToolValidateInputErrorEvent'
  | 'ToolExecutionErrorEvent'
  | 'ToolSelectionErrorEvent'
  | 'KnowledgeRetrievalStartedEvent'
  | 'KnowledgeRetrievalCompletedEvent'
  | 'KnowledgeQueryStartedEvent'
  | 'KnowledgeQueryCompletedEvent'
  | 'KnowledgeQueryFailedEvent'
  | 'KnowledgeSearchQueryFailedEvent'
  | 'FlowCreatedEvent'
  | 'FlowStartedEvent'
  | 'FlowFinishedEvent'
  | 'FlowPlotEvent'
  | 'MethodExecutionStartedEvent'
  | 'MethodExecutionFinishedEvent'
  | 'MethodExecutionFailedEvent'
  | 'LLMCallStartedEvent'
  | 'LLMCallCompletedEvent'
  | 'LLMCallFailedEvent'
  | 'LLMStreamChunkEvent'
  | (string & {});

export interface TaskEventLog {
  eventType: WorkflowEventType;
  eventData: ExecutionEvent;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface ExecuteWorkflowInput {
  workflowId: string;
  input: Record<string, any>;
  uniqueId?: string;
}

export interface ExecuteWorkflowResponse {
  taskId: string;
  status: WorkflowStatus;
}

export interface TaskStatusResponse extends ExecuteWorkflowResponse {
  eventLogs?: TaskEventLog[];
}

export interface WebhookEventPayload {
  taskId: string;
  uniqueId?: string;
  status: WorkflowStatus;
  eventLogs?: TaskEventLog[];
}

export interface ContinueTaskInput {
  taskId: string;
  decision: ApprovalDecision;
  message?: string;
}

export interface WorkflowClientRetryConfig {
  /**
   * Maximum number of requests to attempt (1 means no retries).
   * Defaults to 3.
   */
  maxAttempts?: number;
  /**
   * Delay before the first retry in milliseconds. Defaults to 1_000ms.
   */
  initialDelayMs?: number;
  /**
   * Multiplier applied to the delay between retries (exponential backoff). Defaults to 2.
   */
  backoffFactor?: number;
  /**
   * Maximum delay between retries in milliseconds (cap). Defaults to 30_000ms.
   */
  maxDelayMs?: number;
  /**
   * Specific HTTP status codes that are considered retryable. Defaults to [408, 425, 429, 500-599].
   */
  retryOnStatuses?: number[];
}

export interface WorkflowClientOptions {
  /**
   * Base URL of the SyncTeams API. Defaults to https://api.syncteams.studio
   */
  baseUrl?: string;
  /**
   * API key provisioned for your workspace (format: sts_xxx).
   */
  apiKey: string;
  /**
   * Optional fetch implementation. Defaults to globalThis.fetch when available.
   */
  fetch?: typeof fetch;
  /**
   * Maximum request duration. Defaults to 30_000ms.
   */
  timeoutMs?: number;
  /**
   * Additional headers added to every request. Values are merged with the SDK defaults.
   */
  defaultHeaders?: Record<string, string>;
  /**
   * Retry policy for transient failures.
   */
  retry?: WorkflowClientRetryConfig;
  /**
   * Custom User-Agent string appended to the default header.
   */
  userAgentSuffix?: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  retry?: WorkflowClientRetryConfig;
  timeoutMs?: number;
}

export type WaitForCompletionCallback = (status: TaskStatusResponse) => void;

export interface WaitForCompletionOptions {
  pollIntervalMs?: number;
  maxWaitTimeMs?: number;
  terminalStatuses?: WorkflowStatus[];
  exitOnWaiting?: boolean;
  signal?: AbortSignal;
  onUpdate?: WaitForCompletionCallback;
}

export interface ExecuteAndWaitOptions extends WaitForCompletionOptions {
  /**
   * Optional hook invoked when the workflow enters WAITING status.
   * The function should resolve once the external approval has been handled.
   * Returning false skips further polling, returning true resumes the loop.
   */
  onWaiting?: (status: TaskStatusResponse) => Promise<boolean> | boolean;
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const DEFAULT_POLL_INTERVAL_MS = 2_000;
export const DEFAULT_MAX_WAIT_TIME_MS = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_BASE_URL = 'https://api.syncteams.studio';
