/**
 * roomHandler — basic Socket.IO room foundation.
 * Phase 1: create / join / leave rooms only.
 * No battle logic yet.
 */
const { nanoid } = require('nanoid');
const BattleRoom  = require('../../models/BattleRoom');

/**
 * Generate a short, human-readable room code (6 uppercase chars).
 */
const generateRoomCode = () => nanoid(6).toUpperCase();

const roomHandler = (io, socket) => {
  const { _id: userId, name } = socket.user;

  // ── room:create ─────────────────────────────────────────────────────────────
  socket.on('room:create', async (data, ack) => {
    try {
      const roomCode = generateRoomCode();

      const room = await BattleRoom.create({
        roomCode,
        hostId:         userId,
        participantIds: [userId],
        status:         'waiting',
        metadata:       data?.metadata || {},
      });

      // Join the Socket.IO room
      socket.join(roomCode);

      console.log(`[Room] CREATED | code=${roomCode} | host=${name}`);

      const payload = {
        roomCode,
        roomId:    room._id.toString(),
        hostId:    userId,
        hostName:  name,
        status:    'waiting',
        timestamp: new Date().toISOString(),
      };

      socket.emit('room:created', payload);
      if (typeof ack === 'function') ack({ status: 'ok', ...payload });
    } catch (err) {
      console.error('[Room] CREATE error:', err.message);
      const errPayload = { status: 'error', message: err.message };
      socket.emit('socket:error', errPayload);
      if (typeof ack === 'function') ack(errPayload);
    }
  });

  // ── room:join ───────────────────────────────────────────────────────────────
  socket.on('room:join', async (data, ack) => {
    try {
      const { roomCode } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      const room = await BattleRoom.findOne({ roomCode });
      if (!room) throw new Error(`Room ${roomCode} not found`);
      if (room.status !== 'waiting') throw new Error(`Room ${roomCode} is not open for joining`);

      // Add participant if not already in
      if (!room.participantIds.map(String).includes(userId)) {
        room.participantIds.push(userId);
        await room.save();
      }

      socket.join(roomCode);

      console.log(`[Room] JOINED  | code=${roomCode} | user=${name}`);

      const payload = {
        roomCode,
        roomId:       room._id.toString(),
        hostId:       room.hostId.toString(),
        participants: room.participantIds.map(String),
        status:       room.status,
        timestamp:    new Date().toISOString(),
      };

      // Notify everyone in the room
      io.to(roomCode).emit('room:user:joined', {
        userId,
        userName:     name,
        participants: room.participantIds.map(String),
        timestamp:    new Date().toISOString(),
      });

      socket.emit('room:joined', payload);
      if (typeof ack === 'function') ack({ status: 'ok', ...payload });
    } catch (err) {
      console.error('[Room] JOIN error:', err.message);
      const errPayload = { status: 'error', message: err.message };
      socket.emit('socket:error', errPayload);
      if (typeof ack === 'function') ack(errPayload);
    }
  });

  // ── room:leave ──────────────────────────────────────────────────────────────
  socket.on('room:leave', async (data, ack) => {
    try {
      const { roomCode } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      socket.leave(roomCode);

      // Remove from DB participants
      await BattleRoom.findOneAndUpdate(
        { roomCode },
        { $pull: { participantIds: userId } }
      );

      console.log(`[Room] LEFT    | code=${roomCode} | user=${name}`);

      io.to(roomCode).emit('room:user:left', {
        userId,
        userName:  name,
        timestamp: new Date().toISOString(),
      });

      const payload = { status: 'ok', roomCode, timestamp: new Date().toISOString() };
      socket.emit('room:left', payload);
      if (typeof ack === 'function') ack(payload);
    } catch (err) {
      console.error('[Room] LEAVE error:', err.message);
      const errPayload = { status: 'error', message: err.message };
      socket.emit('socket:error', errPayload);
      if (typeof ack === 'function') ack(errPayload);
    }
  });

  // ── room:test:create (test-only, no DB) ─────────────────────────────────────
  socket.on('room:create:test', (data, ack) => {
    const roomCode = 'TEST_' + generateRoomCode();
    socket.join(roomCode);
    console.log(`[Room] TEST-CREATE | code=${roomCode} | user=${name}`);
    const payload = { roomCode, userId, userName: name, timestamp: new Date().toISOString() };
    socket.emit('room:test:created', payload);
    if (typeof ack === 'function') ack({ status: 'ok', ...payload });
  });

  // ── room:test:join (test-only, no DB) ───────────────────────────────────────
  socket.on('room:join:test', (data, ack) => {
    const { roomCode } = data || {};
    if (!roomCode) {
      const err = { status: 'error', message: 'roomCode required' };
      socket.emit('socket:error', err);
      if (typeof ack === 'function') ack(err);
      return;
    }
    socket.join(roomCode);
    console.log(`[Room] TEST-JOIN  | code=${roomCode} | user=${name}`);
    io.to(roomCode).emit('room:test:joined', { userId, userName: name, roomCode, timestamp: new Date().toISOString() });
    const payload = { status: 'ok', roomCode, userId, userName: name };
    socket.emit('room:test:joined', payload);
    if (typeof ack === 'function') ack(payload);
  });
};

module.exports = roomHandler;
