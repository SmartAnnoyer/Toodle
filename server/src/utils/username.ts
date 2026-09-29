const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/^@/, '');
}

export function validateUsername(
  input: string,
): { ok: true; username: string } | { ok: false; message: string } {
  const username = normalizeUsername(input);
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      message: 'Usernames are 3–20 characters: letters, numbers, and underscores.',
    };
  }
  return { ok: true, username };
}

export function usernameAvailability(
  desired: string,
  existingOwnerId: string | null,
  selfId?: string,
): { available: boolean; username?: string; message?: string } {
  const parsed = validateUsername(desired);
  if (!parsed.ok) return { available: false, message: parsed.message };
  if (existingOwnerId && existingOwnerId !== selfId) {
    return { available: false, username: parsed.username, message: 'That username is already Toodling.' };
  }
  return { available: true, username: parsed.username };
}

export function sanitizeSearch(input: string): string {
  return input.trim().replace(/^@/, '').replace(/[%,.'"()]/g, '').slice(0, 20).toLowerCase();
}
