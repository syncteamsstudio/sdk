# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - 2026-03-01

### Added
- Added Stripe-style webhook signature verification helper: `verifyWebhookSignature`
- Added exported webhook header constants: `WEBHOOK_SIGNATURE_HEADER`, `WEBHOOK_TIMESTAMP_HEADER`, `WEBHOOK_EVENT_ID_HEADER`
- Added exported webhook tolerance constant: `DEFAULT_WEBHOOK_TOLERANCE_SECONDS`
- Added webhook signature verification tests
- Added README usage docs for webhook signature verification

## [0.4.0] - 2026-02-23

### Changed
- **Breaking:** Renamed all "Crew" event types to "Team" (e.g. `CrewKickoffStartedEvent` → `TeamKickoffStartedEvent`)
- **Breaking:** Renamed `CrewConfig` type to `TeamConfig`
- **Breaking:** Renamed `Agent.crew` field to `Agent.team`
- **Breaking:** Renamed `ExecutionEvent.crew_name` field to `team_name`
- Updated `ExecutionEvent.inputs` type from `{ message?: string }` to `string | Record<string, unknown>`
- Updated `ExecutionEvent.output` type to `TaskOutput | string | unknown`

### Added
- New event types: `AgentLogsExecutionEvent`, `AgentLogsStartedEvent`, `LiteAgentExecutionStartedEvent`, `LiteAgentExecutionCompletedEvent`, `LLMGuardrailStartedEvent`, `LLMGuardrailCompletedEvent`
- New Memory event types: `MemorySaveStartedEvent`, `MemorySaveCompletedEvent`, `MemorySaveFailedEvent`, `MemoryQueryStartedEvent`, `MemoryQueryCompletedEvent`, `MemoryQueryFailedEvent`, `MemoryRetrievalStartedEvent`, `MemoryRetrievalCompletedEvent`
- New `ExecutionEvent` fields: `tool_name`, `tool_args`, `tool_class`, `agent_key`, `started_at`, `finished_at`, `from_cache`, `team`, `quality`, `execution_duration`, `model`
- New `Agent` fields: `respect_context_window`, `max_retry_limit`, `inject_date`, `date_format`, `guardrail_max_retries`
- New `Task` fields: `output_pydantic`, `guardrail_max_retries`, `guardrails`, `processed_by_agents`, `start_time`, `end_time`
- New `TaskOutput` field: `pydantic`

### Removed
- Removed deprecated event types: `FlowCreatedEvent`, `FlowPlotEvent`, `TaskOutput`

## [0.3.0] - 2025-11-10

### Added
- Converted string union types to enums for better type safety and developer experience
- Added `WorkflowStatus` enum with values: QUEUED, PENDING, RUNNING, WAITING, CANCELED, FAILED, COMPLETED
- Added `ApprovalDecision` enum with values: APPROVE, REJECT
- Added `WorkflowEventType` enum with all workflow event types
- Updated documentation with enum usage examples

### Changed
- `WorkflowStatus`, `ApprovalDecision`, and `WorkflowEventType` are now exported as enums instead of type aliases
- All internal code updated to use enum values for consistency
- Maintains backward compatibility - string values still work alongside enums

## [0.2.0] - 2025-10-28

- Added comprehensive TypeScript types for event data in webhook payloads
- Introduced `ExecutionEvent` type with detailed nested types for agents, tasks, tools, and outputs
- Exported new types: `Agent`, `Task`, `Tool`, `TaskOutput`, `CrewConfig`, `LlmConfig`, `EmbedderConfig`, etc.
- Updated `TaskEventLog.eventData` to use strongly-typed `ExecutionEvent` instead of `any`
- Backend now filters webhook payloads to only include relevant fields using `WebhookEventFilter`

## [0.1.0] - 2025-02-17

- Initial public release of the @syncteams/sdk package
- Added typed WorkflowClient for executing workflows, polling status, and continuing approval flows
- Introduced configurable retries, timeouts, and polling helpers
- Published TypeScript declarations and dual ESM/CJS builds with automated tests

