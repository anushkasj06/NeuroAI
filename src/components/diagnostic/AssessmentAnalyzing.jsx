import { useEffect } from 'react';
import { diagnostic } from '../../services/diagnosticApi';
import { getApiErrorMessage } from '../../services/api';

export default function AssessmentAnalyzing({ onComplete, onError }) {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await diagnostic.analyze();
        if (!cancelled) onComplete();
      } catch (err) {
        if (!cancelled) {
          onError(getApiErrorMessage(err, 'AI analysis failed'));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [onComplete, onError]);

  return (
    <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyzing your learning profile</h2>
      <p className="text-gray-600 max-w-md mx-auto">
        Our AI is comparing your text, audio, video, and interactive assessment results, response
        timing, and engagement metrics to build your personalized diagnostic report.
      </p>
      <div className="mt-8 flex justify-center gap-2">
        {['Text', 'Audio', 'Video', 'Interactive', 'AI Report'].map((label, i) => (
          <span
            key={label}
            className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
