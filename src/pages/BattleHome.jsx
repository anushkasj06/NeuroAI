import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoltIcon, UserGroupIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useBattleLobby } from '../hooks/useBattleLobby';
import { useSocket } from '../hooks/useSocket';
import { BATTLE_SUBJECTS, getTopicsForSubject } from '../constants/battleSubjects';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function BattleHome() {
  const navigate   = useNavigate();
  const { connected } = useSocket();
  const { createBattle, joinBattle, lobbyError, loading, clearError, lobbyState, lobby } = useBattleLobby();

  const [tab, setTab] = useState('create');
  const [subject,    setSubject]    = useState('');
  const [topic,      setTopic]      = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [joinCode,   setJoinCode]   = useState('');

  const topics = getTopicsForSubject(subject);

  // Navigate to lobby ONLY after the socket event confirms the room exists
  useEffect(() => {
    if (lobbyState === 'in_lobby' && lobby?.roomCode) {
      navigate('/battle/lobby');
    }
  }, [lobbyState, lobby, navigate]);

  const handleCreate = async () => {
    clearError();
    const subjectObj = BATTLE_SUBJECTS.find((s) => s.slug === subject);
    const ack = await createBattle({
      subject:     subjectObj?.name || '',
      subjectSlug: subject,
      topic,
      difficulty,
    });
    console.debug('[BattleHome] createBattle ack:', ack);
    // Navigation happens via useEffect when lobbyState → 'in_lobby'
  };

  const handleJoin = async () => {
    clearError();
    await joinBattle(joinCode);
    // Navigation happens via useEffect when lobbyState → 'in_lobby'
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 text-xs font-semibold uppercase tracking-wide">
            <BoltIcon className="h-3.5 w-3.5" />
            Multiplayer Battle
          </div>
          <h1 className="text-3xl font-bold text-white">Challenge a Friend</h1>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Create a private room or join with a code. Real-time head-to-head quiz battles.
          </p>

          {/* Connection indicator */}
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
            {connected ? 'Connected' : 'Disconnected — check your connection'}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl bg-gray-900 border border-gray-800 p-1">
          {[
            { id: 'create', label: '⚔ Create Room',  icon: BoltIcon },
            { id: 'join',   label: '🚪 Join Room',    icon: UserGroupIcon },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); clearError(); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {lobbyError && (
          <div className="p-4 rounded-xl bg-red-950 border border-red-800 text-red-300 text-sm flex items-start justify-between gap-3">
            <span>⚠ {lobbyError}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-200 shrink-0">✕</button>
          </div>
        )}

        {/* Create tab */}
        {tab === 'create' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-white">Room Configuration</h2>

            {/* Subject */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setTopic(''); }}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select subject (optional) —</option>
                {BATTLE_SUBJECTS.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={!subject}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-40"
              >
                <option value="">— Select topic (optional) —</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                      difficulty === d
                        ? d === 'easy'   ? 'border-emerald-500 bg-emerald-950 text-emerald-400'
                        : d === 'medium' ? 'border-amber-500 bg-amber-950 text-amber-400'
                        :                  'border-red-500 bg-red-950 text-red-400'
                        : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !connected}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && lobbyState === 'creating' ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating room…</>
              ) : (
                <><BoltIcon className="h-4 w-4" /> Create Battle Room</>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              You can also configure subject/topic from inside the lobby
            </p>
          </div>
        )}

        {/* Join tab */}
        {tab === 'join' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h2 className="font-bold text-white">Join a Room</h2>
            <p className="text-sm text-gray-400">
              Ask your friend for their 6-character room code.
            </p>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Room Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-xl font-bold tracking-[0.3em] text-center placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                {joinCode.length}/6 characters
              </p>
            </div>

            <button
              onClick={handleJoin}
              disabled={loading || !connected || joinCode.length !== 6}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && lobbyState === 'joining' ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining…</>
              ) : (
                <><ArrowRightIcon className="h-4 w-4" /> Join Room</>
              )}
            </button>
          </div>
        )}

        {/* Back to solo */}
        <div className="text-center">
          <button
            onClick={() => navigate('/battle')}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to Solo Battle
          </button>
        </div>
      </div>
    </div>
  );
}
