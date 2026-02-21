// Event data types for workflow events

export interface ToolResult {
  result?: string;
  tool_name?: string;
}

export interface AgentExecutorConfig {
  tools_names?: string;
  max_iter?: number;
  use_stop_words?: boolean;
  tools_description?: string;
  respect_context_window?: boolean;
  ask_for_human_input?: boolean;
  iterations?: number;
  log_error_after?: number;
}

export interface LlmConfig {
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  api_key?: string;
  context_window_size?: number;
  is_anthropic?: boolean;
  stream?: boolean;
}

export interface EmbedderConfig {
  model?: string;
  api_key?: string;
}

export interface CrewUsageMetrics {
  total_tokens?: number;
  prompt_tokens?: number;
  cached_prompt_tokens?: number;
  completion_tokens?: number;
  successful_requests?: number;
}

export interface Tool {
  name?: string;
  description?: string;
  description_updated?: boolean;
  result_as_answer?: boolean;
  current_usage_count?: number;
}

export interface TaskContextItem {
  name?: string;
  prompt_context?: string;
  description?: string;
  used_tools?: number;
  tools_errors?: number;
  delegations?: number;
  expected_output?: string;
  async_execution?: boolean;
  human_input?: boolean;
  markdown?: boolean;
  max_retries?: number;
  retry_count?: number;
}

export interface TaskOutput {
  description?: string;
  name?: string;
  expected_output?: string;
  summary?: string;
  json_dict?: Record<string, unknown>;
  raw?: string;
  agent?: string;
  output_format?: string;
  pydantic?: Record<string, unknown>;
}

export interface Agent {
  role?: string;
  goal?: string;
  backstory?: string;
  cache?: boolean;
  verbose?: boolean;
  allow_delegation?: boolean;
  tools?: Tool[];
  max_iter?: number;
  agent_executor?: AgentExecutorConfig;
  llm?: LlmConfig;
  team?: TeamConfig;
  tools_results?: ToolResult[];
  multimodal?: boolean;
  reasoning?: boolean;
  embedder?: EmbedderConfig;
  respect_context_window?: boolean;
  max_retry_limit?: number;
  inject_date?: boolean;
  date_format?: string;
  guardrail_max_retries?: number;
}

export interface Task {
  name?: string;
  prompt_context?: string;
  description?: string;
  expected_output?: string;
  used_tools?: number;
  tools_errors?: number;
  delegations?: number;
  context?: TaskContextItem[] | Record<string, unknown>;
  output?: TaskOutput;
  agent?: Agent;
  async_execution?: boolean;
  tools?: Tool[];
  human_input?: boolean;
  max_retries?: number;
  retry_count?: number;
  output_pydantic?: string;
  guardrail_max_retries?: number;
  guardrails?: unknown[];
  processed_by_agents?: string[];
  start_time?: string;
  end_time?: string;
}

export interface TeamConfig {
  name?: string;
  tasks?: Task[];
  agents?: Agent[];
  process?: string;
  verbose?: boolean;
  memory?: boolean;
  embedder?: EmbedderConfig;
  usage_metrics?: CrewUsageMetrics;
  planning?: boolean;
  execution_logs?: unknown[];
  knowledge_sources?: unknown[];
}

export interface LlmCall {
  role?: string;
  content?: string;
}

export interface ExecutionEvent {
  message?: string;
  iteration?: number;
  feedback?: string;
  result?: string;
  prompt?: string;
  timestamp?: string;
  type?: string;
  agent?: Agent;
  tools?: Tool[];
  task?: Task;
  output?: TaskOutput | string | unknown;
  context?: string;
  team_name?: string;
  inputs?: string | Record<string, unknown>;
  task_name?: string;
  agent_role?: string;
  messages?: LlmCall[];
  error?: string;
  tool_name?: string;
  tool_args?: string | Record<string, unknown>;
  tool_class?: string;
  agent_key?: string;
  started_at?: string;
  finished_at?: string;
  from_cache?: boolean;
  team?: TeamConfig;
  quality?: number;
  execution_duration?: number;
  model?: string;
}
