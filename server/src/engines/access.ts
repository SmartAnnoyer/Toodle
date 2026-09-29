export function decideRequestAction(input: {
  action: 'accept' | 'ignore';
  status: string;
  toUserId: string;
  actorId: string;
}): { ok: true; status: 'accepted' | 'ignored' } | { ok: false; message: string } {
  if (input.toUserId !== input.actorId) {
    return { ok: false, message: 'This ping was not for you.' };
  }
  if (input.status !== 'pending') {
    return { ok: false, message: 'That ping was already handled.' };
  }
  return { ok: true, status: input.action === 'accept' ? 'accepted' : 'ignored' };
}

export function authorizeSend(input: {
  isMember: boolean;
  hasLeft: boolean;
  status: string;
}): { ok: true } | { ok: false; message: string } {
  if (!input.isMember) return { ok: false, message: 'This chat is not yours.' };
  if (input.hasLeft) return { ok: false, message: 'You left this chat.' };
  if (input.status !== 'active') return { ok: false, message: '💨 Poof. This chat is gone.' };
  return { ok: true };
}

export function canDeleteMessage(senderId: string | null, userId: string): boolean {
  return senderId != null && senderId === userId;
}

export function canResolveRenewal(input: {
  requestedBy: string;
  actorId: string;
  status: string;
}): { ok: true } | { ok: false; message: string } {
  if (input.status !== 'pending') {
    return { ok: false, message: 'That renewal was already handled.' };
  }
  if (input.requestedBy === input.actorId) {
    return { ok: false, message: 'Wait for them to answer.' };
  }
  return { ok: true };
}
