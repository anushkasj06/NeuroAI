import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  CpuChipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const pillars = [
  {
    title: 'AI Teacher Sessions',
    text: 'Students learn through guided explanations, examples, checks, feedback, and one-question-at-a-time adaptive quizzes.',
    icon: AcademicCapIcon,
    accent: 'teal',
  },
  {
    title: 'Adaptive Study Plans',
    text: 'Plans respond to weak topics, skipped sessions, quiz accuracy, confidence, and mastery trends instead of staying fixed.',
    icon: SparklesIcon,
    accent: 'amber',
  },
  {
    title: 'Learning Analytics',
    text: 'Dashboards track mastery, focus signals, learning style, progress reports, and revision priorities.',
    icon: ChartBarSquareIcon,
    accent: 'indigo',
  },
];

const accentStyles = {
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

const flow = [
  'Onboarding profile',
  'Diagnostic assessment',
  'Learning style detection',
  'AI teacher lesson',
  'Adaptive quiz',
  'Progress report',
  'Plan update',
];

export default function Home() {
  const { user } = useAuth();
  const primaryTarget = user ? '/ai-teacher' : '/signup';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,116,144,0.16),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(14,165,233,0.14),transparent_32%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
              <CpuChipIcon className="h-4 w-4 text-teal-700" />
              Fully adaptive AI learning platform
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              NeuroLearn AI teaches, tests, adapts, and improves with every session.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              A personalized learning system for students that combines diagnostic assessment, learning-style detection,
              AI teacher sessions, adaptive quizzes, progress reports, and dynamic study-plan updates.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={primaryTarget}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-sky-600 px-5 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5"
              >
                {user ? 'Start AI Teacher' : 'Create learning account'}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                to={user ? '/ai-dashboard' : '/login'}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {user ? 'Open dashboard' : 'Sign in'}
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <Stat value="1:1" label="AI teacher flow" />
              <Stat value="Live" label="adaptive questions" />
              <Stat value="Daily" label="plan updates" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-2xl shadow-slate-900/10">
            <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs text-slate-400">AI Teacher Session</p>
                  <p className="font-semibold">Data Structures: Linked List</p>
                </div>
                <span className="rounded-full bg-teal-400/15 px-3 py-1 text-xs font-medium text-teal-200">Adaptive</span>
              </div>
              <div className="space-y-4 py-5">
                <LessonBubble role="Teacher" text="First, picture a train: each coach stores data and points to the next coach. That pointer is what makes a linked list flexible." />
                <LessonBubble role="Check" text="If inserting in the middle is frequent, why might a linked list beat an array?" />
                <LessonBubble role="Feedback" text="Good start. You noticed shifting cost. Next, let us compare memory locality and traversal tradeoffs." />
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                <MiniMetric label="Mastery" value="76%" />
                <MiniMetric label="Confidence" value="4/5" />
                <MiniMetric label="Next" value="Harder" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-teal-700">What the platform does</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">Built around real teaching, not static notes.</h2>
          <p className="mt-3 text-slate-600">
            The system explains concepts deeply, adapts to visual/audio/reading/interactive learners, checks understanding,
            and modifies the plan when performance drops.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className={`flex h-11 w-11 items-center justify-center rounded-full border ${accentStyles[item.accent]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold text-teal-700">Learning engine</p>
              <h2 className="mt-2 text-3xl font-semibold">From diagnostic to daily adaptation.</h2>
              <p className="mt-3 text-slate-600">
                NeuroLearn turns student signals into a continuous teaching loop, so every lesson creates evidence for the next lesson.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {flow.map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-8 text-white lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-3xl font-semibold">Ready to learn with a system that reacts to you?</h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Start with your diagnostic profile, then let the AI Teacher guide lessons, questions, feedback, revision, and progress.
              </p>
            </div>
            <Link
              to={primaryTarget}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              {user ? 'Continue learning' : 'Get started'}
              <CheckCircleIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>NeuroLearn AI. Adaptive learning, teaching, testing, and progress intelligence.</p>
          <div className="flex gap-4">
            <Link to="/diagnostic" className="hover:text-slate-900">Diagnostic</Link>
            <Link to="/ai-teacher" className="hover:text-slate-900">AI Teacher</Link>
            <Link to="/study-plan" className="hover:text-slate-900">Study Plan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/75 p-4">
      <p className="text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function LessonBubble({ role, text }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <p className="text-xs font-semibold text-teal-200">{role}</p>
      <p className="mt-1 text-sm leading-6 text-slate-100">{text}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
