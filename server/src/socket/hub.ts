import type { Server } from 'socket.io';

let io: Server | null = null;

export function setIo(server: Server) {
  io = server;
}

export function emitToUsers(userIds: string[], event: string, payload: unknown) {
  if (!io) return;
  for (const userId of userIds) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

export function emitToConversation(conversationId: string, event: string, payload: unknown) {
  io?.to(`conversation:${conversationId}`).emit(event, payload);
}

export function emitToConversationEach(conversationId: string, event: string, payloadFor: (userId: string) => unknown) {
  const room = io?.sockets.adapter.rooms.get(`conversation:${conversationId}`);
  if (!room || !io) return;
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    const userId = socket?.data.userId as string | undefined;
    if (!socket || !userId) continue;
    socket.emit(event, payloadFor(userId));
  }
}

export function userSocketCount(userId: string): number {
  return io?.sockets.adapter.rooms.get(`user:${userId}`)?.size ?? 0;
}

export function conversationRoomSize(conversationId: string): number {
  return io?.sockets.adapter.rooms.get(`conversation:${conversationId}`)?.size ?? 0;
}

export function isUserInConversation(userId: string, conversationId: string): boolean {
  const room = io?.sockets.adapter.rooms.get(`conversation:${conversationId}`);
  if (!room || !io) return false;
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket?.data.userId === userId) return true;
  }
  return false;
}
