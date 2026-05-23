import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

/**
 * RoomCodeCard — animated card showing the room code with copy button.
 */
export default function RoomCodeCard({ roomCode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = roomCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-px shadow-xl">
      {/* Animated shimmer border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-30 animate-pulse" />

      <div className="relative rounded-2xl bg-gray-950 px-8 py-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Room Code
        </p>

        {/* Code characters — each letter gets its own box */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {roomCode.split('').map((char, i) => (
            <div
              key={i}
              className="w-10 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-white tracking-wider"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {char}
            </div>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {copied ? (
            <><CheckIcon className="h-4 w-4" /> Copied!</>
          ) : (
            <><ClipboardDocumentIcon className="h-4 w-4" /> Copy code</>
          )}
        </button>

        <p className="mt-3 text-xs text-gray-500">
          Share this code with your opponent
        </p>
      </div>
    </div>
  );
}
