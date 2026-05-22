import { Link } from 'react-router-dom';
import { LEARNING_STYLE_COLORS } from '../../constants/diagnostic';

export default function DiagnosticReportView({ data }) {
  const { report, profile, subjects, assessment } = data;
  const styleGradient =
    LEARNING_STYLE_COLORS[report.preferredLearningStyle] || 'from-indigo-500 to-purple-600';

  const modeLabels = {
    text: 'Text',
    audio: 'Audio',
    video: 'Video',
    interactive: 'Interactive',
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl p-8 text-white bg-gradient-to-br ${styleGradient} shadow-xl`}>
        <p className="text-white/80 text-sm font-medium uppercase tracking-wide">Your learning style</p>
        <h1 className="text-3xl sm:text-4xl font-bold mt-2">{report.preferredLearningStyle}</h1>
        <p className="mt-4 text-white/90 text-lg">{report.aiGeneratedSummary}</p>
        <p className="mt-6 text-white/95 italic">&ldquo;{report.motivationalFeedback}&rdquo;</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Engagement', value: `${report.engagementScore}%` },
          { label: 'Confidence', value: report.confidenceLevel },
          { label: 'Attention', value: report.attentionLevel },
          { label: 'Study hours/day', value: `${report.recommendedStudyHours}h` },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-2xl p-5 shadow-md border border-gray-50">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Learning modes</h3>
          <div className="space-y-3">
            {['text', 'audio', 'video', 'interactive'].map((mode) => (
              <div key={mode}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{modeLabels[mode]}</span>
                  <span>{report.modalityScores?.[mode] ?? 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    style={{ width: `${report.modalityScores?.[mode] ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            <strong>Strongest:</strong> {modeLabels[report.strongestLearningMode]} ·{' '}
            <strong>Weakest:</strong> {modeLabels[report.weakestLearningMode]}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Teaching recommendations</h3>
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">Approach:</span> {report.recommendedTeachingApproach}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">Format:</span> {report.recommendedTeachingFormat}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Consistency:</span> {report.studyConsistencyAnalysis}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-emerald-700 mb-3">Subject strengths</h3>
          <ul className="space-y-2">
            {report.subjectStrengths?.map((s) => (
              <li key={s.subject} className="text-sm text-gray-700">
                <span className="font-medium">{s.subject}</span> — {s.strength}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-amber-700 mb-3">Areas to improve</h3>
          <ul className="space-y-2">
            {report.subjectWeaknesses?.map((s) => (
              <li key={s.subject} className="text-sm text-gray-700">
                <span className="font-medium">{s.subject}</span> — {s.weakness}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Personalized insights</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-700">
          {report.personalizedInsights?.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-indigo-700 font-medium">
          Improvement potential: {report.estimatedImprovementPotential}
        </p>
      </div>

      {assessment && (
        <div className="bg-slate-50 rounded-2xl p-6 text-sm text-gray-600">
          <h3 className="font-bold text-gray-800 mb-2">Assessment analytics</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              Text: {assessment.textMode?.accuracyPercent}% accuracy,{' '}
              {assessment.textMode?.readingOrWatchTimeSeconds}s reading
            </div>
            <div>
              Audio: {assessment.audioMode?.accuracyPercent}% accuracy, {assessment.audioMode?.replayCount}{' '}
              replays
            </div>
            <div>
              Video: {assessment.videoMode?.accuracyPercent}% accuracy, {assessment.videoMode?.pauseCount}{' '}
              pauses
            </div>
            <div>
              Interactive: {assessment.interactiveMode?.accuracyPercent}% accuracy,{' '}
              {assessment.interactiveMode?.interactionCount || 0} interactions
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-center pt-4">
        <Link
          to="/dashboard"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium"
        >
          Go to Dashboard
        </Link>
        {/* AI Study Plan removed */}
      </div>
    </div>
  );
}

