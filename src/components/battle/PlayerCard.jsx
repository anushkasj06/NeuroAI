import { useEffect, useState } from 'react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

/**
 * PlayerCard — shows a single player's avatar, name, and ready state.
 * Animates in when a player joins.
 */
export default function PlayerCard({ player, isHost, isCurrentUser, animate = false }) {
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [animate]);

  const initial = player?.name?.charAt(0)?.toUpperCase() || '?';

  // Avatar gradient based on first char code
  const hue = ((initial.charCodeAt(0) - 65) / 26) * 300;
  const avatarStyle = {
    background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${hue + 40},70%,45%))`,
  };

  return (
    <div
      className={`transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div
        className={`relative rounded-2xl border p-5 flex flex-col items-center gap-3 transition-all duration-300 ${
          player?.isReady
            ? 'border-emerald-500 bg-emerald-950/40 shadow-emerald-900/30 shadow-lg'
            : 'border-gray-700 bg-gray-900'
        }`}
      >
        {/* Host crown */}
        {isHost && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg" title="Host">
            👑
          </span>
        )}

        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
          style={avatarStyle}
        >
          {initial}
        </div>

        {/* Name */}
        <div className="text-center">
          <p className="font-semibold text-white text-sm">
            {player?.name || 'Unknown'}
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-indigo-400 font-normal">(you)</span>
            )}
          </p>
        </div>

        {/* Ready badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
            player?.isReady
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400'
          }`}
        >
          {player?.isReady ? (
            <><CheckCircleIcon className="h-3.5 w-3.5" /> Ready</>
          ) : (
            <><ClockIcon className="h-3.5 w-3.5" /> Not ready</>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * EmptyPlayerSlot — placeholder for an open slot.
 */
export function EmptyPlayerSlot() {
  return (
    <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 p-5 flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
        <span className="text-2xl text-gray-600">?</span>
      </div>
      <p className="text-sm text-gray-500 font-medium">Waiting for player…</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
