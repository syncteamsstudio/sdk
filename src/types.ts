import type { ExecutionEvent } from './event-types';

export enum WorkflowStatus {
  QUEUED = 'QUEUED',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  CANCELED = 'CANCELED',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
}

export enum ApprovalDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export enum WorkflowEventType {
  // Non-Team Events
  UserInputEvent = 'UserInputEvent',
  TaskApprovalRequestEvent = 'TaskApprovalRequestEvent',
  TaskApprovalResponseEvent = 'TaskApprovalResponseEvent',
  ConnectorInputEvent = 'ConnectorInputEvent',

  // Team Events
  TeamKickoffStartedEvent = 'TeamKickoffStartedEvent',
  TeamKickoffCompletedEvent = 'TeamKickoffCompletedEvent',
  TeamKickoffFailedEvent = 'TeamKickoffFailedEvent',
  TeamTestStartedEvent = 'TeamTestStartedEvent',
  TeamTestCompletedEvent = 'TeamTestCompletedEvent',
  TeamTestResultEvent = 'TeamTestResultEvent',
  TeamTestFailedEvent = 'TeamTestFailedEvent',
  TeamTrainStartedEvent = 'TeamTrainStartedEvent',
  TeamTrainCompletedEvent = 'TeamTrainCompletedEvent',
  TeamTrainFailedEvent = 'TeamTrainFailedEvent',

  // Agent Events
  AgentExecutionStartedEvent = 'AgentExecutionStartedEvent',
  AgentExecutionCompletedEvent = 'AgentExecutionCompletedEvent',
  AgentExecutionErrorEvent = 'AgentExecutionErrorEvent',
  AgentLogsExecutionEvent = 'AgentLogsExecutionEvent',
  AgentLogsStartedEvent = 'AgentLogsStartedEvent',
  AgentReasoningStartedEvent = 'AgentReasoningStartedEvent',
  AgentReasoningCompletedEvent = 'AgentReasoningCompletedEvent',
  AgentReasoningFailedEvent = 'AgentReasoningFailedEvent',

  // Lite Agent Events
  LiteAgentExecutionStartedEvent = 'LiteAgentExecutionStartedEvent',
  LiteAgentExecutionCompletedEvent = 'LiteAgentExecutionCompletedEvent',

  // Task Events
  TaskStartedEvent = 'TaskStartedEvent',
  TaskCompletedEvent = 'TaskCompletedEvent',
  TaskFailedEvent = 'TaskFailedEvent',
  TaskEvaluationEvent = 'TaskEvaluationEvent',

  // Flow Events
  FlowStartedEvent = 'FlowStartedEvent',
  FlowFinishedEvent = 'FlowFinishedEvent',

  // Method Events
  MethodExecutionStartedEvent = 'MethodExecutionStartedEvent',
  MethodExecutionFinishedEvent = 'MethodExecutionFinishedEvent',
  MethodExecutionFailedEvent = 'MethodExecutionFailedEvent',

  // Tool Events
  ToolUsageStartedEvent = 'ToolUsageStartedEvent',
  ToolUsageFinishedEvent = 'ToolUsageFinishedEvent',
  ToolUsageErrorEvent = 'ToolUsageErrorEvent',
  ToolValidateInputErrorEvent = 'ToolValidateInputErrorEvent',
  ToolExecutionErrorEvent = 'ToolExecutionErrorEvent',
  ToolSelectionErrorEvent = 'ToolSelectionErrorEvent',

  // LLM Events
  LLMCallStartedEvent = 'LLMCallStartedEvent',
  LLMCallCompletedEvent = 'LLMCallCompletedEvent',
  LLMCallFailedEvent = 'LLMCallFailedEvent',
  LLMStreamChunkEvent = 'LLMStreamChunkEvent',
  LLMGuardrailStartedEvent = 'LLMGuardrailStartedEvent',
  LLMGuardrailCompletedEvent = 'LLMGuardrailCompletedEvent',

  // Knowledge Events
  KnowledgeRetrievalStartedEvent = 'KnowledgeRetrievalStartedEvent',
  KnowledgeRetrievalCompletedEvent = 'KnowledgeRetrievalCompletedEvent',
  KnowledgeQueryStartedEvent = 'KnowledgeQueryStartedEvent',
  KnowledgeQueryCompletedEvent = 'KnowledgeQueryCompletedEvent',
  KnowledgeQueryFailedEvent = 'KnowledgeQueryFailedEvent',
  KnowledgeSearchQueryFailedEvent = 'KnowledgeSearchQueryFailedEvent',

  // Memory Events
  MemorySaveStartedEvent = 'MemorySaveStartedEvent',
  MemorySaveCompletedEvent = 'MemorySaveCompletedEvent',
  MemorySaveFailedEvent = 'MemorySaveFailedEvent',
  MemoryQueryStartedEvent = 'MemoryQueryStartedEvent',
  MemoryQueryCompletedEvent = 'MemoryQueryCompletedEvent',
  MemoryQueryFailedEvent = 'MemoryQueryFailedEvent',
  MemoryRetrievalStartedEvent = 'MemoryRetrievalStartedEvent',
  MemoryRetrievalCompletedEvent = 'MemoryRetrievalCompletedEvent',
}

export interface TaskEventLog {
  eventType: WorkflowEventType | string;
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
