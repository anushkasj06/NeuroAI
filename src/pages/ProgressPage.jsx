import { useState, useEffect } from 'react';
import { studyPlanApi } from '../services/studyPlanApi';
import { diagnostic } from '../services/diagnosticApi';
import { Link } from 'react-router-dom';
import { useAdaptiveHistory } from '../hooks/useAdaptiveLearning';
import { adaptive } from '../services/api';

const STATUS_CONFIG = {
  not_started:    { label: 'Not Started', color: 'bg-gray-100 text-gray-500' },
  in_progress:    { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed:      { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700' },
  needs_revision: { label: 'Needs Revision', color: 'bg-amber-100 text-amber-700' },
};

const CASE_CHIP = {
  advance_topic:        { label: '→ Advance',  color: 'bg-emerald-100 text-emerald-700' },
  more_practice:        { label: '✏ Practice', color: 'bg-blue-100 text-blue-700' },
  simpler_explanation:  { label: '↩ Simplify', color: 'bg-amber-100 text-amber-700' },
  change_format:        { label: '⇄ Change format', color: 'bg-violet-100 text-violet-700' },
};

export default function ProgressPage() {
  const [progress, setProgress] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState('all');
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(null);

  // Load adaptive history (all subjects)
  const { data: adaptiveData, refetch: refetchAdaptive } = useAdaptiveHistory(null, 50);
  // Build a lookup: subjectSlug+topic → latest record
  const adaptiveMap = {};
  for (const rec of (adaptiveData?.records ?? [])) {
    const key = `${rec.subjectSlug}::${rec.topic}`;
    if (!adaptiveMap[key]) adaptiveMap[key] = rec;
  }

  useEffect(() => {
    (async () => {
      try {
        const [progRes, diagRes] = await Promise.all([
          studyPlanApi.getTopicProgress(),
          diagnostic.getReport().catch(() => ({ data: { data: { subjects: [] } } })),
        ]);
        setProgress(progRes.data.data.progress || []);
        setSubjects(diagRes.data.data.subjects || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const handleEvaluate = async (p) => {
    setEvaluating(p.topic);
    try {
      await adaptive.evaluate({
        subjectSlug:  p.subjectSlug,
        subject:      p.subject,
        topic:        p.topic,
        subtopic:     p.subtopic || '',
        triggerEvent: 'manual_request',
        quizMarks:    p.lastQuizScore || 0,
        completionRate: p.sessionsCompleted ? Math.min(100, p.sessionsCompleted * 25) : 0,
      });
      await refetchAdaptive();
    } catch {}
    setEvaluating(null);
  };

  const filtered = activeSubject === 'all' ? progress : progress.filter((p) => p.subjectSlug === activeSubject);

  // Group by subject
  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.subjectSlug]) acc[p.subjectSlug] = { name: p.subject, items: [] };
    acc[p.subjectSlug].items.push(p);
    return acc;
  }, {});

  const overallMastery = progress.length
    ? Math.round(progress.reduce((s, p) => s + p.masteryPercent, 0) / progress.length)
    : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📈 Progress Tracker</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track mastery across all topics</p>
          </div>
          <Link to="/learn" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:opacity-90">
            + Study Now
          </Link>
        </div>

        {/* Overall stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Overall Mastery', value: `${overallMastery}%`, color: 'from-indigo-500 to-purple-600' },
            { label: 'Topics Completed', value: progress.filter((p) => p.status === 'completed').length, color: 'from-emerald-500 to-teal-600' },
            { label: 'In Progress', value: progress.filter((p) => p.status === 'in_progress').length, color: 'from-blue-500 to-cyan-600' },
            { label: 'Need Revision', value: progress.filter((p) => p.status === 'needs_revision').length, color: 'from-amber-500 to-orange-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Subject filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setActiveSubject('all')} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSubject === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            All Subjects
          </button>
          {subjects.map((s) => (
            <button key={s.subjectSlug} onClick={() => setActiveSubject(s.subjectSlug)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeSubject === s.subjectSlug ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {s.subjectName}
            </button>
          ))}
        </div>

        {/* Progress list */}
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-md">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-gray-500">No progress tracked yet. Start a learning session!</p>
            <Link to="/learn" className="inline-block mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium">Start Learning</Link>
          </div>
        ) : (
          Object.entries(grouped).map(([slug, group]) => {
            const avgMastery = Math.round(group.items.reduce((s, p) => s + p.masteryPercent, 0) / group.items.length);
            return (
              <div key={slug} className="bg-white rounded-2xl shadow-md border border-gray-50 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{group.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{avgMastery}% avg mastery</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${avgMastery}%` }} />
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {group.items.map((p) => {
                    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.not_started;
                    const adaptiveRec = adaptiveMap[`${p.subjectSlug}::${p.topic}`];
                    const caseChip = adaptiveRec ? CASE_CHIP[adaptiveRec.decisionCase] : null;
                    return (
                      <div key={p._id} className="px-6 py-3 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.topic}</p>
                          {p.subtopic && <p className="text-xs text-gray-400">{p.subtopic}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${p.masteryPercent >= 70 ? 'bg-emerald-500' : p.masteryPercent >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${p.masteryPercent}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-600 w-8 text-right">{p.masteryPercent}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                          {p.bestQuizScore > 0 && <span className="text-xs text-gray-400">Best: {p.bestQuizScore}%</span>}
                          {/* Adaptive chip */}
                          {caseChip ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${caseChip.color}`}>
                              {caseChip.label}
                            </span>
                          ) : (
                            p.status !== 'not_started' && (
                              <button
                                onClick={() => handleEvaluate(p)}
                                disabled={evaluating === p.topic}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 hover:bg-violet-100 disabled:opacity-40"
                              >
                                {evaluating === p.topic ? '…' : '⚡ Evaluate'}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
