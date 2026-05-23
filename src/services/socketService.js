/**
 * socketService — manages the singleton Socket.IO client instance.
 *
 * Usage:
 *   import { connect, disconnect, getSocket } from './socketService';
 *   connect(token);
 *   getSocket().emit('room:create', data);
 */
import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

let _socket = null;

/**
 * Create (or reuse) the socket connection.
 * @param {string} token  JWT from localStorage
 * @returns {Socket}
 */
export const connect = (token) => {
  if (_socket?.connected) return _socket;

  // Disconnect stale socket before creating a new one
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(SOCKET_URL, {
    auth:       { token },
    // polling first — always succeeds, then upgrades to WebSocket automatically
    transports: ['polling', 'websocket'],
    reconnection:         true,
    reconnectionAttempts: 5,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 10000,
    timeout:              20000,
    autoConnect:          true,
  });

  return _socket;
};

/** Gracefully close the connection. */
export const disconnect = () => {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
};

/** Return the current socket (may be null if not connected). */
export const getSocket = () => _socket;

/** True if the socket exists and is connected. */
export const isConnected = () => Boolean(_socket?.connected);
