import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Returns or initializes the singleton Socket.io client connection.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log(`[Socket.io Client] Connected with ID: ${socket?.id}`);
    });

    socket.on('connect_error', (error) => {
      console.warn('[Socket.io Client] Connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.io Client] Disconnected:', reason);
    });
  }

  return socket;
}

/**
 * Disconnects the socket when shutting down.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
