/**
 * useSocketRoom — room lifecycle hook.
 * Wraps create / join / leave and tracks room state.
 *
 * Example:
 *   const { createRoom, joinRoom, leaveRoom, room, roomError } = useSocketRoom();
 */
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';

export const useSocketRoom = () => {
  const { emit, on, connected, addLog } = useSocket();

  const [room, setRoom]           = useState(null);   // current room data
  const [roomError, setRoomError] = useState(null);
  const [loading, setLoading]     = useState(false);

  // Listen for room events from the server
  useEffect(() => {
    const offCreated = on('room:created', (data) => {
      setRoom(data);
      setRoomError(null);
      addLog(`Room created — ${data.roomCode}`, 'success');
    });

    const offJoined = on('room:joined', (data) => {
      setRoom(data);
      setRoomError(null);
      addLog(`Joined room — ${data.roomCode}`, 'success');
    });

    const offLeft = on('room:left', (data) => {
      setRoom(null);
      addLog(`Left room — ${data.roomCode}`, 'info');
    });

    const offUserJoined = on('room:user:joined', (data) => {
      addLog(`${data.userName} joined the room`, 'info');
      setRoom((prev) => prev ? { ...prev, participants: data.participants } : prev);
    });

    const offUserLeft = on('room:user:left', (data) => {
      addLog(`${data.userName} left the room`, 'warn');
    });

    const offError = on('socket:error', (data) => {
      setRoomError(data.message);
      addLog(`Room error — ${data.message}`, 'error');
    });

    // Test room events
    const offTestCreated = on('room:test:created', (data) => {
      setRoom(data);
      addLog(`Test room created — ${data.roomCode}`, 'success');
    });

    const offTestJoined = on('room:test:joined', (data) => {
      setRoom((prev) => prev || data);
      addLog(`Test room joined — ${data.roomCode}`, 'success');
    });

    return () => {
      offCreated(); offJoined(); offLeft();
      offUserJoined(); offUserLeft(); offError();
      offTestCreated(); offTestJoined();
    };
  }, [on, addLog]);

  const createRoom = useCallback(async (metadata = {}) => {
    if (!connected) { setRoomError('Not connected'); return; }
    setLoading(true);
    setRoomError(null);
    try {
      const ack = await emit('room:create', { metadata });
      if (ack && ack.roomCode) {
        setRoom(ack);
        setRoomError(null);
      }
    } catch (err) {
      setRoomError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connected, emit]);

  const joinRoom = useCallback(async (roomCode) => {
    if (!connected) { setRoomError('Not connected'); return; }
    if (!roomCode?.trim()) { setRoomError('Enter a room code'); return; }
    setLoading(true);
    setRoomError(null);
    try {
      const ack = await emit('room:join', { roomCode: roomCode.trim().toUpperCase() });
      if (ack && ack.roomCode) {
        setRoom(ack);
        setRoomError(null);
      }
    } catch (err) {
      setRoomError(err.message);
    } finally {
      setLoading(false);
    }
  }, [connected, emit]);

  const leaveRoom = useCallback(async () => {
    if (!room?.roomCode) return;
    setLoading(true);
    try {
      await emit('room:leave', { roomCode: room.roomCode });
    } catch (err) {
      setRoomError(err.message);
    } finally {
      setLoading(false);
    }
  }, [room, emit]);

  // Test-only helpers
  const createTestRoom = useCallback(() => {
    if (!connected) return;
    emit('room:create:test', {}).catch(() => {});
  }, [connected, emit]);

  const joinTestRoom = useCallback((roomCode) => {
    if (!connected || !roomCode) return;
    emit('room:join:test', { roomCode }).catch(() => {});
  }, [connected, emit]);

  return {
    room, roomError, loading,
    createRoom, joinRoom, leaveRoom,
    createTestRoom, joinTestRoom,
  };
};

export default useSocketRoom;
