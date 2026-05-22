import {
  EyeIcon,
  SpeakerWaveIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const STYLE_CONFIG = {
  'Visual Learner':           { icon: EyeIcon,          gradient: 'from-teal-500 to-cyan-500',   chip: 'bg-teal-50 border-teal-100',   accent: 'text-teal-700' },
  'Audio Learner':            { icon: SpeakerWaveIcon,  gradient: 'from-amber-500 to-orange-500',chip: 'bg-amber-50 border-amber-100', accent: 'text-amber-700' },
  'Reading/Writing Learner':  { icon: BookOpenIcon,     gradient: 'from-sky-500 to-blue-600',    chip: 'bg-sky-50 border-sky-100',     accent: 'text-sky-700' },
  'Interactive Learner':      { icon: PuzzlePieceIcon,  gradient: 'from-emerald-500 to-teal-600',chip: 'bg-emerald-50 border-emerald-100', accent: 'text-emerald-700' },
};

const CONFIDENCE_COLOR = { High: 'text-emerald-700', Moderate: 'text-amber-700', Low: 'text-rose-600' };

export default function LearningStyleCard({
  learningStyle, engagementScore, confidenceLevel,
  attentionLevel, recommendedStudyHours,
  motivationalFeedback, estimatedImprovementPotential,
}) {
  const cfg = STYLE_CONFIG[learningStyle] || STYLE_CONFIG['Reading/Writing Learner'];
  const Icon = cfg.icon;

  return (
    <div className="ai-rail">
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-11 w-11 rounded-full border ${cfg.chip} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${cfg.accent}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">AI learning signature</p>
          <p className="font-semibold text-slate-900 text-sm leading-tight">{learningStyle || 'Not detected yet'}</p>
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
          <p className="flex items-center gap-2 text-teal-700 font-medium">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            {estimatedImprovementPotential}
          </p>
        )}
      </div>

      {motivationalFeedback && (
        <div className="mt-4 text-xs text-slate-600 leading-relaxed flex items-start gap-2 border-l-2 border-teal-200 pl-3">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-teal-600 mt-0.5" />
          <span>{motivationalFeedback}</span>
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
