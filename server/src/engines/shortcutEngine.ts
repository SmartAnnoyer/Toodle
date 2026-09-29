export const ACTION_TYPES = ['streak', 'mood', 'rules', 'renew', 'ghost', 'gif', 'shrug'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
export type ShortcutType = 'TEXT' | 'ACTION' | 'SYSTEM';
export type ShortcutVisibility = 'private' | 'shared' | 'conversation';
export type ShareStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED';

export interface ShortcutRecord {
  id: string;
  ownerId: string;
  trigger: string;
  type: ShortcutType;
  content: string;
  actionType: string | null;
  visibility: ShortcutVisibility;
  conversationId: string | null;
}

export interface ShareRecord {
  shortcutId: string;
  recipientId: string;
  status: ShareStatus;
}

const TRIGGER_RE = /^\/[a-z0-9_]{1,24}$/;

export function normalizeTrigger(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function validateTrigger(
  input: string,
): { ok: true; trigger: string } | { ok: false; message: string } {
  const trigger = normalizeTrigger(input);
  if (!TRIGGER_RE.test(trigger)) {
    return { ok: false, message: 'Shortcuts look like /gm — letters, numbers, underscores.' };
  }
  return { ok: true, trigger };
}

export function parseTrigger(body: string): string | null {
  const match = body.trim().match(/^(\/[a-z0-9_]{1,24})$/i);
  return match ? match[1].toLowerCase() : null;
}

export function isAllowedAction(action: string | null | undefined): action is ActionType {
  return !!action && (ACTION_TYPES as readonly string[]).includes(action);
}

export function canUseShortcut(args: {
  shortcut: ShortcutRecord;
  userId: string;
  conversationId: string;
  share: ShareRecord | null;
  isConversationMember: boolean;
}): boolean {
  const { shortcut, userId, conversationId, share, isConversationMember } = args;
  if (!isConversationMember) return false;

  if (shortcut.visibility === 'conversation') {
    return shortcut.conversationId === conversationId;
  }

  if (shortcut.ownerId === userId) return true;

  if (shortcut.visibility === 'shared') {
    return share?.recipientId === userId && share.status === 'ACCEPTED';
  }

  return false;
}

function rank(shortcut: ShortcutRecord, userId: string, conversationId: string): number {
  if (shortcut.ownerId === userId && shortcut.visibility === 'conversation' && shortcut.conversationId === conversationId) {
    return 0;
  }
  if (shortcut.visibility === 'conversation' && shortcut.conversationId === conversationId) return 1;
  if (shortcut.ownerId === userId) return 2;
  return 3;
}

export function pickShortcut(
  candidates: ShortcutRecord[],
  userId: string,
  conversationId: string,
  shares: ShareRecord[],
  isConversationMember: boolean,
): ShortcutRecord | null {
  const usable = candidates.filter((shortcut) => canUseShortcut({
    shortcut,
    userId,
    conversationId,
    share: shares.find((share) => share.shortcutId === shortcut.id && share.recipientId === userId) ?? null,
    isConversationMember,
  }));
  usable.sort((a, b) => rank(a, userId, conversationId) - rank(b, userId, conversationId));
  return usable[0] ?? null;
}

export type ShortcutExecution =
  | { kind: 'text'; body: string }
  | { kind: 'action'; action: ActionType };

export function executeShortcut(shortcut: ShortcutRecord): ShortcutExecution | { error: string } {
  if (shortcut.type === 'TEXT' || (shortcut.type === 'SYSTEM' && !shortcut.actionType)) {
    const body = shortcut.content.trim();
    if (!body) return { error: 'That shortcut is empty.' };
    return { kind: 'text', body };
  }

  if (!isAllowedAction(shortcut.actionType)) {
    return { error: 'That shortcut action is not allowed.' };
  }

  if (shortcut.actionType === 'shrug') {
    return { kind: 'text', body: shortcut.content.trim() || '¯\\_(ツ)_/¯' };
  }

  return { kind: 'action', action: shortcut.actionType };
}
