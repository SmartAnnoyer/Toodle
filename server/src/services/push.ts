import { createSign } from 'node:crypto';
import { db } from '../lib/db.js';

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushInput = {
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  dataOnly?: boolean;
};

let cachedToken: { value: string; expires: number } | null = null;
let warned = false;

export function pushTag(type: string, payload: Record<string, unknown> | undefined) {
  if (type === 'message' && typeof payload?.conversationId === 'string') return `chat:${payload.conversationId}`;
  if (type === 'read' && typeof payload?.conversationId === 'string') return `chat:${payload.conversationId}`;
  if (type === 'request' || type === 'request_accepted') return 'requests';
  return `note:${type}`;
}

export function pushChannel(type: string) {
  return type === 'message' ? 'messages' : 'requests';
}

export function shouldDeliver(viewing: boolean) {
  return !viewing;
}

function account(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, '\n') };
  } catch {
    return null;
  }
}

async function accessToken(service: ServiceAccount) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(JSON.stringify({
    iss: service.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(service.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`FCM auth ${response.status}`);
  const body = await response.json() as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('FCM auth missing token');
  cachedToken = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

function dataStrings(input: PushInput) {
  const data: Record<string, string> = { type: input.type };
  for (const [key, value] of Object.entries(input.payload ?? {})) {
    if (value == null) continue;
    data[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return data;
}

export function buildFcmMessage(token: string, input: PushInput) {
  const tag = pushTag(input.type, input.payload);
  const data = dataStrings(input);
  const message: Record<string, unknown> = {
    token,
    data,
    android: {
      collapse_key: tag,
      priority: 'HIGH',
      notification: input.dataOnly ? undefined : {
        channel_id: pushChannel(input.type),
        tag,
        icon: 'ic_stat_toodle',
        color: '#C084FC',
      },
    },
    apns: {
      headers: { 'apns-collapse-id': tag, 'apns-priority': '10' },
      payload: {
        aps: input.dataOnly
          ? { 'content-available': 1 }
          : { alert: { title: input.title, body: input.body }, sound: 'default', 'thread-id': tag },
      },
    },
  };
  if (!input.dataOnly) {
    message.notification = { title: input.title, body: input.body };
  }
  return { message };
}

async function tokensFor(userId: string) {
  const { data, error } = await db().from('device_tokens').select('token').eq('user_id', userId);
  if (error) {
    console.error('device tokens', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.token as string).filter(Boolean);
}

async function dropToken(token: string) {
  await db().from('device_tokens').delete().eq('token', token);
}

export async function pushToUser(userId: string, input: PushInput) {
  const service = account();
  if (!service) {
    if (!warned) {
      warned = true;
      console.warn('Push is off until FIREBASE_SERVICE_ACCOUNT is set.');
    }
    return;
  }
  const tokens = await tokensFor(userId);
  if (tokens.length === 0) return;
  let bearer = '';
  try {
    bearer = await accessToken(service);
  } catch (error) {
    console.error('push auth', error);
    return;
  }
  await Promise.all(tokens.map(async (token) => {
    try {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${service.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildFcmMessage(token, input)),
      });
      if (response.status === 404 || response.status === 400) {
        const body = await response.text();
        if (body.includes('UNREGISTERED') || body.includes('INVALID_ARGUMENT')) await dropToken(token);
        return;
      }
      if (!response.ok) console.error('push', response.status, await response.text());
    } catch (error) {
      console.error('push', error);
    }
  }));
}
