/**
 * battleHandler — Phase 2: Multiplayer Room + Battle Lobby System.
 *
 * Events handled (CLIENT → SERVER):
 *   battle:create   — host creates a new battle room
 *   battle:join     — player joins by room code
 *   battle:ready    — player toggles ready state
 *   battle:leave    — player leaves the lobby
 *   battle:config   — host updates subject / topic / difficulty
 *
 * Events emitted (SERVER → CLIENT):
 *   room:created    — sent to host after room creation
 *   player:joined   — broadcast to room when someone joins
 *   player:left     — broadcast to room when someone leaves
 *   player:ready    — broadcast to room when ready state changes
 *   lobby:updated   — full lobby snapshot broadcast after any state change
 *   battle:error    — error sent to the requesting socket only
 */

const { nanoid } = require('nanoid');
const BattleRoom = require('../../models/BattleRoom');
const { startFromRoom } = require('../battleManager');

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateRoomCode = () => nanoid(6).toUpperCase();

/** Emit a full lobby snapshot to everyone in the Socket.IO room. */
const broadcastLobby = (io, roomCode, room) => {
  io.to(roomCode).emit('lobby:updated', room.toLobbySnapshot());
};

/** Send an error only to the requesting socket. */
const sendError = (socket, message, code = 'BATTLE_ERROR') => {
  socket.emit('battle:error', { code, message, timestamp: new Date().toISOString() });
};

// ── Handler ───────────────────────────────────────────────────────────────────

