import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { http } from '../controllers/http.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireUser } from '../middleware/auth.js';
import { musicRooms } from '../socket/music.js';
import { mysteryAudio } from '../socket/musicState.js';

export const api = Router();

const musicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/public/audio/music');

api.get('/music/mystery/:token', (req, res) => {
  const audioUrl = mysteryAudio(musicRooms(), String(req.params.token ?? ''));
  const prefix = '/audio/music/';
  if (!audioUrl?.startsWith(prefix) || audioUrl.includes('..')) {
    res.status(404).end();
    return;
  }
  const base = path.basename(audioUrl);
  if (base !== audioUrl.slice(prefix.length)) {
    res.status(404).end();
    return;
  }
  const file = path.resolve(musicDir, base);
  if (!file.startsWith(musicDir + path.sep)) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', base.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');
  res.setHeader('Content-Disposition', 'inline; filename="mystery"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(file, (error) => {
    if (error && !res.headersSent) res.status(404).end();
  });
});

api.get('/moods', asyncHandler(http.moods));
api.get('/usernames/:username', asyncHandler(http.username));

api.use(requireUser);
api.get('/profile/me', asyncHandler(http.me));
api.post('/profile/setup', asyncHandler(http.setup));
api.patch('/profile/me', asyncHandler(http.updateMe));
api.delete('/account', asyncHandler(http.deleteAccount));
api.post('/safety/block', asyncHandler(http.blockUser));
api.post('/safety/report', asyncHandler(http.reportUser));
api.get('/users/search', asyncHandler(http.search));

api.get('/requests', asyncHandler(http.listRequests));
api.post('/requests', asyncHandler(http.createRequest));
api.post('/requests/:id/accept', asyncHandler(http.acceptRequest));
api.post('/requests/:id/ignore', asyncHandler(http.ignoreRequest));

api.get('/conversations', asyncHandler(http.listConversations));
api.post('/conversations', asyncHandler(http.createConversation));
api.get('/conversations/:id', asyncHandler(http.getConversation));
api.put('/conversations/:id/rules', asyncHandler(http.updateRule));
api.post('/conversations/:id/renew', asyncHandler(http.renew));
api.post('/conversations/:id/leave', asyncHandler(http.leave));
api.post('/conversations/:id/rejoin', asyncHandler(http.rejoin));
api.post('/conversations/:id/read', asyncHandler(http.read));
api.get('/conversations/:id/messages', asyncHandler(http.listMessages));
api.post('/conversations/:id/messages', asyncHandler(http.sendMessage));

api.post('/renewals/:id/accept', asyncHandler(http.acceptRenewal));
api.post('/renewals/:id/reject', asyncHandler(http.rejectRenewal));
api.delete('/messages/:id', asyncHandler(http.deleteMessage));
api.post('/messages/:id/reactions', asyncHandler(http.react));

api.get('/shortcuts', asyncHandler(http.listShortcuts));
api.post('/shortcuts', asyncHandler(http.createShortcut));
api.patch('/shortcuts/:id', asyncHandler(http.updateShortcut));
api.delete('/shortcuts/:id', asyncHandler(http.deleteShortcut));
api.post('/shortcuts/:id/share', asyncHandler(http.shareShortcut));
api.post('/shortcuts/:id/revoke', asyncHandler(http.revokeShare));
api.post('/shortcut-shares/:id/accept', asyncHandler(http.acceptShare));
api.post('/shortcut-shares/:id/reject', asyncHandler(http.rejectShare));

api.post('/devices', asyncHandler(http.saveDevice));
api.delete('/devices', asyncHandler(http.removeDevice));
api.get('/notifications', asyncHandler(http.notifications));
api.post('/notifications/read-all', asyncHandler(http.readAllNotifications));
api.post('/notifications/:id/read', asyncHandler(http.readNotification));
api.get('/gifs', asyncHandler(http.gifs));
