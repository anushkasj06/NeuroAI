/**
 * connectionHandler — fires on every authenticated socket connection.
 * Registers disconnect, reconnect detection, and test events.
 */
const { addOnlineUser, removeOnlineUser, getOnlineCount } = require('../socketManager');

const connectionHandler = (io, socket) => {
  const { _id: userId, name, role } = socket.user;

  // ── Register user ───────────────────────────────────────────────────────────
  addOnlineUser(userId, socket.id);

  console.log(
    `[Socket] CONNECT  | user=${name} (${userId}) | socket=${socket.id} | online=${getOnlineCount()}`
  );

  // Confirm connection to the client
  socket.emit('socket:connected', {
    socketId:  socket.id,
    userId,
    name,
    role,
    timestamp: new Date().toISOString(),
    message:   'Socket connection established',
  });

  // ── Test events (Phase 1 only) ──────────────────────────────────────────────
  socket.on('socket:test', (data, ack) => {
    console.log(`[Socket] TEST     | user=${name} | data=`, data);
    const response = {
      echo:      data,
      userId,
      socketId:  socket.id,
      timestamp: new Date().toISOString(),
      message:   'Socket test successful',
    };
    socket.emit('socket:test:response', response);
    if (typeof ack === 'function') ack({ status: 'ok', ...response });
  });

  // ── Disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    removeOnlineUser(userId, socket.id);
    console.log(
      `[Socket] DISCONNECT | user=${name} (${userId}) | socket=${socket.id} | reason=${reason} | online=${getOnlineCount()}`
    );
  });

  // ── Reconnect detection (client fires this after reconnect) ────────────────
  socket.on('socket:reconnect', () => {
    addOnlineUser(userId, socket.id);
    console.log(`[Socket] RECONNECT | user=${name} (${userId}) | socket=${socket.id}`);
    socket.emit('socket:connected', {
      socketId:  socket.id,
      userId,
      name,
      role,
      timestamp: new Date().toISOString(),
      message:   'Socket reconnected',
      reconnect: true,
    });
  });
};

module.exports = connectionHandler;
