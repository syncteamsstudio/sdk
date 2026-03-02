import { createHmac, timingSafeEqual } from 'crypto';

export const WEBHOOK_SIGNATURE_HEADER = 'SyncTeams-Signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'SyncTeams-Timestamp';
export const WEBHOOK_EVENT_ID_HEADER = 'SyncTeams-Event-Id';
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export interface VerifyWebhookSignatureOptions {
    payload: string | Record<string, unknown>;
    signatureHeader: string;
    signingSecret: string;
    timestampHeader?: string;
    toleranceSeconds?: number;
    currentTimestamp?: number;
}

export function verifyWebhookSignature(
    options: VerifyWebhookSignatureOptions,
): boolean {
    const {
        payload,
        signatureHeader,
        signingSecret,
        timestampHeader,
        toleranceSeconds = DEFAULT_WEBHOOK_TOLERANCE_SECONDS,
        currentTimestamp = Math.floor(Date.now() / 1000),
    } = options;

    if (!signatureHeader || !signingSecret) {
        return false;
    }

    const parsed = parseSignatureHeader(signatureHeader);
    if (!parsed.timestamp || parsed.signatures.length === 0) {
        return false;
    }

    if (timestampHeader && timestampHeader !== parsed.timestamp) {
        return false;
    }

    const timestamp = Number(parsed.timestamp);
    if (!Number.isFinite(timestamp)) {
        return false;
    }

    if (toleranceSeconds >= 0) {
        const age = Math.abs(currentTimestamp - timestamp);
        if (age > toleranceSeconds) {
            return false;
        }
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signedPayload = `${parsed.timestamp}.${payloadString}`;
    const expected = createHmac('sha256', signingSecret)
        .update(signedPayload, 'utf8')
        .digest('hex');

    return parsed.signatures.some((candidate) => safeHexCompare(expected, candidate));
}

function parseSignatureHeader(value: string): {
    timestamp: string | null;
    signatures: string[];
} {
    let timestamp: string | null = null;
    const signatures: string[] = [];

    for (const part of value.split(',')) {
        const [rawKey, rawVal] = part.split('=', 2);
        const key = rawKey?.trim();
        const val = rawVal?.trim();

        if (!key || !val) {
            continue;
        }

        if (key === 't') {
            timestamp = val;
            continue;
        }

        if (key === 'v1') {
            signatures.push(val);
        }
    }

    return { timestamp, signatures };
}

function safeHexCompare(expectedHex: string, candidateHex: string): boolean {
    try {
        const expected = Buffer.from(expectedHex, 'hex');
        const candidate = Buffer.from(candidateHex, 'hex');

        if (expected.length === 0 || candidate.length === 0) {
            return false;
        }

        if (expected.length !== candidate.length) {
            return false;
        }

        return timingSafeEqual(expected, candidate);
    } catch {
        return false;
    }
}
