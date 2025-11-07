# Changelog

All notable changes to this project will be documented in this file.

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

