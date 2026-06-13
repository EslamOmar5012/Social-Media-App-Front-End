import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyToken } from '../security/token.security.js';
import { envVars } from '../../config/index.js';

export class SocketService {
    private io: Server | null = null;
    // Maps userId → set of active socket IDs for that user
    private userSockets = new Map<string, Set<string>>();
    // Maps roomId → set of userIds currently in that room
    private roomUsers = new Map<string, Set<string>>();

    /**
     * Initializes the Socket.io server and registers connection handlers and authentication.
     */
    init(server: HttpServer) {
        const corsOrigin = envVars.corsOrigin;
        const cleanOrigin = corsOrigin.endsWith('/') ? corsOrigin.slice(0, -1) : corsOrigin;

        this.io = new Server(server, {
            cors: {
                origin: cleanOrigin,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Socket.io Middleware for JWT authentication
        // Frontend must pass token in: auth: { token: '<accessToken>' }
        this.io.use((socket: Socket, next) => {
            try {
                const token = socket.handshake.auth['token'] || socket.handshake.query['token'];
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                // Strip 'Bearer ' if present
                const cleanedToken = typeof token === 'string' && token.startsWith('Bearer ')
                    ? token.slice(7)
                    : token;

                const secret = envVars.accessToken.secret;
                const decoded = verifyToken(cleanedToken as string, secret);

                if (!decoded || !decoded.userId) {
                    return next(new Error('Invalid authentication token'));
                }

                // Attach verified userId to the socket
                (socket as any).userId = decoded.userId;
                next();
            } catch (error) {
                next(new Error('Socket authentication failed'));
            }
        });

        this.io.on('connection', (socket: Socket) => {
            const userId: string = (socket as any).userId;
            console.log(`[SocketService] User ${userId} connected on socket ${socket.id}`);

            // ── Track user sockets ─────────────────────────────────────────
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(socket.id);

            // Broadcast online presence to everyone
            this.io!.emit('user_presence', { userId, status: 'online' });

            // ── join_room ──────────────────────────────────────────────────
            // Accepts: plain roomId string OR { roomId, userId } object
            socket.on('join_room', (payload: string | { roomId: string; userId?: string }) => {
                const roomId = typeof payload === 'string' ? payload : payload.roomId;
                if (!roomId) return;

                socket.join(roomId);

                // Track which users are in this room
                if (!this.roomUsers.has(roomId)) {
                    this.roomUsers.set(roomId, new Set());
                }
                this.roomUsers.get(roomId)!.add(userId);

                console.log(`[SocketService] Socket ${socket.id} joined room ${roomId}`);

                // Notify others in the room
                socket.to(roomId).emit('room_updated', {
                    roomId,
                    event: 'user_joined',
                    userId
                });
            });

            // ── leave_room ─────────────────────────────────────────────────
            // Accepts: plain roomId string OR { roomId, userId } object
            socket.on('leave_room', (payload: string | { roomId: string; userId?: string }) => {
                const roomId = typeof payload === 'string' ? payload : payload.roomId;
                if (!roomId) return;

                socket.leave(roomId);

                const roomSet = this.roomUsers.get(roomId);
                if (roomSet) {
                    roomSet.delete(userId);
                    if (roomSet.size === 0) this.roomUsers.delete(roomId);
                }

                console.log(`[SocketService] Socket ${socket.id} left room ${roomId}`);

                socket.to(roomId).emit('room_updated', {
                    roomId,
                    event: 'user_left',
                    userId
                });
            });

            // ── send_message ───────────────────────────────────────────────
            // Frontend shape: { roomId, senderId, content, type, replyTo, timestamp }
            // Legacy shape:   { roomID, content }
            socket.on('send_message', async (payload: {
                roomId?: string;
                roomID?: string;
                content: string;
                type?: string;
                replyTo?: string | null;
                timestamp?: number;
            }) => {
                try {
                    // Normalize: accept both camelCase roomId and uppercase roomID
                    const roomId = payload.roomId || payload.roomID;
                    const { content } = payload;

                    if (!roomId || !content?.trim()) {
                        socket.emit('error', { message: 'roomId and content are required' });
                        return;
                    }

                    // Lazy-import to avoid circular dependency at module load time
                    const { chatService } = await import('../../modules/chat/chat.service.js');
                    const message = await chatService.sendMessage(userId, roomId, { content });

                    // Acknowledge the sender that the message was saved
                    socket.emit('message_sent', { messageId: message._id, roomId });

                    // Broadcast to room – frontend listens for 'receive_message'
                    this.io!.to(roomId).emit('receive_message', {
                        messageId: message._id,
                        chatId: message.chatId,
                        roomId,
                        sender: userId,
                        content: message.content,
                        type: payload.type ?? 'text',
                        replyTo: payload.replyTo ?? null,
                        timestamp: message.createdAt
                    });
                } catch (err: any) {
                    console.error(`[SocketService] send_message error for user ${userId}:`, err.message);
                    socket.emit('error', { message: err.message ?? 'Failed to send message' });
                }
            });

            // ── typing ─────────────────────────────────────────────────────
            // Frontend emits: { roomId, userId, isTyping }
            // Server relays to rest of room as: 'typing_update'
            socket.on('typing', (payload: { roomId: string; isTyping: boolean }) => {
                const { roomId, isTyping } = payload;
                if (!roomId) return;

                socket.to(roomId).emit('typing_update', { roomId, userId, isTyping });
            });

            // ── message_read ───────────────────────────────────────────────
            // Frontend emits: { messageId, roomId, userId }
            // Server relays to rest of room as: 'message_read_update'
            socket.on('message_read', (payload: { messageId: string; roomId: string }) => {
                const { messageId, roomId } = payload;
                if (!messageId || !roomId) return;

                socket.to(roomId).emit('message_read_update', { messageId, roomId, readBy: userId });
            });

            // ── disconnect ─────────────────────────────────────────────────
            socket.on('disconnect', () => {
                console.log(`[SocketService] Socket ${socket.id} disconnected`);

                const sockets = this.userSockets.get(userId);
                if (sockets) {
                    sockets.delete(socket.id);
                    if (sockets.size === 0) {
                        this.userSockets.delete(userId);

                        // Only broadcast offline when the user's LAST socket closes
                        this.io!.emit('user_presence', { userId, status: 'offline' });

                        // Clean up room presence tracking
                        for (const [roomId, users] of this.roomUsers.entries()) {
                            if (users.has(userId)) {
                                users.delete(userId);
                                if (users.size === 0) this.roomUsers.delete(roomId);
                            }
                        }
                    }
                }
            });
        });
    }

    /**
     * Gets the initialized Socket.io Server instance.
     */
    getIO(): Server {
        if (!this.io) {
            throw new Error('Socket.io server has not been initialized');
        }
        return this.io;
    }

    /**
     * Emits an event to all active sockets of a specific user.
     */
    emitToUser(userId: string, event: string, data: any) {
        if (!this.io) return;
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            for (const socketId of sockets) {
                this.io.to(socketId).emit(event, data);
            }
        }
    }

    /**
     * Emits an event to all sockets joined in a room.
     */
    emitToRoom(roomId: string, event: string, data: any) {
        if (!this.io) return;
        this.io.to(roomId).emit(event, data);
    }

    /**
     * Returns whether a specific user has at least one active socket connection.
     */
    isUserOnline(userId: string): boolean {
        const sockets = this.userSockets.get(userId);
        return !!sockets && sockets.size > 0;
    }
}

export const socketService = new SocketService();
