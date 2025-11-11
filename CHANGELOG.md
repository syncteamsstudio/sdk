# Changelog

All notable changes to this project will be documented in this file.

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

