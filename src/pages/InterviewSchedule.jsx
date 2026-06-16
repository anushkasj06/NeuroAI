/**
 * InterviewSchedule.jsx — Light theme, matches app design system
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon, ClockIcon, CpuChipIcon, SparklesIcon,
  ChevronRightIcon, MicrophoneIcon, AcademicCapIcon, BriefcaseIcon,
  UserGroupIcon, Squares2X2Icon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';
import './AIDashboard.css';

const INTERVIEW_TYPES = [
  { value: 'technical',  label: 'Technical',  icon: CpuChipIcon,    color: 'teal',   desc: 'DSA, System Design, Core CS' },
  { value: 'behavioral', label: 'Behavioral', icon: UserGroupIcon,  color: 'indigo', desc: 'STAR method, situational Qs' },
  { value: 'hr',         label: 'HR',         icon: BriefcaseIcon,  color: 'sky',    desc: 'Culture fit, goals, expectations' },
  { value: 'mixed',      label: 'Mixed',      icon: Squares2X2Icon, color: 'violet', desc: 'Combination of all types' },
];

const TOPICS = [
  'DSA', 'Java', 'Spring Boot', 'DBMS', 'Operating Systems',
  'Computer Networks', 'System Design', 'OOP', 'SQL', 'AWS', 'Custom Topic',
];

const DIFFICULTIES = [
  { value: 'beginner',     label: 'Beginner',    desc: '0–1 yr exp' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 yrs exp' },
  { value: 'advanced',     label: 'Advanced',    desc: '3+ yrs exp' },
];

const DURATIONS = [
  { value: 15, label: '15 min', desc: 'Quick warmup' },
  { value: 30, label: '30 min', desc: 'Standard' },
  { value: 45, label: '45 min', desc: 'In-depth' },
  { value: 60, label: '60 min', desc: 'Full round' },
];

const TYPE_COLORS = {
  teal:   'border-teal-300 bg-teal-50 text-teal-700',
  indigo: 'border-indigo-300 bg-indigo-50 text-indigo-700',
  sky:    'border-sky-300 bg-sky-50 text-sky-700',
  violet: 'border-violet-300 bg-violet-50 text-violet-700',
};

export default function InterviewSchedule() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', interviewType: '', topics: [],
    difficulty: '', durationMinutes: 30, scheduledAt: '', candidateNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const toggleTopic = (t) => setForm(p => ({
    ...p, topics: p.topics.includes(t) ? p.topics.filter(x => x !== t) : [...p.topics, t],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim())  return setError('Please enter an interview title.');
    if (!form.interviewType) return setError('Please select an interview type.');
    if (!form.topics.length) return setError('Please select at least one topic.');
    if (!form.difficulty)    return setError('Please select a difficulty level.');
    if (!form.scheduledAt)   return setError('Please choose a date and time.');
    try {
      setLoading(true);
      const res = await interviewApi.schedule({ ...form, scheduledAt: new Date(form.scheduledAt).toISOString() });
      navigate(`/interview/${res.data.data.interview._id}/prepare`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule. Please try again.');
    } finally { setLoading(false); }
  };

  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="ai-dashboard min-h-screen">
      <div className="ai-shell">

        {/* Header */}
        <header className="ai-hero ai-fade-up text-center max-w-2xl mx-auto">
          <div className="ai-chip mx-auto w-fit mb-3">
            <MicrophoneIcon className="h-4 w-4" />
            AI Interview Practice
          </div>
          <h1 className="ai-hero__title text-slate-900 mb-2">Schedule Your Mock Interview</h1>
          <p className="ai-muted text-base">Practice with an AI voice interviewer that adapts to your level.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto ai-fade-up" style={{ animationDelay: '0.05s' }}>

          {/* 1. Title */}
          <FormCard title="1. Interview Title" icon={SparklesIcon}>
            <input type="text" placeholder="e.g. Software Engineer Technical Round"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} maxLength={120}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition text-sm"
            />
          </FormCard>

          {/* 2. Type */}
          <FormCard title="2. Interview Type" icon={CpuChipIcon}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {INTERVIEW_TYPES.map(({ value, label, icon: Icon, color, desc }) => {
                const sel = form.interviewType === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, interviewType: value }))}
                    className={`relative flex min-w-0 items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${sel ? TYPE_COLORS[color] + ' shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${sel ? '' : 'text-slate-400'}`} />
                    <div className="min-w-0 pr-5">
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    {sel && <CheckCircleIcon className="absolute top-3 right-3 h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </FormCard>

          {/* 3. Topics */}
          <FormCard title="3. Topics to Cover" icon={AcademicCapIcon}>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => {
                const sel = form.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTopic(t)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      sel ? 'bg-teal-600 border-teal-600 text-white shadow-sm' : 'border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700 bg-white'
                    }`}
                  >
                    {sel && <CheckCircleIcon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}{t}
                  </button>
                );
              })}
            </div>
            {form.topics.length > 0 && <p className="text-xs text-teal-600 mt-2 font-medium">{form.topics.length} topic{form.topics.length > 1 ? 's' : ''} selected</p>}
          </FormCard>

          {/* 4. Difficulty */}
          <FormCard title="4. Difficulty Level" icon={SparklesIcon}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DIFFICULTIES.map(({ value, label, desc }) => {
                const sel = form.difficulty === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, difficulty: value }))}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all ${sel ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <span className={`text-sm font-bold ${sel ? 'text-teal-700' : 'text-slate-700'}`}>{label}</span>
                    <span className="text-xs text-slate-400">{desc}</span>
                  </button>
                );
              })}
            </div>
          </FormCard>

          {/* 5. Duration */}
          <FormCard title="5. Duration" icon={ClockIcon}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DURATIONS.map(({ value, label, desc }) => {
                const sel = form.durationMinutes === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, durationMinutes: value }))}
                    className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all ${sel ? 'border-teal-400 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <span className={`text-lg font-bold ${sel ? 'text-teal-700' : 'text-slate-700'}`}>{label}</span>
                    <span className="text-xs text-slate-400">{desc}</span>
                  </button>
                );
              })}
            </div>
          </FormCard>

          {/* 6. Date & Time */}
          <FormCard title="6. Date & Time" icon={CalendarDaysIcon}>
            <input type="datetime-local" value={form.scheduledAt} min={minDateTime}
              onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition text-sm"
            />
          </FormCard>

          {/* 7. Notes */}
          <FormCard title="7. Personal Notes (Optional)" icon={SparklesIcon}>
            <textarea rows={3} placeholder="Any specific areas you want to focus on…"
              value={form.candidateNotes}
              onChange={e => setForm(p => ({ ...p, candidateNotes: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition text-sm resize-none"
            />
          </FormCard>

          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>}

          <button type="submit" disabled={loading}
            className="ai-btn ai-btn--primary w-full justify-center py-4 text-base rounded-2xl"
          >
            {loading ? (
              <><span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />Scheduling…</>
            ) : (
              <><MicrophoneIcon className="h-5 w-5" />Schedule Interview<ChevronRightIcon className="h-5 w-5" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormCard({ title, icon: Icon, children }) {
  return (
    <div className="ai-rail">
      <div className="ai-panel__header">
        <span className="ai-panel__title">
          <Icon className="h-4 w-4 text-teal-600" />{title}
        </span>
      </div>
      <div className="ai-panel__body">{children}</div>
    </div>
  );
}
