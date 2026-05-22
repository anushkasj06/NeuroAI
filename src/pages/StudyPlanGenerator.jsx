import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { diagnostic } from '../services/diagnosticApi';
import { studyPlanApi } from '../services/studyPlanApi';
import { getApiErrorMessage } from '../services/api';
import { getTopicsForSubject } from '../constants/topicCurriculum';

const STEPS = ['Subjects', 'Topics', 'Schedule', 'Generate'];

export default function StudyPlanGenerator() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');

  // Data from diagnostic
  const [profile, setProfile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [learningStyle, setLearningStyle] = useState('');

  // Form state
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [topicSelections, setTopicSelections] = useState({});
  const [examName, setExamName] = useState('');
  const [examDeadline, setExamDeadline] = useState('');
  const [availableHours, setAvailableHours] = useState('');
  const [targetScores, setTargetScores] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await diagnostic.getReport();
        const { profile: p, subjects: s, report } = res.data.data;
        setProfile(p);
        setSubjects(s || []);
        setLearningStyle(report?.preferredLearningStyle || '');
        setAvailableHours(String(p.studyHoursPerDay || 2));
        const deadline = p.examDeadline ? new Date(p.examDeadline).toISOString().split('T')[0] : '';
        setExamDeadline(deadline);
        const scores = {};
        s.forEach((sub) => { scores[sub.subjectSlug] = Math.min(100, sub.currentMarks + 15); });
        setTargetScores(scores);
      } catch {
        setError('Complete the diagnostic assessment first to generate a study plan.');
      } finally {
        setInitLoading(false);
      }
    })();
  }, []);

  const toggleSubject = (sub) => {
    setSelectedSubjects((prev) =>
      prev.find((s) => s.subjectSlug === sub.subjectSlug)
        ? prev.filter((s) => s.subjectSlug !== sub.subjectSlug)
        : [...prev, sub]
    );
  };

  const toggleTopic = (subjectSlug, topicName) => {
    setTopicSelections((prev) => {
      const current = prev[subjectSlug] || [];
      return {
        ...prev,
        [subjectSlug]: current.includes(topicName)
          ? current.filter((t) => t !== topicName)
          : [...current, topicName],
      };
    });
  };

  const handleGenerate = async () => {
    if (!examDeadline) { setError('Please set an exam deadline.'); return; }
    if (!availableHours || Number(availableHours) < 0.5) { setError('Set available study hours.'); return; }

    setLoading(true);
    setError('');
    try {
      const payload = {
        selectedSubjects: selectedSubjects.map((s) => ({
          subjectSlug: s.subjectSlug,
          subjectName: s.subjectName,
          currentMarks: s.currentMarks,
          targetMarks: targetScores[s.subjectSlug] || Math.min(100, s.currentMarks + 15),
          selectedTopics: topicSelections[s.subjectSlug] || getTopicsForSubject(s.subjectSlug).slice(0, 3).map((t) => t.name),
        })),
        examName: examName || 'Exam',
        examDeadline,
        availableHoursPerDay: Number(availableHours),
      };
      await studyPlanApi.generatePlan(payload);
      navigate('/study-plan');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate plan'));
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ✨ AI Study Plan Generator
          </h1>
          {learningStyle && (
            <p className="text-gray-500 mt-1">Optimized for your style: <strong className="text-indigo-600">{learningStyle}</strong></p>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i === step ? 'bg-indigo-600 text-white shadow-lg scale-110' : i < step ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-indigo-600' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          {/* Step 0 — Subject selection */}
          {step === 0 && (
            <SubjectStep subjects={subjects} selected={selectedSubjects} onToggle={toggleSubject} targetScores={targetScores} onTargetChange={(slug, val) => setTargetScores((p) => ({ ...p, [slug]: val }))} />
          )}

          {/* Step 1 — Topic selection */}
          {step === 1 && (
            <TopicStep selectedSubjects={selectedSubjects} topicSelections={topicSelections} onToggle={toggleTopic} />
          )}

          {/* Step 2 — Schedule */}
          {step === 2 && (
            <ScheduleStep examName={examName} setExamName={setExamName} examDeadline={examDeadline} setExamDeadline={setExamDeadline} availableHours={availableHours} setAvailableHours={setAvailableHours} profile={profile} />
          )}

          {/* Step 3 — Review & Generate */}
          {step === 3 && (
            <ReviewStep selectedSubjects={selectedSubjects} topicSelections={topicSelections} examName={examName} examDeadline={examDeadline} availableHours={availableHours} learningStyle={learningStyle} />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50">
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={step === 0 && selectedSubjects.length === 0}
                onClick={() => { setError(''); setStep((s) => s + 1); }}
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium disabled:opacity-40 hover:opacity-90"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerate}
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium disabled:opacity-60 hover:opacity-90"
              >
                {loading ? '✨ Generating…' : '✨ Generate My Plan'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectStep({ subjects, selected, onToggle, targetScores, onTargetChange }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Select Subjects</h2>
      <p className="text-sm text-gray-500 mb-5">Choose subjects to include in your study plan.</p>
      <div className="space-y-3">
        {subjects.map((s) => {
          const isSelected = selected.find((x) => x.subjectSlug === s.subjectSlug);
          return (
            <div key={s.subjectSlug} className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`} onClick={() => onToggle(s)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                    {isSelected && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{s.subjectName}</p>
                    <p className="text-xs text-gray-500">Current: {s.currentMarks}%</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <label className="text-xs text-gray-500">Target:</label>
                    <input type="number" min={s.currentMarks} max={100} value={targetScores[s.subjectSlug] || ''} onChange={(e) => onTargetChange(s.subjectSlug, Number(e.target.value))} className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-400" />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selected.length > 0 && <p className="mt-3 text-sm text-indigo-600 font-medium">{selected.length} subject{selected.length !== 1 ? 's' : ''} selected</p>}
    </div>
  );
}

function TopicStep({ selectedSubjects, topicSelections, onToggle }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Select Topics</h2>
      <p className="text-sm text-gray-500 mb-5">Pick topics to focus on. Leave all unchecked to auto-select.</p>
      <div className="space-y-6">
        {selectedSubjects.map((sub) => {
          const topics = getTopicsForSubject(sub.subjectSlug);
          const selected = topicSelections[sub.subjectSlug] || [];
          return (
            <div key={sub.subjectSlug}>
              <h3 className="font-semibold text-gray-800 mb-2">{sub.subjectName}</h3>
              {topics.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Topics will be auto-generated by AI.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => {
                    const isOn = selected.includes(t.name);
                    return (
                      <button key={t.name} type="button" onClick={() => onToggle(sub.subjectSlug, t.name)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isOn ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleStep({ examName, setExamName, examDeadline, setExamDeadline, availableHours, setAvailableHours, profile }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Study Schedule</h2>
      <p className="text-sm text-gray-500 mb-5">Set your exam details and available time.</p>
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam / Goal Name</label>
          <input type="text" value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="e.g. Semester Exam, GATE 2025" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exam Deadline</label>
          <input type="date" value={examDeadline} onChange={(e) => setExamDeadline(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Available Study Hours / Day</label>
          <input type="number" min={0.5} max={12} step={0.5} value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500" />
          {profile && <p className="text-xs text-gray-400 mt-1">From onboarding: {profile.studyHoursPerDay}h/day</p>}
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ selectedSubjects, topicSelections, examName, examDeadline, availableHours, learningStyle }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Review & Generate</h2>
      <p className="text-sm text-gray-500 mb-5">AI will create your personalized plan using all your data.</p>
      <div className="space-y-4">
        <InfoRow label="Learning Style" value={learningStyle || 'Auto-detected'} />
        <InfoRow label="Exam" value={examName || 'General Exam'} />
        <InfoRow label="Deadline" value={examDeadline || 'Not set'} />
        <InfoRow label="Study Hours/Day" value={`${availableHours}h`} />
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Subjects & Topics:</p>
          {selectedSubjects.map((s) => (
            <div key={s.subjectSlug} className="mb-2 p-3 bg-indigo-50 rounded-xl">
              <p className="text-sm font-semibold text-indigo-800">{s.subjectName} ({s.currentMarks}%)</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                {(topicSelections[s.subjectSlug] || []).length > 0
                  ? (topicSelections[s.subjectSlug] || []).join(', ')
                  : 'AI will auto-select topics'}
              </p>
            </div>
          ))}
        </div>
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-700">🤖 Grok AI will generate a complete daily, weekly, and monthly plan tailored to your learning style and performance data.</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}
