# SyncTeams Workflow SDK

Typed Node.js and TypeScript client for the SyncTeams Workflow API. The SDK wraps the `/api/v1` endpoints, handles authentication, retries, polling, and exposes strongly-typed helpers for common approval flows.

---

## Installation

```bash
# pnpm
pnpm add @syncteamsstudio/sdk

# npm
npm install @syncteamsstudio/sdk

# yarn
yarn add @syncteamsstudio/sdk
```

> **Requirements:** Node.js 18 or newer (built-in `fetch` support) or a custom fetch implementation.

---

## Quick start

```ts
import { WorkflowClient } from '@syncteamsstudio/sdk';

const client = new WorkflowClient({
  apiKey: process.env.SYNCTEAMS_API_KEY!,
  // baseUrl is optional, defaults to https://develop.api.syncteams.studio
});

async function run() {
  const { taskId } = await client.executeWorkflow({
    workflowId: 'crew_onboarding',
    input: { email: 'user@example.com' },
    uniqueId: 'customer-123',
  });

  const result = await client.waitForCompletion(taskId, {
    pollIntervalMs: 2_000,
    onUpdate: ({ status }) => console.log(`[${taskId}] → ${status}`),
  });

  if (result.status === 'COMPLETED') {
    console.log('Workflow finished successfully', result.eventLogs);
  } else {
    console.warn('Workflow ended before completion', result);
  }
}

run().catch((error) => {
  console.error('SyncTeams error', error);
});
```

---

## `WorkflowClient` configuration

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | ✅ | – | API key that starts with `sts_`. |
| `baseUrl` | ❌ | `https://develop.api.syncteams.studio` | SyncTeams API origin. Override for production or other environments. |
| `fetch` | ❌ | `globalThis.fetch` | Custom fetch implementation for Node < 18 or custom transports. |
| `timeoutMs` | ❌ | `30_000` | Per-request timeout in milliseconds. |
| `defaultHeaders` | ❌ | `{ Accept: 'application/json' }` | Additional headers appended to every request. |
| `retry` | ❌ | `{ maxAttempts: 3, initialDelayMs: 1_000, backoffFactor: 2, maxDelayMs: 30_000, retryOnStatuses: [408, 425, 429, 5xx] }` | Retry policy for transient failures. |
| `userAgentSuffix` | ❌ | – | Value appended to the default `syncteams-sdk/0.1.0` user agent. |

---

## API overview

### `executeWorkflow(input)`

Initiates a workflow run.

```ts
const { taskId, status } = await client.executeWorkflow({
  workflowId: 'crew_kickoff',
  uniqueId: 'business-record-42',
  input: { payload: '...' },
});
```

Returns the assigned `taskId` and the initial status (`QUEUED` or `PENDING`).

### `getTaskStatus(taskId)`

Fetches the latest status and the filtered event log for a task.

```ts
const status = await client.getTaskStatus(taskId);
console.log(status.status, status.eventLogs?.length ?? 0);
```

### `continueTask({ taskId, decision, message? })`

Resumes a waiting workflow after an approval decision.

```ts
await client.continueTask({
  taskId,
  decision: 'APPROVE',
});

await client.continueTask({
  taskId,
  decision: 'REJECT',
  message: 'Missing documentation',
});
```

When `decision` is `'REJECT'`, `message` is required.

### `waitForCompletion(taskId, options?)`

Polls until the task reaches a terminal status (default: `COMPLETED`, `FAILED`, `CANCELED`). Emits `onUpdate` callbacks whenever the status changes.

```ts
const finalStatus = await client.waitForCompletion(taskId, {
  pollIntervalMs: 1_000,
  maxWaitTimeMs: 15 * 60_000,
  onUpdate: ({ status, eventLogs }) => {
    console.log('Status changed:', status);
    if (eventLogs?.length) {
      console.log('Latest event:', eventLogs.at(-1));
    }
  },
});
```

Use `exitOnWaiting: true` to return control immediately when a workflow enters `WAITING` (approval required).

### `executeAndWait(input, options?)`

Fire-and-forget helper that starts a workflow and waits for completion. Provide `onWaiting` to handle approval flows programmatically.

```ts
const result = await client.executeAndWait(
  { workflowId: 'approval_flow', input: { amount: 500 } },
  {
    pollIntervalMs: 1_000,
    onWaiting: async ({ taskId }) => {
      await reviewRequest(taskId);
      await client.continueTask({ taskId, decision: 'APPROVE' });
      return true; // resume polling
    },
  },
);
```

---

## Error handling

The SDK throws `WorkflowAPIError` for unsuccessful HTTP responses or unrecoverable failures. The error exposes the status code, parsed response body, request metadata, and original cause.

```ts
import { WorkflowAPIError } from '@syncteams/sdk';

try {
  await client.executeWorkflow({ workflowId: 'invalid', input: {} });
} catch (error) {
  if (error instanceof WorkflowAPIError) {
    console.error('SyncTeams request failed:', error.status, error.data);
  } else {
    console.error('Unexpected error', error);
  }
}
```

Retry-eligible errors (HTTP 408, 425, 429, 5xx, or network issues) are retried automatically according to the configured policy.

---

## Handling webhook callbacks

If you configure webhook delivery in the SyncTeams console, your service receives payloads shaped like `WebhookEventPayload`:

```ts
import type { WebhookEventPayload } from '@syncteams/sdk';

app.post('/syncteams/webhook', async (req, res) => {
  const payload = req.body as WebhookEventPayload;

  console.log('Task', payload.taskId, 'status', payload.status);
  const latest = payload.eventLogs?.at(-1);

  // TODO: verify signature once exposed, then process the event

  res.sendStatus(200);
});
```

Currently the public API relies on polling for most scenarios. Webhooks provide a push alternative when enabled and include the correlated `uniqueId` plus the most recent event log emitted by the backend.

---

## TypeScript support

The package ships with comprehensive type definitions:

- `WorkflowStatus`, `ApprovalDecision`, and `WorkflowEventType` enums
- Response models for every method
- Configuration interfaces for retry and polling helpers

You can import the types directly:

```ts
import type { WorkflowStatus, TaskStatusResponse } from '@syncteams/sdk';
```

---

## Local development

```bash
pnpm install
pnpm run build         # compile to dist/
pnpm run test          # execute vitest suite
pnpm run typecheck     # tsc --noEmit against src/
```

The repository root defines a pnpm workspace, so commands such as `pnpm --filter @syncteams/sdk test` run from the monorepo.

---

## Releasing

1. Update the version in `package.json` and `CHANGELOG.md`.
2. Run `pnpm --filter @syncteams/sdk test` and `pnpm --filter @syncteams/sdk build`.
3. Commit the generated `dist/` artifacts.
4. Publish with `pnpm --filter @syncteams/sdk publish --access public`.
5. Create a matching git tag (e.g., `v0.1.0`).

---

## Resources

- [Full API reference](./development-readme.md) – deep dive into endpoints, payloads, and lifecycle details.
- Support: support@syncteams.com
- Issues: GitHub issues tracker listed above
