/**
 * SocketTestPage — Phase 1 foundation test UI.
 * Tests: connection status, ping, create room, join room, leave room.
 * Remove or hide this page before production.
 */
import { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useSocketRoom } from '../hooks/useSocketRoom';

const LOG_COLORS = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  warn:    'text-amber-400',
  info:    'text-sky-400',
};

export default function SocketTestPage() {
  const { connected, socketId, error, emit, logs } = useSocket();
  const {
    room, roomError, loading,
    createRoom, joinRoom, leaveRoom,
    createTestRoom, joinTestRoom,
  } = useSocketRoom();

  const [joinCode, setJoinCode]   = useState('');
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging]     = useState(false);

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await emit('socket:test', { ping: true, ts: Date.now() });
      setPingResult({ ok: true, data: res });
    } catch (err) {
      setPingResult({ ok: false, msg: err.message });
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🔌 Socket.IO Foundation Test</h1>
            <p className="text-gray-400 text-sm mt-0.5">Phase 1 — connection, rooms, events</p>
          </div>
          <StatusBadge connected={connected} />
        </div>

        {/* Connection info */}
        <div className="grid sm:grid-cols-3 gap-4">
          <InfoCard label="Status"    value={connected ? 'Connected' : 'Disconnected'} accent={connected ? 'emerald' : 'red'} />
          <InfoCard label="Socket ID" value={socketId || '—'} mono />
          <InfoCard label="Error"     value={error || 'None'} accent={error ? 'red' : 'gray'} />
        </div>

        {/* Main grid */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Left — controls */}
          <div className="space-y-4">

            {/* Ping test */}
            <Panel title="📡 Ping Test">
              <button
                onClick={handlePing}
                disabled={!connected || pinging}
                className="btn-primary w-full"
              >
                {pinging ? 'Pinging…' : 'Send socket:test ping'}
              </button>
              {pingResult && (
                <pre className={`mt-3 text-xs rounded-lg p-3 bg-gray-800 overflow-x-auto ${pingResult.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                  {JSON.stringify(pingResult, null, 2)}
                </pre>
              )}
            </Panel>

            {/* Test rooms (no DB) */}
            <Panel title="🧪 Test Rooms (no DB)">
              <button
                onClick={createTestRoom}
                disabled={!connected || loading}
                className="btn-secondary w-full"
              >
                Create test room
              </button>
              <div className="flex gap-2 mt-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="TEST_XXXXXX"
                  className="input flex-1"
                />
                <button
                  onClick={() => joinTestRoom(joinCode)}
                  disabled={!connected || !joinCode || loading}
                  className="btn-secondary px-4"
                >
                  Join
                </button>
              </div>
            </Panel>

            {/* Real rooms (DB) */}
            <Panel title="🏠 Real Rooms (MongoDB)">
              <button
                onClick={() => createRoom()}
                disabled={!connected || loading || !!room}
                className="btn-primary w-full"
              >
                {loading ? 'Creating…' : 'Create room'}
              </button>
              <div className="flex gap-2 mt-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Room code"
                  className="input flex-1"
                />
                <button
                  onClick={() => joinRoom(joinCode)}
                  disabled={!connected || !joinCode || loading}
                  className="btn-primary px-4"
                >
                  Join
                </button>
              </div>
              {room && (
                <button
                  onClick={leaveRoom}
                  disabled={loading}
                  className="btn-danger w-full mt-2"
                >
                  Leave room
                </button>
              )}
              {roomError && (
                <p className="text-red-400 text-xs mt-2">⚠ {roomError}</p>
              )}
            </Panel>

            {/* Current room state */}
            {room && (
              <Panel title="📋 Current Room">
                <pre className="text-xs text-emerald-300 bg-gray-800 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(room, null, 2)}
                </pre>
              </Panel>
            )}
          </div>

          {/* Right — live log */}
          <Panel title="📜 Live Event Log" className="h-full">
            <div className="bg-gray-900 rounded-lg p-3 h-[480px] overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 && (
                <p className="text-gray-600 italic">Waiting for events…</p>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-gray-600 shrink-0">{log.ts}</span>
                  <span className={LOG_COLORS[log.type] || 'text-gray-300'}>{log.msg}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Architecture note */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-400">
          <p className="font-semibold text-gray-300 mb-2">Phase 1 Architecture</p>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 font-mono text-xs">
            {[
              ['Backend', 'backend/sockets/index.js'],
              ['Auth MW', 'backend/sockets/middleware/socketAuth.js'],
              ['Connection', 'backend/sockets/handlers/connectionHandler.js'],
              ['Rooms', 'backend/sockets/handlers/roomHandler.js'],
              ['Manager', 'backend/sockets/socketManager.js'],
              ['Model', 'backend/models/BattleRoom.js'],
              ['Service', 'src/services/socketService.js'],
              ['Context', 'src/context/SocketContext.jsx'],
              ['useSocket', 'src/hooks/useSocket.js'],
              ['useSocketRoom', 'src/hooks/useSocketRoom.js'],
            ].map(([label, path]) => (
              <div key={label} className="flex gap-2">
                <span className="text-indigo-400 shrink-0">{label}:</span>
                <span className="text-gray-500">{path}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ connected }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
      connected
        ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
        : 'bg-red-950 border-red-800 text-red-400'
    }`}>
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}

function InfoCard({ label, value, accent = 'gray', mono = false }) {
  const colors = {
    emerald: 'border-emerald-800 bg-emerald-950/40 text-emerald-300',
    red:     'border-red-800 bg-red-950/40 text-red-300',
    gray:    'border-gray-800 bg-gray-900 text-gray-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[accent] || colors.gray}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children, className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}
