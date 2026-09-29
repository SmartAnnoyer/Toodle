import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { moodCatalog } from '../services/profiles.js';
import * as profiles from '../services/profiles.js';
import * as requests from '../services/requests.js';
import * as conversations from '../services/conversations.js';
import * as messages from '../services/messages.js';
import * as shortcuts from '../services/shortcuts.js';
import * as notifications from '../services/notifications.js';
import { searchGifs } from '../services/gifs.js';

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, result.error.issues[0]?.message || 'Check that and try again.');
  return result.data;
}

const idSchema = z.string().uuid();

export const http = {
  async moods(_req: Request, res: Response) {
    res.json(moodCatalog());
  },

  async username(req: Request, res: Response) {
    const ip = req.ip || 'local';
    if (!rateLimit(`name:${ip}`, 40, 60_000)) throw new AppError(429, 'Slow down a little.');
    const username = String(req.params.username || '');
    res.json(await profiles.usernameAvailable(username));
  },

  async me(req: Request, res: Response) {
    res.json(await profiles.getMe(req.userId));
  },

  async setup(req: Request, res: Response) {
    const body = parse(z.object({
      username: z.string().min(1).max(24),
      displayName: z.string().min(1).max(32),
      avatarEmoji: z.string().min(1).max(8),
      moodEmoji: z.string().min(1).max(8),
      moodText: z.string().min(1).max(48),
    }), req.body);
    res.json(await profiles.setupProfile(req.userId, body));
  },

  async updateMe(req: Request, res: Response) {
    const body = parse(z.object({
      username: z.string().min(1).max(24).optional(),
      displayName: z.string().min(1).max(32).optional(),
      avatarEmoji: z.string().min(1).max(8).optional(),
      moodEmoji: z.string().min(1).max(8).optional(),
      moodText: z.string().min(1).max(48).optional(),
      showOnline: z.boolean().optional(),
    }), req.body);
    res.json(await profiles.updateProfile(req.userId, body));
  },

  async search(req: Request, res: Response) {
    res.json({ users: await profiles.searchUsers(req.userId, String(req.query.q || '')) });
  },

  async createRequest(req: Request, res: Response) {
    const body = parse(z.object({ toUserId: idSchema }), req.body);
    res.status(201).json(await requests.sendRequest(req.userId, body.toUserId));
  },

  async listRequests(req: Request, res: Response) {
    res.json(await requests.listRequests(req.userId));
  },

  async acceptRequest(req: Request, res: Response) {
    res.json(await requests.actOnRequest(req.userId, parse(idSchema, req.params.id), 'accept'));
  },

  async ignoreRequest(req: Request, res: Response) {
    res.json(await requests.actOnRequest(req.userId, parse(idSchema, req.params.id), 'ignore'));
  },

  async listConversations(req: Request, res: Response) {
    res.json(await conversations.listConversations(req.userId));
  },

  async createConversation(req: Request, res: Response) {
    const body = parse(z.object({ userId: idSchema }), req.body);
    res.status(201).json(await conversations.createConversation(req.userId, body.userId));
  },

  async getConversation(req: Request, res: Response) {
    res.json(await conversations.getConversation(req.userId, parse(idSchema, req.params.id)));
  },

  async updateRule(req: Request, res: Response) {
    const body = parse(z.object({
      ruleType: z.string(),
      enabled: z.boolean(),
      configuration: z.record(z.unknown()).optional(),
    }), req.body);
    res.json(await conversations.updateConversationRule(
      req.userId,
      parse(idSchema, req.params.id),
      body.ruleType,
      body.enabled,
      body.configuration ?? {},
    ));
  },

  async renew(req: Request, res: Response) {
    const body = parse(z.object({ durationSeconds: z.number().positive() }), req.body);
    res.json(await conversations.requestRenewal(req.userId, parse(idSchema, req.params.id), body.durationSeconds));
  },

  async acceptRenewal(req: Request, res: Response) {
    res.json(await conversations.respondToRenewal(req.userId, parse(idSchema, req.params.id), true));
  },

  async rejectRenewal(req: Request, res: Response) {
    res.json(await conversations.respondToRenewal(req.userId, parse(idSchema, req.params.id), false));
  },

  async leave(req: Request, res: Response) {
    res.json(await conversations.leaveConversation(req.userId, parse(idSchema, req.params.id)));
  },

  async rejoin(req: Request, res: Response) {
    res.json(await conversations.rejoinConversation(req.userId, parse(idSchema, req.params.id)));
  },

  async listMessages(req: Request, res: Response) {
    const before = typeof req.query.before === 'string' ? req.query.before : undefined;
    res.json(await messages.listMessages(req.userId, parse(idSchema, req.params.id), before));
  },

  async sendMessage(req: Request, res: Response) {
    const body = parse(z.object({
      body: z.string().max(2000).optional(),
      kind: z.enum(['text', 'gif', 'sticker']).optional(),
      replyToId: idSchema.optional(),
      metadata: z.record(z.unknown()).optional(),
    }), req.body);
    res.status(201).json(await messages.sendMessage(req.userId, parse(idSchema, req.params.id), body));
  },

  async deleteMessage(req: Request, res: Response) {
    res.json(await messages.deleteMessage(req.userId, parse(idSchema, req.params.id)));
  },

  async react(req: Request, res: Response) {
    const body = parse(z.object({ emoji: z.string().min(1).max(8) }), req.body);
    res.json(await messages.reactToMessage(req.userId, parse(idSchema, req.params.id), body.emoji));
  },

  async read(req: Request, res: Response) {
    res.json(await messages.markRead(req.userId, parse(idSchema, req.params.id)));
  },

  async listShortcuts(req: Request, res: Response) {
    res.json(await shortcuts.listShortcuts(req.userId));
  },

  async createShortcut(req: Request, res: Response) {
    const body = parse(z.object({
      name: z.string().min(1).max(32),
      trigger: z.string().min(1).max(25),
      type: z.enum(['TEXT', 'ACTION']),
      content: z.string().max(500).default(''),
      actionType: z.string().max(24).nullable().optional(),
      visibility: z.enum(['private', 'shared', 'conversation']),
      conversationId: idSchema.nullable().optional(),
    }), req.body);
    res.status(201).json(await shortcuts.createShortcut(req.userId, { ...body, content: body.content ?? '' }));
  },

  async updateShortcut(req: Request, res: Response) {
    const body = parse(z.object({
      name: z.string().min(1).max(32).optional(),
      content: z.string().max(500).optional(),
      visibility: z.enum(['private', 'shared', 'conversation']).optional(),
    }), req.body);
    res.json(await shortcuts.updateShortcut(req.userId, parse(idSchema, req.params.id), body));
  },

  async deleteShortcut(req: Request, res: Response) {
    res.json(await shortcuts.deleteShortcut(req.userId, parse(idSchema, req.params.id)));
  },

  async shareShortcut(req: Request, res: Response) {
    const body = parse(z.object({ username: z.string().min(1).max(24) }), req.body);
    res.status(201).json(await shortcuts.shareShortcut(req.userId, parse(idSchema, req.params.id), body.username));
  },

  async acceptShare(req: Request, res: Response) {
    res.json(await shortcuts.respondToShare(req.userId, parse(idSchema, req.params.id), true));
  },

  async rejectShare(req: Request, res: Response) {
    res.json(await shortcuts.respondToShare(req.userId, parse(idSchema, req.params.id), false));
  },

  async revokeShare(req: Request, res: Response) {
    const body = parse(z.object({ recipientId: idSchema }), req.body);
    res.json(await shortcuts.revokeShare(req.userId, parse(idSchema, req.params.id), body.recipientId));
  },

  async notifications(req: Request, res: Response) {
    const [items, requestCount] = await Promise.all([
      notifications.listNotifications(req.userId),
      requests.unreadRequestCount(req.userId),
    ]);
    res.json({
      notifications: items,
      unread: items.filter((item) => !item.readAt).length,
      pendingRequests: requestCount,
    });
  },

  async readNotification(req: Request, res: Response) {
    await notifications.markNotificationRead(req.userId, parse(idSchema, req.params.id));
    res.json({ ok: true });
  },

  async readAllNotifications(req: Request, res: Response) {
    await notifications.markAllNotificationsRead(req.userId);
    res.json({ ok: true });
  },

  async gifs(req: Request, res: Response) {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const kind = req.query.kind === 'sticker' ? 'sticker' : 'gif';
    res.json(await searchGifs(query, kind));
  },
};
