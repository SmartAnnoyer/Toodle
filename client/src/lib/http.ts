import { supabase } from './supabase';
import { noteServerTime } from './time';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error('Toodle cannot reach the server. Is it running?');
  }
  const serverTime = response.headers.get('X-Server-Time');
  if (serverTime) noteServerTime(serverTime);
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && supabase) {
    await supabase.auth.signOut({ scope: 'local' });
  }
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Toodle tripped. Try again.');
  }
  return data as T;
}

export function apiUrl() {
  return API_URL;
}
