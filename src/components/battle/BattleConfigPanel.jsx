import { useState } from 'react';
import { BATTLE_SUBJECTS, getTopicsForSubject } from '../../constants/battleSubjects';

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy',   color: 'border-emerald-500 bg-emerald-950/40 text-emerald-400' },
  { value: 'medium', label: 'Medium', color: 'border-amber-500 bg-amber-950/40 text-amber-400' },
  { value: 'hard',   label: 'Hard',   color: 'border-red-500 bg-red-950/40 text-red-400' },
];

/**
 * BattleConfigPanel — host-only panel to set subject, topic, difficulty.
 * Read-only view shown to non-host players.
 */
export default function BattleConfigPanel({ lobby, isHost, onUpdate }) {
  const [subject,    setSubject]    = useState(lobby?.subjectSlug || '');
  const [topic,      setTopic]      = useState(lobby?.topic       || '');
  const [difficulty, setDifficulty] = useState(lobby?.difficulty  || 'medium');
  const [saving,     setSaving]     = useState(false);

  const topics = getTopicsForSubject(subject);

  const handleSave = async () => {
    if (!subject || !topic) return;
    setSaving(true);
    const subjectObj = BATTLE_SUBJECTS.find((s) => s.slug === subject);
    await onUpdate({
      subject:     subjectObj?.name || subject,
      subjectSlug: subject,
      topic,
      difficulty,
    });
    setSaving(false);
  };

  // Read-only view for non-host
  if (!isHost) {
    return (
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
          Battle Config
        </p>
        <div className="space-y-2 text-sm">
          <Row label="Subject"    value={lobby?.subject    || '—'} />
          <Row label="Topic"      value={lobby?.topic      || '—'} />
          <Row label="Difficulty" value={lobby?.difficulty || '—'} />
        </div>
        <p className="mt-4 text-xs text-gray-500 italic">
          Waiting for host to configure the battle…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">
        Configure Battle
      </p>

      <div className="space-y-4">
        {/* Subject */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Subject</label>
          <select
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setTopic(''); }}
            className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— Select subject —</option>
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
            <option value="">— Select topic —</option>
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
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  difficulty === d.value ? d.color : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-600'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!subject || !topic || saving}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Apply Config'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-medium capitalize">{value}</span>
    </div>
  );
}
