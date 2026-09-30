import { Router } from 'express';
import { http } from '../controllers/http.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireUser } from '../middleware/auth.js';

export const api = Router();

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

api.get('/notifications', asyncHandler(http.notifications));
api.post('/notifications/read-all', asyncHandler(http.readAllNotifications));
api.post('/notifications/:id/read', asyncHandler(http.readNotification));
api.get('/gifs', asyncHandler(http.gifs));
