import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useBattleLobby } from '../hooks/useBattleLobby';
import { useBattleQuiz } from '../hooks/useBattleQuiz';
import { useAuth } from '../context/AuthContext';
import RoomCodeCard from '../components/battle/RoomCodeCard';
import PlayerCard, { EmptyPlayerSlot } from '../components/battle/PlayerCard';
import BattleConfigPanel from '../components/battle/BattleConfigPanel';

export default function BattleLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    lobby, lobbyState, lobbyError,
    loading, lastJoinEvent,
    isHost, amReady, canStart,
    setReady, leaveBattle, updateConfig,
  } = useBattleLobby();

  const { startBattle } = useBattleQuiz();

  // Only redirect to home if still idle after a short mount delay
  // (prevents redirect before the socket event arrives)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mounted && lobbyState === 'idle' && !lobby) {
      navigate('/battle/home', { replace: true });
    }
  }, [mounted, lobbyState, lobby, navigate]);

  // Navigate to game when battle:started fires (lobbyState → 'starting')
  useEffect(() => {
    if (lobbyState === 'starting' && lobby?.roomCode) {
      navigate(`/battle/game/${lobby.roomCode}`, { replace: true });
    }
  }, [lobbyState, lobby, navigate]);

  const handleStart = async () => {
    if (!lobby?.roomCode) return;
    await startBattle(lobby.roomCode);
    // Navigation happens via the 'battle:started' event → lobbyState = 'starting'
  };

  const handleLeave = async () => {
    await leaveBattle();
    navigate('/battle/home', { replace: true });
  };

  if (!lobby) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">
            {lobbyState === 'creating' ? 'Creating room…' :
             lobbyState === 'joining'  ? 'Joining room…'  : 'Loading lobby…'}
          </p>
        </div>
      </div>
    );
  }

  const slots = Array.from({ length: lobby.maxPlayers }, (_, i) => lobby.players?.[i] || null);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Leave lobby
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <BoltIcon className="h-4 w-4 text-indigo-400" />
            <span>Battle Lobby</span>
            <span className={`w-2 h-2 rounded-full ${
              lobby.status === 'waiting' ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
            }`} />
          </div>
        </div>

        {/* Error banner */}
        {lobbyError && (
          <div className="p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm">
            ⚠ {lobbyError}
          </div>
        )}

        {/* Cancelled state */}
        {lobbyState === 'cancelled' && (
          <div className="p-6 rounded-2xl bg-gray-900 border border-gray-700 text-center space-y-4">
            <p className="text-xl font-bold text-white">Room Cancelled</p>
            <p className="text-gray-400 text-sm">{lobbyError || 'The host left the room.'}</p>
            <button
              onClick={() => navigate('/battle/home')}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
            >
              Back to Battle Home
            </button>
          </div>
        )}

        {lobbyState !== 'cancelled' && (
          <div className="grid lg:grid-cols-5 gap-6">

            {/* Left — room code + players */}
            <div className="lg:col-span-3 space-y-6">
              <RoomCodeCard roomCode={lobby.roomCode} />

              {/* Players grid */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  Players ({lobby.playerCount} / {lobby.maxPlayers})
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {slots.map((player, i) =>
                    player ? (
                      <PlayerCard
                        key={player.userId}
                        player={player}
                        isHost={player.userId === lobby.hostId}
                        isCurrentUser={player.userId === user?._id}
                        animate={lastJoinEvent?.userId === player.userId}
                      />
                    ) : (
                      <EmptyPlayerSlot key={`empty-${i}`} />
                    )
                  )}
                </div>
              </div>

              {/* Ready / Start controls */}
              <div className="space-y-3">
                {/* Ready toggle */}
                <button
                  onClick={() => setReady(!amReady)}
                  className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                    amReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                  }`}
                >
                  {amReady ? '✓ Ready — click to unready' : 'Click when ready'}
                </button>

                {/* Start battle (host only, all ready) */}
                {isHost && (
                  <button
                    disabled={!canStart}
                    onClick={handleStart}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 ${
                      canStart
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-900/50 hover:opacity-90 animate-pulse'
                        : 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed'
                    }`}
                  >
                    {canStart
                      ? '⚔ Start Battle!'
                      : lobby.playerCount < 2
                        ? 'Waiting for opponent…'
                        : 'Waiting for all players to ready up…'}
                  </button>
                )}

                {!isHost && lobby.allReady && (
                  <div className="text-center py-3 rounded-2xl bg-indigo-950 border border-indigo-700 text-indigo-300 text-sm font-medium animate-pulse">
                    ⚔ All ready — waiting for host to start…
                  </div>
                )}
              </div>
            </div>

            {/* Right — config panel */}
            <div className="lg:col-span-2 space-y-4">
              <BattleConfigPanel
                lobby={lobby}
                isHost={isHost}
                onUpdate={updateConfig}
              />

              {/* Status summary */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-2 text-xs text-gray-400">
                <p className="font-semibold text-gray-300 text-sm mb-3">Lobby Status</p>
                <StatusRow label="Room"       value={lobby.roomCode} />
                <StatusRow label="Subject"    value={lobby.subject    || 'Not set'} />
                <StatusRow label="Topic"      value={lobby.topic      || 'Not set'} />
                <StatusRow label="Difficulty" value={lobby.difficulty || 'medium'} capitalize />
                <StatusRow label="Players"    value={`${lobby.playerCount} / ${lobby.maxPlayers}`} />
                <StatusRow
                  label="All Ready"
                  value={lobby.allReady ? 'Yes ✓' : 'No'}
                  accent={lobby.allReady ? 'emerald' : 'gray'}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, value, capitalize = false, accent = 'gray' }) {
  const colors = { emerald: 'text-emerald-400', gray: 'text-gray-300' };
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={`font-medium ${colors[accent]} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
}
