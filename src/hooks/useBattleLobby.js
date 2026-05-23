/**
 * useBattleLobby — Phase 2 hook.
 * Manages the full battle room + lobby lifecycle:
 *   createBattle, joinBattle, setReady, leaveBattle, updateConfig
 *
 * Listens to:
 *   room:created, player:joined, player:left, player:ready,
 *   lobby:updated, battle:error
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '../context/AuthContext';

const INITIAL_LOBBY = null;

export const useBattleLobby = () => {
  const { emit, on, connected } = useSocket();
  const { user } = useAuth();

  const [lobby, setLobby]         = useState(INITIAL_LOBBY);
  const [lobbyError, setLobbyError] = useState(null);
  const [loading, setLoading]     = useState(false);
  // 'idle' | 'creating' | 'joining' | 'in_lobby' | 'starting' | 'cancelled'
  const [lobbyState, setLobbyState] = useState('idle');
  // Track latest join event for animation triggers
  const [lastJoinEvent, setLastJoinEvent] = useState(null);
  const [lastReadyEvent, setLastReadyEvent] = useState(null);

  const lobbyRef = useRef(lobby);
  lobbyRef.current = lobby;

  // ── Subscribe to server events ────────────────────────────────────────────
  useEffect(() => {
    const offCreated = on('room:created', (data) => {
      setLobby(data);
      setLobbyState('in_lobby');
      setLobbyError(null);
    });

    const offJoined = on('player:joined', (data) => {
      setLobby(data);
      setLobbyState('in_lobby');
      setLobbyError(null);
      if (data.joinedUserId !== user?._id) {
        setLastJoinEvent({ userId: data.joinedUserId, name: data.joinedUserName, ts: Date.now() });
      }
    });

    const offLeft = on('player:left', (data) => {
      if (data.roomCancelled) {
        setLobby(null);
        setLobbyState('cancelled');
        setLobbyError(data.reason || 'Room was cancelled');
      } else {
        setLobby((prev) => prev ? { ...prev, players: data.players } : prev);
      }
    });

    const offReady = on('player:ready', (data) => {
      setLastReadyEvent({ userId: data.userId, isReady: data.isReady, ts: Date.now() });
      setLobby((prev) =>
        prev ? { ...prev, players: data.players, allReady: data.allReady } : prev
      );
    });

    const offLobbyUpdated = on('lobby:updated', (data) => {
      setLobby(data);
      if (data.status === 'cancelled') {
        setLobbyState('cancelled');
      } else if (data.status === 'starting') {
        setLobbyState('starting');
      } else {
        setLobbyState('in_lobby');
      }
    });

    const offError = on('battle:error', (data) => {
      setLobbyError(data.message);
      setLoading(false);
    });

    return () => {
      offCreated(); offJoined(); offLeft();
      offReady(); offLobbyUpdated(); offError();
    };
  }, [on, user?._id]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createBattle = useCallback(async (config = {}) => {
    if (!connected) { setLobbyError('Not connected to server'); return; }
    setLoading(true);
    setLobbyError(null);
    setLobbyState('creating');
    try {
      const ack = await emit('battle:create', config);
      console.debug('[useBattleLobby] battle:create ack:', ack);
      // If ACK contains the lobby snapshot, update local state immediately.
      if (ack && ack.roomCode) {
        setLobby(ack);
        setLobbyState('in_lobby');
        setLobbyError(null);
      }
      return ack;
    } catch (err) {
      console.debug('[useBattleLobby] battle:create error:', err);
      setLobbyError(err.message);
      setLobbyState('idle');
    } finally {
      setLoading(false);
    }
  }, [connected, emit]);

  const joinBattle = useCallback(async (roomCode) => {
    if (!connected) { setLobbyError('Not connected to server'); return; }
    if (!roomCode?.trim()) { setLobbyError('Enter a room code'); return; }
    setLoading(true);
    setLobbyError(null);
    setLobbyState('joining');
    try {
      const ack = await emit('battle:join', { roomCode: roomCode.trim().toUpperCase() });
      console.debug('[useBattleLobby] battle:join ack:', ack);
      if (ack && ack.roomCode) {
        setLobby(ack);
        setLobbyState('in_lobby');
        setLobbyError(null);
      }
      return ack;
    } catch (err) {
      console.debug('[useBattleLobby] battle:join error:', err);
      setLobbyError(err.message);
      setLobbyState('idle');
    } finally {
      setLoading(false);
    }
  }, [connected, emit]);

  const setReady = useCallback(async (isReady) => {
    if (!lobbyRef.current?.roomCode) return;
    try {
      await emit('battle:ready', { roomCode: lobbyRef.current.roomCode, isReady });
    } catch (err) {
      setLobbyError(err.message);
    }
  }, [emit]);

  const leaveBattle = useCallback(async () => {
    const roomCode = lobbyRef.current?.roomCode;
    if (!roomCode) { setLobby(null); setLobbyState('idle'); return; }
    try {
      await emit('battle:leave', { roomCode });
    } catch {}
    setLobby(null);
    setLobbyState('idle');
    setLobbyError(null);
  }, [emit]);

  const updateConfig = useCallback(async (config) => {
    if (!lobbyRef.current?.roomCode) return;
    try {
      await emit('battle:config', { roomCode: lobbyRef.current.roomCode, ...config });
    } catch (err) {
      setLobbyError(err.message);
    }
  }, [emit]);

  const clearError = useCallback(() => setLobbyError(null), []);

  const resetLobby = useCallback(() => {
    setLobby(null);
    setLobbyState('idle');
    setLobbyError(null);
    setLastJoinEvent(null);
    setLastReadyEvent(null);
  }, []);

  // Derived helpers
  const myPlayer = lobby?.players?.find((p) => p.userId === user?._id);
  const isHost   = lobby?.hostId === user?._id;
  const amReady  = myPlayer?.isReady ?? false;
  const canStart = isHost && (lobby?.allReady ?? false) && (lobby?.playerCount ?? 0) >= 2;

  return {
    lobby,
    lobbyState,
    lobbyError,
    loading,
    lastJoinEvent,
    lastReadyEvent,
    myPlayer,
    isHost,
    amReady,
    canStart,
    createBattle,
    joinBattle,
    setReady,
    leaveBattle,
    updateConfig,
    clearError,
    resetLobby,
  };
};

export default useBattleLobby;
