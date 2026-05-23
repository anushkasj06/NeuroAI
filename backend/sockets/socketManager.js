/**
 * SocketManager — single source of truth for the Socket.IO server instance
 * and the online-users registry.
 *
 * Usage:
 *   const { getIO, getOnlineUsers } = require('./socketManager');
 *   getIO().to(roomId).emit('event', data);
 */

let _io = null;

// Map<userId, Set<socketId>>  — one user can have multiple tabs/devices
const onlineUsers = new Map();

const setIO = (io) => { _io = io; };

const getIO = () => {
  if (!_io) throw new Error('Socket.IO not initialised — call initSocket first');
  return _io;
};

// ── Online user registry ──────────────────────────────────────────────────────

const addOnlineUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socketId);
};

const removeOnlineUser = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) onlineUsers.delete(userId);
};

const isUserOnline = (userId) => onlineUsers.has(userId);

const getOnlineUsers = () => [...onlineUsers.keys()];

const getOnlineCount = () => onlineUsers.size;

module.exports = {
  setIO,
  getIO,
  addOnlineUser,
  removeOnlineUser,
  isUserOnline,
  getOnlineUsers,
  getOnlineCount,
};
