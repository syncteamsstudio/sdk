# SyncTeams Workflow SDK

A TypeScript/Node.js client for the SyncTeams Workflow API. This SDK provides a simple interface for executing workflows, monitoring task status, and handling approval flows with full type safety.

---

## Installation

```bash
npm install @syncteamsstudio/sdk
```

**Requirements:** Node.js 18 or newer

---

## Quick Start

```ts
import { WorkflowClient } from '@syncteamsstudio/sdk';

const client = new WorkflowClient({
  apiKey: process.env.SYNCTEAMS_API_KEY!,
});

async function run() {
  // Execute a workflow
  const { taskId } = await client.executeWorkflow({
    workflowId: 'your_workflow_id',
    input: { email: 'user@example.com' },
    uniqueId: 'customer-123',
  });

  // Wait for completion
  const result = await client.waitForCompletion(taskId, {
    pollIntervalMs: 2_000,
    onUpdate: ({ status }) => console.log(`Status: ${status}`),
  });

  if (result.status === 'COMPLETED') {
    console.log('Workflow completed successfully!');
  }
}

run().catch(console.error);
```

---

## Configuration

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `apiKey` | ✅ | – | Your SyncTeams API key |
| `baseUrl` | ❌ | `https://api.syncteams.studio` | API base URL |
| `timeoutMs` | ❌ | `30000` | Request timeout in milliseconds |
| `retry` | ❌ | See below | Retry configuration for failed requests |

### Retry Configuration

By default, the SDK retries transient failures with exponential backoff:
- Maximum attempts: 3
- Initial delay: 1 second
- Backoff factor: 2x
- Retries on: Network errors, timeouts, and 5xx responses

---

## API overview

### `executeWorkflow(input)`

Starts a workflow execution.

```ts
const { taskId, status } = await client.executeWorkflow({
  workflowId: 'your_workflow_id',
  uniqueId: 'unique-identifier',
  input: { /* your workflow input */ },
});
```

Returns the `taskId` and initial status.

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

Polls a task until it reaches a terminal status (`COMPLETED`, `FAILED`, or `CANCELED`).

```ts
const finalStatus = await client.waitForCompletion(taskId, {
  pollIntervalMs: 1000,
  maxWaitTimeMs: 15 * 60 * 1000,
  onUpdate: ({ status, eventLogs }) => {
    console.log('Status:', status);
  },
});
```

Options:
- `pollIntervalMs`: Polling frequency (default: 2000ms)
- `maxWaitTimeMs`: Maximum wait time before timeout
- `onUpdate`: Callback fired on status changes
- `exitOnWaiting`: Return early when task enters approval state

### `executeAndWait(input, options?)`

Convenience method that executes a workflow and waits for completion.

```ts
const result = await client.executeAndWait(
  { workflowId: 'your_workflow_id', input: { amount: 500 } },
  {
    pollIntervalMs: 1000,
    onWaiting: async ({ taskId }) => {
      // Handle approval workflow
      await client.continueTask({ taskId, decision: 'APPROVE' });
      return true;
    },
  },
);
```

---

## Error Handling

The SDK throws `WorkflowAPIError` for API failures, providing access to status codes and response details.

```ts
import { WorkflowAPIError } from '@syncteamsstudio/sdk';

try {
  await client.executeWorkflow({ workflowId: 'invalid', input: {} });
} catch (error) {
  if (error instanceof WorkflowAPIError) {
    console.error('API Error:', error.status, error.data);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

Transient errors (timeouts, rate limits, server errors) are automatically retried.

---

## Webhooks

You can receive workflow updates via webhooks instead of polling:

```ts
import type { WebhookEventPayload } from '@syncteamsstudio/sdk';

app.post('/webhooks/syncteams', async (req, res) => {
  const payload = req.body as WebhookEventPayload;
  
  console.log('Task', payload.taskId, 'status:', payload.status);
  
  // Process the event
  
  res.sendStatus(200);
});
```

---

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```ts
import type { 
  WorkflowStatus, 
  ApprovalDecision, 
  TaskStatusResponse 
} from '@syncteamsstudio/sdk';
```

---

## Support

- Documentation: [https://www.syncteams.studio](https://www.syncteams.studio)
- Email: support@syncteams.studio

---

## License

MIT
