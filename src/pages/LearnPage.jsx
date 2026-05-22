import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { learningMaterialApi } from '../services/studyPlanApi';
import { studyPlanApi } from '../services/studyPlanApi';
import { diagnostic } from '../services/diagnosticApi';
import { getApiErrorMessage } from '../services/api';
import { getTopicsForSubject } from '../constants/topicCurriculum';
import MaterialViewer from '../components/studyplan/MaterialViewer';
import SubjectTopicSelector from '../components/studyplan/SubjectTopicSelector';

export default function LearnPage() {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [learningStyle, setLearningStyle] = useState('Reading/Writing Learner');
  const [selected, setSelected] = useState({ subjectSlug: '', subjectName: '', topic: '', subtopic: '' });
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await diagnostic.getReport();
        const { subjects: s, report } = res.data.data;
        setSubjects(s || []);
        setLearningStyle(report?.preferredLearningStyle || 'Reading/Writing Learner');
        // Pre-fill from query params
        const slug = searchParams.get('subject');
        const topic = searchParams.get('topic');
        const subtopic = searchParams.get('subtopic') || '';
        if (slug && topic) {
          const sub = s.find((x) => x.subjectSlug === slug);
          if (sub) {
            setSelected({ subjectSlug: slug, subjectName: sub.subjectName, topic, subtopic });
          }
        }
      } catch {}
      setInitLoading(false);
    })();
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!selected.subjectSlug || !selected.topic) { setError('Select a subject and topic.'); return; }
    setLoading(true); setError(''); setMaterial(null); setQuizMode(false); setQuizAnswers({}); setQuizSubmitted(false);
    try {
      const res = await learningMaterialApi.generateMaterial({
        subject: selected.subjectName,
        subjectSlug: selected.subjectSlug,
        topic: selected.topic,
        subtopic: selected.subtopic,
      });
      setMaterial(res.data.data.material);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate material'));
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate material when arriving from a study-plan link with subject+topic in query
  useEffect(() => {
    if (!initLoading && selected.subjectSlug && selected.topic && !material && !loading) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initLoading, selected.subjectSlug, selected.topic]);

  const handleQuizSubmit = async () => {
    setQuizSubmitted(true);
    if (!material?.quizQuestions?.length) return;
    const correct = material.quizQuestions.filter((q, i) => quizAnswers[i] === q.correctAnswer).length;
    const score = Math.round((correct / material.quizQuestions.length) * 100);
    try {
      await studyPlanApi.updateTopicProgress({
        subjectSlug: selected.subjectSlug,
        topic: selected.topic,
        masteryPercent: score,
        status: score >= 70 ? 'completed' : 'in_progress',
        quizScore: score,
      });
    } catch {}
  };

  if (initLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            📚 AI Learning Session
          </h1>
          <p className="text-gray-500 mt-1">
            Content adapted for: <strong className="text-indigo-600">{learningStyle}</strong>
          </p>
        </div>

        {/* Selector */}
        <SubjectTopicSelector subjects={subjects} selected={selected} onSelect={setSelected} />

        {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm">{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={loading || !selected.subjectSlug || !selected.topic}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {loading ? '🤖 Generating content…' : '✨ Generate Learning Material'}
        </button>

        {/* Material viewer */}
        {material && !quizMode && (
          <MaterialViewer
            material={material}
            learningStyle={learningStyle}
            onStartQuiz={() => setQuizMode(true)}
          />
        )}

        {/* Quiz mode */}
        {material && quizMode && (
          <QuizSection
            questions={material.quizQuestions || []}
            answers={quizAnswers}
            submitted={quizSubmitted}
            onAnswer={(i, val) => setQuizAnswers((p) => ({ ...p, [i]: val }))}
            onSubmit={handleQuizSubmit}
            onBack={() => { setQuizMode(false); setQuizSubmitted(false); setQuizAnswers({}); }}
          />
        )}
      </div>
    </div>
  );
}

function QuizSection({ questions, answers, submitted, onAnswer, onSubmit, onBack }) {
  if (!questions.length) return <div className="bg-white rounded-2xl p-6 text-center text-gray-400">No quiz questions available.</div>;

  const correct = submitted ? questions.filter((q, i) => answers[i] === q.correctAnswer).length : 0;
  const score = submitted ? Math.round((correct / questions.length) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">🧪 Knowledge Check</h2>
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← Back to material</button>
      </div>

      {submitted && (
        <div className={`p-4 rounded-xl text-center ${score >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <p className="text-2xl font-bold">{score}%</p>
          <p className="text-sm">{correct}/{questions.length} correct · {score >= 70 ? '✅ Great job!' : '📖 Review the material and try again'}</p>
        </div>
      )}

      {questions.map((q, i) => (
        <div key={i} className="border border-gray-100 rounded-xl p-4">
          <p className="font-medium text-gray-800 mb-3">{i + 1}. {q.question}</p>
          {q.type === 'mcq' || q.type === 'true_false' ? (
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = answers[i] === opt;
                const isCorrect = submitted && opt === q.correctAnswer;
                const isWrong = submitted && isSelected && opt !== q.correctAnswer;
                return (
                  <button key={opt} disabled={submitted} onClick={() => onAnswer(i, opt)}
                    className={`w-full text-left p-3 rounded-xl border-2 text-sm transition-all ${isCorrect ? 'border-emerald-400 bg-emerald-50' : isWrong ? 'border-red-400 bg-red-50' : isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}>
                    {opt}
                    {isCorrect && ' ✓'}
                    {isWrong && ' ✗'}
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea rows={3} disabled={submitted} value={answers[i] || ''} onChange={(e) => onAnswer(i, e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-400" placeholder="Type your answer…" />
          )}
          {submitted && q.explanation && (
            <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">💡 {q.explanation}</p>
          )}
        </div>
      ))}

      {!submitted && (
        <button onClick={onSubmit} disabled={Object.keys(answers).length < questions.filter((q) => q.type !== 'short').length}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium disabled:opacity-50 hover:opacity-90">
          Submit Quiz
        </button>
      )}
    </div>
  );
}
