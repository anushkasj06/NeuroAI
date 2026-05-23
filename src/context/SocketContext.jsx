import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { connect, disconnect, getSocket } from '../services/socketService';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected]   = useState(false);
  const [socketId, setSocketId]     = useState(null);
  const [error, setError]           = useState(null);
  const [logs, setLogs]             = useState([]);   // for the test UI
  const socketRef = useRef(null);

  const addLog = useCallback((msg, type = 'info') => {
    setLogs((prev) => [
      { id: Date.now() + Math.random(), msg, type, ts: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49),   // keep last 50 entries
    ]);
  }, []);

  useEffect(() => {
    if (!user) {
      // User logged out — clean up
      disconnect();
      socketRef.current = null;
      setConnected(false);
      setSocketId(null);
      setError(null);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = connect(token);
    socketRef.current = socket;

    // ── Core lifecycle events ────────────────────────────────────────────────
    socket.on('connect', () => {
      setConnected(true);
      setSocketId(socket.id);
      setError(null);
      addLog(`Connected — socket ${socket.id}`, 'success');
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      setSocketId(null);
      addLog(`Disconnected — ${reason}`, 'warn');
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err.message);
      addLog(`Connection error — ${err.message}`, 'error');
    });

    socket.on('reconnect', (attempt) => {
      addLog(`Reconnected after ${attempt} attempt(s)`, 'success');
      // Tell the server we're back
      socket.emit('socket:reconnect');
    });

    socket.on('reconnect_attempt', (attempt) => {
      addLog(`Reconnect attempt ${attempt}…`, 'warn');
    });

    socket.on('reconnect_failed', () => {
      setError('Reconnection failed — please refresh');
      addLog('Reconnection failed', 'error');
    });

    // ── Server-sent events ───────────────────────────────────────────────────
    socket.on('socket:connected', (data) => {
      addLog(`Server ACK — ${data.message}`, 'success');
    });

    socket.on('socket:error', (data) => {
      addLog(`Server error — ${data.message}`, 'error');
    });

    // ── Cleanup on unmount / user change ────────────────────────────────────
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect');
      socket.off('reconnect_attempt');
      socket.off('reconnect_failed');
      socket.off('socket:connected');
      socket.off('socket:error');
    };
  }, [user, addLog]);

  /** Emit a socket event. Returns a Promise that resolves with the ack. */
  const emit = useCallback((event, data) => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current || getSocket();
      if (!socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit(event, data, (ack) => {
        if (ack?.status === 'error') reject(new Error(ack.message));
        else resolve(ack);
      });
    });
  }, []);

  /** Subscribe to a socket event. Returns an unsubscribe function. */
  const on = useCallback((event, handler) => {
    // Always grab the current socket — avoids stale reference after reconnect
    const socket = socketRef.current || getSocket();
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const value = {
    socket:    socketRef.current,
    connected,
    socketId,
    error,
    logs,
    emit,
    on,
    addLog,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocketContext must be used inside <SocketProvider>');
  return ctx;
};

export default SocketContext;
