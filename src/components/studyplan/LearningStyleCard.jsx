const STYLE_CONFIG = {
  'Visual Learner':           { emoji: '👁️', gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  'Audio Learner':            { emoji: '🎧', gradient: 'from-amber-500 to-orange-500',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
  'Reading/Writing Learner':  { emoji: '📖', gradient: 'from-blue-500 to-cyan-600',     bg: 'bg-blue-50',   border: 'border-blue-100'   },
  'Interactive Learner':      { emoji: '🧩', gradient: 'from-emerald-500 to-teal-600',  bg: 'bg-emerald-50',border: 'border-emerald-100' },
};

const CONFIDENCE_COLOR = { High: 'text-emerald-600', Moderate: 'text-amber-600', Low: 'text-red-500' };

export default function LearningStyleCard({
  learningStyle, engagementScore, confidenceLevel,
  attentionLevel, recommendedStudyHours,
  motivationalFeedback, estimatedImprovementPotential,
}) {
  const cfg = STYLE_CONFIG[learningStyle] || STYLE_CONFIG['Reading/Writing Learner'];

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-5 shadow-sm`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-2xl shadow-md`}>
          {cfg.emoji}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">Learning Style</p>
          <p className="font-bold text-gray-900 text-sm leading-tight">{learningStyle || 'Not detected yet'}</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <Metric label="Engagement" value={`${engagementScore ?? 0}%`} barPercent={engagementScore ?? 0} color={cfg.gradient} />
        <Metric label="Recommended Study" value={`${recommendedStudyHours ?? 2}h/day`} barPercent={Math.min(100, ((recommendedStudyHours ?? 2) / 8) * 100)} color={cfg.gradient} />
      </div>

      <div className="space-y-1.5 text-xs">
        {confidenceLevel && (
          <p className="text-gray-600">
            Confidence: <span className={`font-semibold ${CONFIDENCE_COLOR[confidenceLevel] || 'text-gray-700'}`}>{confidenceLevel}</span>
          </p>
        )}
        {attentionLevel && (
          <p className="text-gray-500 leading-relaxed line-clamp-2">{attentionLevel}</p>
        )}
        {estimatedImprovementPotential && (
          <p className="text-indigo-600 font-medium">📈 {estimatedImprovementPotential}</p>
        )}
      </div>

      {motivationalFeedback && (
        <div className={`mt-4 p-3 rounded-xl bg-gradient-to-r ${cfg.gradient} text-white text-xs leading-relaxed`}>
          💬 {motivationalFeedback}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, barPercent, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{value}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`} style={{ width: `${barPercent}%` }} />
      </div>
    </div>
  );
}
