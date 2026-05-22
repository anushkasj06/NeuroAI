import { DIAGNOSTIC_STEPS } from '../../constants/diagnostic';

const stepIndex = (id) => DIAGNOSTIC_STEPS.findIndex((s) => s.id === id);

export default function ProgressStepper({ currentStep }) {
  const currentIdx = stepIndex(currentStep);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {DIAGNOSTIC_STEPS.map((step, idx) => {
          const isActive = idx === currentIdx;
          const isComplete = idx < currentIdx;
          return (
            <div key={step.id} className="flex flex-col items-center min-w-[72px] flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                  isComplete
                    ? 'bg-emerald-500 text-white shadow-md'
                    : isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : step.icon}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center ${
                  isActive ? 'text-indigo-600' : isComplete ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
          style={{
            width: `${((currentIdx + 1) / DIAGNOSTIC_STEPS.length) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