const battleHandler = (io, socket) => {
  const { _id: userId, name } = socket.user;
  const avatarInitial = name?.charAt(0)?.toUpperCase() || '?';

  // ── battle:create ──────────────────────────────────────────────────────────
  socket.on('battle:create', async (data, ack) => {
    try {
      const {
        subject    = '',
        subjectSlug = '',
        topic      = '',
        difficulty = 'medium',
        maxPlayers = 2,
      } = data || {};

      // Prevent host from being in multiple active rooms
      const existing = await BattleRoom.findOne({
        hostId: userId,
        status: 'waiting',
      });
      if (existing) {
        // Clean up stale room first
        await BattleRoom.deleteOne({ _id: existing._id });
        socket.leave(existing.roomCode);
      }

      const roomCode = generateRoomCode();

      const room = await BattleRoom.create({
        roomCode,
        hostId:         userId,
        participantIds: [userId],
        status:         'waiting',
        subject,
        subjectSlug,
        topic,
        difficulty,
        maxPlayers:     Math.min(Math.max(2, maxPlayers), 8),
        players: [
          { userId, name, isReady: false, joinedAt: new Date(), avatarInitial },
        ],
      });

      socket.join(roomCode);

      console.log(`[Battle] CREATED | code=${roomCode} | host=${name} | subject=${subject}`);

      const snapshot = room.toLobbySnapshot();

      socket.emit('room:created', snapshot);
      if (typeof ack === 'function') ack({ status: 'ok', ...snapshot });
    } catch (err) {
      console.error('[Battle] CREATE error:', err.message);
      sendError(socket, err.message);
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });

  // ── battle:join ────────────────────────────────────────────────────────────
  socket.on('battle:join', async (data, ack) => {
    try {
      const { roomCode } = data || {};
      if (!roomCode?.trim()) throw new Error('Room code is required');

      const room = await BattleRoom.findOne({ roomCode: roomCode.trim().toUpperCase() });
      if (!room)                          throw new Error(`Room "${roomCode}" not found`);
      if (room.status !== 'waiting')      throw new Error('This room is no longer accepting players');
      if (room.players.length >= room.maxPlayers) throw new Error('Room is full');

      const alreadyIn = room.players.some((p) => p.userId === userId);

      if (!alreadyIn) {
        room.players.push({ userId, name, isReady: false, joinedAt: new Date(), avatarInitial });
        if (!room.participantIds.map(String).includes(userId)) {
          room.participantIds.push(userId);
        }
        // Auto-ready host and the joining player for faster matches
        // Mark joining player as ready
        const joiningIndex = room.players.findIndex((p) => p.userId === userId);
        if (joiningIndex !== -1) room.players[joiningIndex].isReady = true;
        // Mark host as ready as well
        const hostIndex = room.players.findIndex((p) => p.userId === room.hostId.toString());
        if (hostIndex !== -1) room.players[hostIndex].isReady = true;

        await room.save();
      }

      socket.join(room.roomCode);

      console.log(`[Battle] JOINED  | code=${room.roomCode} | user=${name}`);

      const snapshot = room.toLobbySnapshot();

      // Tell the joiner their full lobby state
      socket.emit('player:joined', { ...snapshot, joinedUserId: userId, joinedUserName: name });

      // Tell everyone else a new player arrived
      socket.to(room.roomCode).emit('player:joined', {
        ...snapshot,
        joinedUserId:   userId,
        joinedUserName: name,
      });

      // Broadcast full lobby to all
      broadcastLobby(io, room.roomCode, room);

      // If everyone is ready and we have at least 2 players, auto-start the battle
      const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady);
      if (allReady) {
        try {
          console.log(`[Battle] AUTO-START | code=${room.roomCode} | players=${room.players.map(p=>p.name).join(',')}`);
          await startFromRoom(io, room);
        } catch (err) {
          console.error('[Battle] AUTO-START error:', err.message);
        }
      }

      if (typeof ack === 'function') ack({ status: 'ok', ...snapshot });
    } catch (err) {
      console.error('[Battle] JOIN error:', err.message);
      sendError(socket, err.message);
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });

  // ── battle:ready ───────────────────────────────────────────────────────────
  socket.on('battle:ready', async (data, ack) => {
    try {
      const { roomCode, isReady } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      const room = await BattleRoom.findOne({ roomCode });
      if (!room) throw new Error('Room not found');
      if (room.status !== 'waiting') throw new Error('Room is not in lobby state');

      const player = room.players.find((p) => p.userId === userId);
      if (!player) throw new Error('You are not in this room');

      player.isReady = Boolean(isReady);
      await room.save();

      console.log(`[Battle] READY   | code=${roomCode} | user=${name} | ready=${player.isReady}`);

      const snapshot = room.toLobbySnapshot();

      // Broadcast ready state change
      io.to(roomCode).emit('player:ready', {
        userId,
        userName: name,
        isReady:  player.isReady,
        allReady: snapshot.allReady,
        players:  snapshot.players,
      });

      // Full lobby sync
      broadcastLobby(io, roomCode, room);

      if (typeof ack === 'function') ack({ status: 'ok', allReady: snapshot.allReady });
    } catch (err) {
      console.error('[Battle] READY error:', err.message);
      sendError(socket, err.message);
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });

  // ── battle:leave ───────────────────────────────────────────────────────────
  socket.on('battle:leave', async (data, ack) => {
    try {
      const { roomCode } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      const room = await BattleRoom.findOne({ roomCode });
      if (!room) {
        socket.leave(roomCode);
        if (typeof ack === 'function') ack({ status: 'ok' });
        return;
      }

      // Remove player from embedded array and participantIds
      room.players = room.players.filter((p) => p.userId !== userId);
      room.participantIds = room.participantIds.filter((id) => id.toString() !== userId);

      const isHost = room.hostId.toString() === userId;

      if (room.players.length === 0 || isHost) {
        // Cancel the room if host leaves or room is empty
        room.status = 'cancelled';
        await room.save();
        io.to(roomCode).emit('player:left', {
          userId, userName: name,
          roomCancelled: true,
          reason: isHost ? 'Host left the room' : 'All players left',
        });
        io.to(roomCode).emit('lobby:updated', { ...room.toLobbySnapshot(), status: 'cancelled' });
      } else {
        await room.save();
        io.to(roomCode).emit('player:left', {
          userId, userName: name,
          roomCancelled: false,
          players: room.players,
        });
        broadcastLobby(io, roomCode, room);
      }

      socket.leave(roomCode);
      console.log(`[Battle] LEFT    | code=${roomCode} | user=${name}`);

      if (typeof ack === 'function') ack({ status: 'ok' });
    } catch (err) {
      console.error('[Battle] LEAVE error:', err.message);
      sendError(socket, err.message);
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });

  // ── battle:config (host only — update subject/topic/difficulty) ────────────
  socket.on('battle:config', async (data, ack) => {
    try {
      const { roomCode, subject, subjectSlug, topic, difficulty } = data || {};
      if (!roomCode) throw new Error('roomCode is required');

      const room = await BattleRoom.findOne({ roomCode });
      if (!room) throw new Error('Room not found');
      if (room.hostId.toString() !== userId) throw new Error('Only the host can change room config');
      if (room.status !== 'waiting') throw new Error('Cannot change config after battle starts');

      if (subject    !== undefined) room.subject     = subject;
      if (subjectSlug!== undefined) room.subjectSlug = subjectSlug;
      if (topic      !== undefined) room.topic       = topic;
      if (difficulty !== undefined) room.difficulty  = difficulty;

      // Reset all ready states when config changes
      room.players.forEach((p) => { p.isReady = false; });

      await room.save();

      console.log(`[Battle] CONFIG  | code=${roomCode} | subject=${room.subject} | topic=${room.topic}`);

      broadcastLobby(io, roomCode, room);

      if (typeof ack === 'function') ack({ status: 'ok' });
    } catch (err) {
      console.error('[Battle] CONFIG error:', err.message);
      sendError(socket, err.message);
      if (typeof ack === 'function') ack({ status: 'error', message: err.message });
    }
  });

  // ── Handle disconnect — auto-leave any active battle room ─────────────────
  socket.on('disconnect', async () => {
    try {
      const room = await BattleRoom.findOne({
        'players.userId': userId,
        status: 'waiting',
      });
      if (!room) return;

      room.players = room.players.filter((p) => p.userId !== userId);
      room.participantIds = room.participantIds.filter((id) => id.toString() !== userId);

      const isHost = room.hostId.toString() === userId;

      if (room.players.length === 0 || isHost) {
        room.status = 'cancelled';
        await room.save();
        io.to(room.roomCode).emit('player:left', {
          userId, userName: name,
          roomCancelled: true,
          reason: 'Host disconnected',
        });
      } else {
        await room.save();
        io.to(room.roomCode).emit('player:left', {
          userId, userName: name,
          roomCancelled: false,
          players: room.players,
        });
        broadcastLobby(io, room.roomCode, room);
      }
    } catch {
      // Silently ignore disconnect cleanup errors
    }
  });
};

module.exports = battleHandler;
