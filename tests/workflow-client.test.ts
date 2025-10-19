import { describe, expect, it, vi } from 'vitest';
import { WorkflowClient } from '../src/client';
import { DEFAULT_BASE_URL } from '../src/types';
import type { WorkflowStatus } from '../src/types';

const BASE_URL = 'https://api.example.com';

describe('WorkflowClient', () => {
  it('uses default baseUrl when not provided', async () => {
    const fetchMock = queueFetch([
      (request) => {
        expect(request.url).toBe(`${DEFAULT_BASE_URL}/api/v1`);
        return jsonResponse({ taskId: 'task-1', status: 'PENDING' });
      },
    ]);

    const client = new WorkflowClient({
      apiKey: 'sts_test_key',
      fetch: fetchMock,
    });

    const response = await client.executeWorkflow({
      workflowId: 'workflow-1',
      input: {},
    });

    expect(response.taskId).toBe('task-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends API key and payload when executing a workflow', async () => {
    const fetchMock = queueFetch([
      (request) => {
        expect(request.url).toBe(`${BASE_URL}/api/v1`);
        expect(request.init?.method).toBe('POST');
        const headers = new Headers(request.init?.headers as HeadersInit);
        expect(headers.get('x-api-key')).toBe('sts_test_key');
        expect(headers.get('content-type')).toBe('application/json');

        const body = request.init?.body as string;
        expect(JSON.parse(body)).toEqual({
          workflowId: 'workflow-1',
          uniqueId: 'abc123',
          input: { foo: 'bar' },
        });

        return jsonResponse({ taskId: 'task-1', status: 'PENDING' });
      },
    ]);

    const client = new WorkflowClient({
      baseUrl: BASE_URL,
      apiKey: 'sts_test_key',
      fetch: fetchMock,
    });

    const response = await client.executeWorkflow({
      workflowId: 'workflow-1',
      uniqueId: 'abc123',
      input: { foo: 'bar' },
    });

    expect(response).toEqual({ taskId: 'task-1', status: 'PENDING' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('polls until a terminal status is reached', async () => {
    const statuses: WorkflowStatus[] = ['PENDING', 'RUNNING', 'COMPLETED'];
    const updates: WorkflowStatus[] = [];

    const fetchMock = queueFetch(
      statuses.map(
        (status) => () =>
          jsonResponse({
            taskId: 'task-1',
            status,
            eventLogs: [],
          }),
      ),
    );

    const client = new WorkflowClient({
      baseUrl: BASE_URL,
      apiKey: 'sts_test_key',
      fetch: fetchMock,
    });

    const result = await client.waitForCompletion('task-1', {
      pollIntervalMs: 0,
      onUpdate: (status) => updates.push(status.status),
    });

    expect(result.status).toBe('COMPLETED');
    expect(updates).toEqual(statuses);
    expect(fetchMock).toHaveBeenCalledTimes(statuses.length);
  });

  it('supports approval workflows via executeAndWait onWaiting handler', async () => {
    const fetchMock = queueFetch([
      () => jsonResponse({ taskId: 'task-1', status: 'PENDING' }), // executeWorkflow
      () =>
        jsonResponse({
          taskId: 'task-1',
          status: 'WAITING',
          eventLogs: [],
        }), // waitForCompletion exit on WAITING
      () =>
        jsonResponse({
          taskId: 'task-1',
          status: 'RUNNING',
          eventLogs: [],
        }),
      () =>
        jsonResponse({
          taskId: 'task-1',
          status: 'COMPLETED',
          eventLogs: [],
        }),
    ]);

    const client = new WorkflowClient({
      baseUrl: BASE_URL,
      apiKey: 'sts_test_key',
      fetch: fetchMock,
    });

    const onWaiting = vi.fn().mockResolvedValueOnce(true);

    const result = await client.executeAndWait(
      { workflowId: 'workflow-1', input: {} },
      {
        pollIntervalMs: 0,
        onWaiting,
      },
    );

    expect(onWaiting).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('COMPLETED');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('throws when rejecting without a reason message', async () => {
    const client = new WorkflowClient({
      baseUrl: BASE_URL,
      apiKey: 'sts_test_key',
      fetch: queueFetch([]),
    });

    await expect(
      client.continueTask({ taskId: 'task-1', decision: 'REJECT' }),
    ).rejects.toThrow(/message is required/i);
  });
});

function queueFetch(
  resolvers: ((request: {
    url: string;
    init?: RequestInit;
  }) => Response | Promise<Response>)[],
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!resolvers.length) {
      throw new Error('Unexpected fetch call with no resolvers remaining');
    }

    const resolver = resolvers.shift()!;
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const url = typeof input === 'string' ? input : input.toString();
    const response = await resolver({ url, init });
    return response;
  });
}

function jsonResponse(
  payload: unknown,
  init: ResponseInit = { status: 200 },
): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify(payload), {
    ...init,
    headers,
  });
}
