import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { diagnostic } from '../services/diagnosticApi';
import { aiTeacherApi } from '../services/studyPlanApi';
import { getApiErrorMessage } from '../services/api';
import SubjectTopicSelector from '../components/studyplan/SubjectTopicSelector';

const modeLabels = {
  visual: 'Visual studio',
  audio: 'Audio lesson',
  reading: 'Reading desk',
  interactive: 'Interactive lab',
  mixed: 'Mixed classroom',
};

export default function AITeacherSession() {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [learningStyle, setLearningStyle] = useState('Reading/Writing Learner');
  const [selected, setSelected] = useState({ subjectSlug: '', subjectName: '', topic: '', subtopic: '' });
  const [session, setSession] = useState(null);
  const [openingMessage, setOpeningMessage] = useState('');
  const [question, setQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [confidence, setConfidence] = useState(3);
  const [answerStartedAt, setAnswerStartedAt] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [report, setReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [revisionCenter, setRevisionCenter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const lessonRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [diagRes, analyticsRes, revisionRes] = await Promise.all([
          diagnostic.getReport(),
          aiTeacherApi.getAnalytics().catch(() => null),
          aiTeacherApi.getRevisionCenter().catch(() => null),
        ]);
        const { subjects: subjectList, report: learningReport } = diagRes.data.data;
        setSubjects(subjectList || []);
        setLearningStyle(learningReport?.preferredLearningStyle || 'Reading/Writing Learner');
        setAnalytics(analyticsRes?.data?.data || null);
        setRevisionCenter(revisionRes?.data?.data || null);

        const slug = searchParams.get('subject');
        const topic = searchParams.get('topic');
        const subtopic = searchParams.get('subtopic') || '';
        if (slug && topic) {
          const subject = (subjectList || []).find((item) => item.subjectSlug === slug);
          if (subject) {
            setSelected({ subjectSlug: slug, subjectName: subject.subjectName, topic, subtopic });
          }
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load AI Teacher context'));
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  const answered = !!feedback;
  const canSubmit = question && (selectedOption || answerText.trim()) && confidence;

  const classroomStats = useMemo(() => {
    const events = session?.adaptationEvents || [];
    return [
      { label: 'Mode', value: modeLabels[session?.activeTeachingMode] || modeLabels.mixed },
      { label: 'Difficulty', value: session?.difficultyLevel || 'medium' },
      { label: 'Confidence', value: `${session?.confidenceEnd || 3}/5` },
      { label: 'Adaptations', value: events.length },
    ];
  }, [session]);

  const startSession = async () => {
    if (!selected.subjectSlug || !selected.topic) {
      setError('Select a subject and topic first.');
      return;
    }
    setWorking(true);
    setError('');
    setReport(null);
    setFeedback(null);
    setQuestion(null);
    try {
      const res = await aiTeacherApi.startSession({
        subject: selected.subjectName,
        subjectSlug: selected.subjectSlug,
        topic: selected.topic,
        subtopic: selected.subtopic,
        confidenceStart: confidence,
      });
      setSession(res.data.data.session);
      setOpeningMessage(res.data.data.openingMessage || '');
      setTimeout(() => lessonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to start AI Teacher session'));
    } finally {
      setWorking(false);
    }
  };

  const nextQuestion = async () => {
    if (!session?._id) return;
    setWorking(true);
    setError('');
    setFeedback(null);
    setAnswerText('');
    setSelectedOption('');
    try {
      const res = await aiTeacherApi.generateQuestion(session._id);
      setQuestion(res.data.data.question);
      setAnswerStartedAt(Date.now());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to generate adaptive question'));
    } finally {
      setWorking(false);
    }
  };

  const submitAnswer = async () => {
    if (!canSubmit) return;
    setWorking(true);
    setError('');
    try {
      const elapsed = answerStartedAt ? Math.max(1, Math.round((Date.now() - answerStartedAt) / 1000)) : 0;
      const res = await aiTeacherApi.submitAnswer(question._id, {
        answerText,
        selectedOption,
        confidence,
        responseTimeSeconds: elapsed,
      });
      setFeedback(res.data.data.analysis);
      setSession((prev) => (prev ? { ...prev, ...res.data.data.sessionUpdate } : prev));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to analyze answer'));
    } finally {
      setWorking(false);
    }
  };

  const completeSession = async () => {
    if (!session?._id) return;
    setWorking(true);
    setError('');
    try {
      const res = await aiTeacherApi.completeSession(session._id);
      setSession(res.data.data.session);
      setReport(res.data.data.report);
      const [analyticsRes, revisionRes] = await Promise.all([
        aiTeacherApi.getAnalytics().catch(() => null),
        aiTeacherApi.getRevisionCenter().catch(() => null),
      ]);
      setAnalytics(analyticsRes?.data?.data || analytics);
      setRevisionCenter(revisionRes?.data?.data || revisionCenter);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to complete session'));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 rounded-full border-4 border-cyan-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
            <div>
              <p className="text-sm font-semibold text-cyan-700">Adaptive AI Teacher</p>
              <h1 className="mt-2 text-3xl lg:text-5xl font-bold tracking-normal">Live classroom engine</h1>
              <p className="mt-3 max-w-2xl text-slate-600">
                The lesson teaches, checks understanding, adapts difficulty, and changes the study plan when mastery drops.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Sessions" value={analytics?.summary?.totalSessions || 0} />
              <Metric label="Avg mastery" value={`${analytics?.summary?.averageMastery || 0}%`} />
              <Metric label="Accuracy" value={`${analytics?.summary?.answerAccuracy || 0}%`} />
              <Metric label="Revision queue" value={revisionCenter?.weakProgress?.length || 0} />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid lg:grid-cols-[360px_1fr] gap-6">
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold">Start topic</h2>
                  <p className="text-xs text-slate-500">{learningStyle}</p>
                </div>
                <ConfidencePicker value={confidence} onChange={setConfidence} />
              </div>
              <SubjectTopicSelector subjects={subjects} selected={selected} onSelect={setSelected} />
              <button
                onClick={startSession}
                disabled={working || !selected.subjectSlug || !selected.topic}
                className="mt-4 w-full h-11 rounded-md bg-cyan-700 text-white text-sm font-semibold hover:bg-cyan-800 disabled:opacity-50"
              >
                {working && !session ? 'Preparing classroom...' : 'Start AI Teacher'}
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h2 className="font-semibold">Revision center</h2>
              <div className="mt-3 space-y-2">
                {(revisionCenter?.weakProgress || []).slice(0, 5).map((item) => (
                  <button
                    key={item._id}
                    onClick={() => setSelected({ subjectSlug: item.subjectSlug, subjectName: item.subject, topic: item.topic, subtopic: item.subtopic || '' })}
                    className="w-full text-left rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                  >
                    <span className="font-medium">{item.topic}</span>
                    <span className="block text-xs">{item.masteryPercent}% mastery</span>
                  </button>
                ))}
                {!revisionCenter?.weakProgress?.length && (
                  <p className="text-sm text-slate-500">No urgent revision topics yet.</p>
                )}
              </div>
            </div>
          </aside>

          <section ref={lessonRef} className="space-y-4">
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {!session && (
              <div className="bg-white border border-slate-200 rounded-lg p-8 min-h-[420px] flex items-center">
                <div className="max-w-xl">
                  <p className="text-sm font-semibold text-slate-500">Waiting for a topic</p>
                  <h2 className="mt-2 text-2xl font-bold">Choose a topic and let the AI teach it like a real class.</h2>
                  <p className="mt-3 text-slate-600">
                    The system will generate the lesson flow, then ask adaptive questions one by one based on your answers,
                    confidence, speed, weak concepts, and previous progress.
                  </p>
                </div>
              </div>
            )}

            {session && (
              <>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="border-b border-slate-200 p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <p className="text-sm text-cyan-700 font-semibold">{session.subject}</p>
                        <h2 className="text-2xl font-bold mt-1">{session.topic}</h2>
                        {openingMessage && <p className="text-slate-600 mt-2">{openingMessage}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 min-w-[260px]">
                        {classroomStats.map((item) => <Metric key={item.label} label={item.label} value={item.value} compact />)}
                      </div>
                    </div>
                  </div>
                  <TeachingFlow blocks={session.teachingFlow || []} />
                </div>

                <QuestionPanel
                  question={question}
                  answerText={answerText}
                  selectedOption={selectedOption}
                  confidence={confidence}
                  feedback={feedback}
                  working={working}
                  answered={answered}
                  canSubmit={canSubmit}
                  onNextQuestion={nextQuestion}
                  onAnswerText={setAnswerText}
                  onSelectedOption={setSelectedOption}
                  onConfidence={setConfidence}
                  onSubmit={submitAnswer}
                  onComplete={completeSession}
                  report={report}
                />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`${compact ? 'text-sm' : 'text-xl'} font-bold text-slate-950 mt-1`}>{value}</p>
    </div>
  );
}

function ConfidencePicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" title="Confidence">
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`h-7 w-7 rounded-md border text-xs font-semibold ${value === level ? 'bg-cyan-700 border-cyan-700 text-white' : 'border-slate-200 text-slate-500'}`}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

function TeachingFlow({ blocks }) {
  return (
    <div className="divide-y divide-slate-100">
      {blocks.map((block, index) => (
        <article key={block._id || index} className="p-5 grid lg:grid-cols-[170px_1fr] gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">{block.type?.replaceAll('_', ' ')}</p>
            <h3 className="mt-1 font-semibold text-slate-950">{block.title}</h3>
            <p className="mt-1 text-xs text-slate-500">{block.estimatedMinutes || 5} min</p>
          </div>
          <div>
            <div className="whitespace-pre-wrap leading-7 text-slate-700">{block.content}</div>
            {block.diagramData?.nodes?.length > 0 && <MiniConceptMap data={block.diagramData} />}
            {block.interactionPrompt && (
              <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-950">
                <span className="font-semibold">Try now: </span>{block.interactionPrompt}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function MiniConceptMap({ data }) {
  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const root = nodes.find((node) => node.type === 'main') || nodes[0];
  if (!root) return null;
  const children = edges
    .filter((edge) => edge.from === root.id)
    .map((edge) => nodes.find((node) => node.id === edge.to))
    .filter(Boolean);

  return (
    <div className="mt-4 rounded-lg bg-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{root.label}</span>
        {children.map((child) => (
          <span key={child.id} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            {child.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuestionPanel({
  question,
  answerText,
  selectedOption,
  confidence,
  feedback,
  working,
  answered,
  canSubmit,
  onNextQuestion,
  onAnswerText,
  onSelectedOption,
  onConfidence,
  onSubmit,
  onComplete,
  report,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-700">Live adaptive quiz</p>
          <h2 className="text-xl font-bold">One question at a time</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onNextQuestion}
            disabled={working || (question && !answered)}
            className="h-10 rounded-md border border-cyan-200 px-4 text-sm font-semibold text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
          >
            {question ? 'Generate next' : 'Start quiz'}
          </button>
          <button
            onClick={onComplete}
            disabled={working}
            className="h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Finish report
          </button>
        </div>
      </div>

      {question && (
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Question {question.questionNumber} / {question.difficultyLevel} / {question.type}
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{question.prompt}</p>
              {question.teacherPurpose && <p className="mt-2 text-sm text-slate-500">{question.teacherPurpose}</p>}
            </div>
            <ConfidencePicker value={confidence} onChange={onConfidence} />
          </div>

          {question.options?.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {question.options.map((option) => (
                <button
                  key={option}
                  disabled={answered}
                  onClick={() => onSelectedOption(option)}
                  className={`text-left rounded-md border px-3 py-3 text-sm ${selectedOption === option ? 'border-cyan-600 bg-cyan-50 text-cyan-950' : 'border-slate-200 hover:border-cyan-300'} disabled:opacity-70`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answerText}
              disabled={answered}
              onChange={(event) => onAnswerText(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-md border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500"
              placeholder="Explain your answer..."
            />
          )}

          {question.hint && !answered && (
            <details className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-950">
              <summary className="cursor-pointer font-semibold">Need a hint?</summary>
              <p className="mt-2">{question.hint}</p>
            </details>
          )}

          {!answered && (
            <button
              onClick={onSubmit}
              disabled={working || !canSubmit}
              className="mt-4 h-11 w-full rounded-md bg-cyan-700 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
            >
              {working ? 'Analyzing understanding...' : 'Submit answer'}
            </button>
          )}
        </div>
      )}

      {feedback && (
        <div className={`rounded-lg border p-4 ${feedback.score >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
          <p className="font-semibold">Teacher feedback: {feedback.score}% / {feedback.understandingLevel}</p>
          <p className="mt-2 text-sm">{feedback.feedback}</p>
          {feedback.misconceptionDetected && <p className="mt-2 text-sm">Misconception: {feedback.misconceptionDetected}</p>}
          {feedback.reteachBlock?.content && (
            <div className="mt-3 rounded-md bg-white/70 p-3 text-sm">
              <p className="font-semibold">{feedback.reteachBlock.title}</p>
              <p className="mt-1">{feedback.reteachBlock.content}</p>
            </div>
          )}
        </div>
      )}

      {report && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-950">
          <p className="font-semibold">Progress report</p>
          <p className="mt-2 text-sm">{report.summary}</p>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            <Metric label="Mastery" value={`${report.conceptMastery}%`} compact />
            <Metric label="Quiz accuracy" value={`${report.quizAccuracy}%`} compact />
            <Metric label="Confidence" value={`${report.confidenceLevel}/5`} compact />
          </div>
          {report.recommendedNextSteps?.length > 0 && (
            <ul className="mt-4 list-disc list-inside text-sm space-y-1">
              {report.recommendedNextSteps.map((step, index) => <li key={index}>{step}</li>)}
            </ul>
          )}
          {report.planModification?.required && (
            <p className="mt-3 rounded-md bg-white/70 p-3 text-sm font-medium">
              Study plan adapted: {report.planModification.reason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
