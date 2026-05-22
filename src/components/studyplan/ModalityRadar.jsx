import {
  BookOpenIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  PuzzlePieceIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';

const MODES = [
  { key: 'text',        label: 'Text',        icon: BookOpenIcon,     color: 'from-sky-500 to-blue-500' },
  { key: 'audio',       label: 'Audio',       icon: SpeakerWaveIcon,  color: 'from-amber-500 to-orange-500' },
  { key: 'video',       label: 'Video',       icon: VideoCameraIcon,  color: 'from-indigo-500 to-slate-600' },
  { key: 'interactive', label: 'Interactive', icon: PuzzlePieceIcon,  color: 'from-emerald-500 to-teal-500' },
];

export default function ModalityRadar({ scores }) {
  if (!scores) return null;
  return (
    <div className="ai-rail">
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <PresentationChartLineIcon className="h-5 w-5 text-teal-600" />
          Learning mix
        </div>
      </div>
      <div className="ai-panel__body space-y-3">
        {MODES.map((m) => {
          const val = scores[m.key] ?? 0;
          const Icon = m.icon;
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <Icon className="h-4 w-4 text-slate-500" />
                  {m.label}
                </span>
                <span className="font-semibold text-slate-700">{val}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all duration-700`}
                  style={{ width: `${val}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
