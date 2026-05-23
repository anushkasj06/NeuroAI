import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { diagnostic } from '../services/diagnosticApi';
import { aiTeacherApi } from '../services/studyPlanApi';
import { getApiErrorMessage } from '../services/api';
import SubjectTopicSelector from '../components/studyplan/SubjectTopicSelector';
import KnowledgeGraphViewer from '../components/common/KnowledgeGraphViewer';
import ReactMarkdown from 'react-markdown';
import {
  AcademicCapIcon,
  BookOpenIcon,
  LightBulbIcon,
  CubeTransparentIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

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
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {/* ── Pre-session: clean single-column centered layout ──────── */}
        {!session && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Select a topic</h2>
                  <p className="text-xs text-slate-500 mt-1">{learningStyle}</p>
                </div>
                <ConfidencePicker value={confidence} onChange={setConfidence} />
              </div>
              <SubjectTopicSelector subjects={subjects} selected={selected} onSelect={setSelected} />
              <button
                onClick={startSession}
                disabled={working || !selected.subjectSlug || !selected.topic}
                className="mt-5 w-full h-12 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                {working && !session ? 'Preparing session...' : 'Start learning session'}
              </button>
            </div>

            {/* Revision queue */}
            {(revisionCenter?.weakProgress?.length > 0) && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Topics needing revision</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {revisionCenter.weakProgress.slice(0, 6).map((item) => (
                    <button
                      key={item._id}
                      onClick={() => setSelected({ subjectSlug: item.subjectSlug, subjectName: item.subject, topic: item.topic, subtopic: item.subtopic || '' })}
                      className="text-left rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors"
                    >
                      <span className="font-semibold text-slate-900">{item.topic}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{item.masteryPercent}% mastery</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Active session: full width ────────────────────────────── */}
        {session && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="border-b border-slate-200 p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSession(null)} className="text-sm font-semibold text-cyan-700 hover:underline">&larr; Change topic</button>
                      <p className="text-sm text-slate-500 font-semibold">&bull; {session.subject}</p>
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{session.topic}</h2>
                    {openingMessage && <p className="text-slate-600 mt-2 md-content"><ReactMarkdown>{openingMessage}</ReactMarkdown></p>}
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
          </div>
        )}
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

const BLOCK_META = {
  introduction:     { Icon: AcademicCapIcon,              color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', label: 'Introduction' },
  concept:          { Icon: BookOpenIcon,                  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Core Concept' },
  example:          { Icon: LightBulbIcon,                 color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Worked Example' },
  visual:           { Icon: CubeTransparentIcon,           color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Visual Model' },
  interactive_check:{ Icon: ChatBubbleLeftRightIcon,        color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Comprehension Check' },
  revision:         { Icon: ArrowPathIcon,                 color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', label: 'Key Revision' },
  summary:          { Icon: ClipboardDocumentCheckIcon,     color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', label: 'Summary' },
  teacher_note:     { Icon: SparklesIcon,                  color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', label: 'Instructor Insight' },
};

function TeachingFlow({ blocks }) {
  return (
    <div className="tf-container">
      {blocks.map((block, index) => {
        const meta = BLOCK_META[block.type] || BLOCK_META.concept;
        const { Icon, color, bg, border, label } = meta;
        const isLast = index === blocks.length - 1;

        return (
          <div key={block._id || index} className="tf-block" style={{ '--accent': color, '--accent-bg': bg, '--accent-border': border }}>
            {/* Timeline connector */}
            <div className="tf-timeline">
              <div className="tf-dot" style={{ background: color, boxShadow: `0 0 0 4px ${bg}` }}>
                <Icon style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              {!isLast && <div className="tf-line" style={{ background: `linear-gradient(to bottom, ${color}33, transparent)` }} />}
            </div>

            {/* Content card */}
            <div className="tf-card" style={{ borderColor: border, background: bg }}>
              {/* Card header */}
              <div className="tf-card-header">
                <div>
                  <span className="tf-label" style={{ color }}>{label}</span>
                  <h3 className="tf-title">{block.title}</h3>
                </div>
                <div className="tf-meta">
                  <span className="tf-step" style={{ color, borderColor: border }}>{index + 1}/{blocks.length}</span>
                  <span className="tf-time">{block.estimatedMinutes || 5} min</span>
                </div>
              </div>

              {/* Markdown content */}
              <div className="md-content">
                <ReactMarkdown>{block.content || ''}</ReactMarkdown>
              </div>

              {/* Knowledge graph */}
              {block.diagramData?.nodes?.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <KnowledgeGraphViewer
                    nodes={block.diagramData.nodes}
                    edges={block.diagramData.edges || []}
                    className="rounded-xl shadow-lg overflow-hidden"
                  />
                </div>
              )}

              {/* Interaction prompt */}
              {block.interactionPrompt && (
                <div className="tf-prompt">
                  <ChatBubbleLeftRightIcon style={{ width: 20, height: 20, color: '#0891b2', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <p className="tf-prompt-label">Reflection Prompt</p>
                    <p className="tf-prompt-text">{block.interactionPrompt}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
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
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const difficultyColors = { easy: '#059669', medium: '#d97706', hard: '#dc2626' };
  const diffColor = difficultyColors[question?.difficultyLevel] || '#64748b';

  return (
    <div className="quiz-panel">
      {/* Header */}
      <div className="quiz-header">
        <div>
          <p className="quiz-header-label">Adaptive Assessment</p>
          <h2 className="quiz-header-title">
            {question ? `Question ${question.questionNumber}` : 'Ready to assess'}
          </h2>
        </div>
        <div className="quiz-header-actions">
          <button
            onClick={onNextQuestion}
            disabled={working || (question && !answered)}
            className="quiz-btn-outline"
          >
            {question ? 'Next question' : 'Begin quiz'}
          </button>
          <button onClick={onComplete} disabled={working} className="quiz-btn-solid">
            Finish & report
          </button>
        </div>
      </div>

      {/* Question card */}
      {question && (
        <div className="quiz-question-card">
          {/* Question meta bar */}
          <div className="quiz-meta-bar">
            <span className="quiz-meta-badge" style={{ color: diffColor, borderColor: `${diffColor}33`, background: `${diffColor}0a` }}>
              {question.difficultyLevel}
            </span>
            <span className="quiz-meta-badge" style={{ color: '#475569', borderColor: '#e2e8f0' }}>
              {question.type?.replace('_', ' ')}
            </span>
            <div style={{ flex: 1 }} />
            <ConfidencePicker value={confidence} onChange={onConfidence} />
          </div>

          {/* Prompt */}
          <p className="quiz-prompt">{question.prompt}</p>
          {question.teacherPurpose && (
            <p className="quiz-purpose">{question.teacherPurpose}</p>
          )}

          {/* Options or textarea */}
          {question.options?.length > 0 ? (
            <div className="quiz-options">
              {question.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const letter = optionLetters[idx] || String(idx + 1);
                return (
                  <button
                    key={option}
                    disabled={answered}
                    onClick={() => onSelectedOption(option)}
                    className={`quiz-option ${isSelected ? 'quiz-option-selected' : ''} ${answered ? 'quiz-option-locked' : ''}`}
                  >
                    <span className={`quiz-option-letter ${isSelected ? 'quiz-option-letter-active' : ''}`}>
                      {letter}
                    </span>
                    <span className="quiz-option-text">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              value={answerText}
              disabled={answered}
              onChange={(e) => onAnswerText(e.target.value)}
              rows={5}
              className="quiz-textarea"
              placeholder="Write your answer here..."
            />
          )}

          {/* Hint */}
          {question.hint && !answered && (
            <details className="quiz-hint">
              <summary>Show hint</summary>
              <p>{question.hint}</p>
            </details>
          )}

          {/* Submit */}
          {!answered && (
            <button
              onClick={onSubmit}
              disabled={working || !canSubmit}
              className="quiz-submit"
            >
              {working ? 'Evaluating...' : 'Submit answer'}
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`quiz-feedback ${feedback.score >= 70 ? 'quiz-feedback-pass' : 'quiz-feedback-review'}`}>
          <div className="quiz-feedback-header">
            <div className="quiz-feedback-score-ring" style={{
              background: `conic-gradient(${feedback.score >= 70 ? '#059669' : '#d97706'} ${feedback.score * 3.6}deg, #e2e8f0 0deg)`,
            }}>
              <span className="quiz-feedback-score-inner">{feedback.score}%</span>
            </div>
            <div>
              <p className="quiz-feedback-level">{feedback.understandingLevel}</p>
              <p className="quiz-feedback-text">{feedback.feedback}</p>
            </div>
          </div>
          {feedback.misconceptionDetected && (
            <div className="quiz-misconception">
              <p className="quiz-misconception-label">Misconception identified</p>
              <p>{feedback.misconceptionDetected}</p>
            </div>
          )}
          {feedback.reteachBlock?.content && (
            <div className="quiz-reteach">
              <p className="quiz-reteach-title">{feedback.reteachBlock.title}</p>
              <div className="md-content"><ReactMarkdown>{feedback.reteachBlock.content}</ReactMarkdown></div>
            </div>
          )}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="quiz-report">
          <h3 className="quiz-report-title">Session Report</h3>
          <p className="quiz-report-summary">{report.summary}</p>
          <div className="quiz-report-metrics">
            <Metric label="Mastery" value={`${report.conceptMastery}%`} compact />
            <Metric label="Quiz accuracy" value={`${report.quizAccuracy}%`} compact />
            <Metric label="Confidence" value={`${report.confidenceLevel}/5`} compact />
          </div>
          {report.recommendedNextSteps?.length > 0 && (
            <div className="quiz-report-steps">
              <p className="quiz-report-steps-label">Recommended next steps</p>
              <ul>
                {report.recommendedNextSteps.map((step, idx) => <li key={idx}>{step}</li>)}
              </ul>
            </div>
          )}
          {report.planModification?.required && (
            <div className="quiz-plan-note">
              Study plan adapted: {report.planModification.reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

