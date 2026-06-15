/**
 * InterviewSchedule.jsx — Light theme (matches app palette)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDaysIcon, ClockIcon, CpuChipIcon, SparklesIcon,
  ChevronRightIcon, MicrophoneIcon, AcademicCapIcon, BriefcaseIcon,
  UserGroupIcon, Squares2X2Icon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { interview as interviewApi } from '../services/api';

const INTERVIEW_TYPES = [
  { value: 'technical',  label: 'Technical',  icon: CpuChipIcon,    color: 'blue',   desc: 'DSA, System Design, Core CS' },
  { value: 'behavioral', label: 'Behavioral', icon: UserGroupIcon,  color: 'violet', desc: 'STAR method, situational Qs' },
  { value: 'hr',         label: 'HR',         icon: BriefcaseIcon,  color: 'pink',   desc: 'Culture fit, goals, expectations' },
  { value: 'mixed',      label: 'Mixed',      icon: Squares2X2Icon, color: 'teal',   desc: 'Combination of all types' },
];

const TOPICS = [
  'DSA', 'Java', 'Spring Boot', 'DBMS', 'Operating Systems',
  'Computer Networks', 'System Design', 'OOP', 'SQL', 'AWS', 'Custom Topic',
];

const DIFFICULTIES = [
  { value: 'beginner',     label: 'Beginner',    desc: '0–1 yr exp',  cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 yrs exp', cls: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'advanced',     label: 'Advanced',    desc: '3+ yrs exp',  cls: 'border-rose-300 bg-rose-50 text-rose-700' },
];

const DURATIONS = [
  { value: 15, label: '15 min', desc: 'Quick warmup' },
  { value: 30, label: '30 min', desc: 'Standard' },
  { value: 45, label: '45 min', desc: 'In-depth' },
  { value: 60, label: '60 min', desc: 'Full round' },
];

const typeStyles = {
  blue:   { sel: 'border-blue-400 bg-blue-50',   icon: 'text-blue-600',   text: 'text-blue-800' },
  violet: { sel: 'border-violet-400 bg-violet-50', icon: 'text-violet-600', text: 'text-violet-800' },
  pink:   { sel: 'border-pink-400 bg-pink-50',   icon: 'text-pink-600',   text: 'text-pink-800' },
  teal:   { sel: 'border-teal-400 bg-teal-50',   icon: 'text-teal-600',   text: 'text-teal-800' },
};

export default function InterviewSchedule() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', interviewType: '', topics: [],
    difficulty: '', durationMinutes: 30, scheduledAt: '', candidateNotes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTopic = (t) => setForm(p => ({
    ...p, topics: p.topics.includes(t) ? p.topics.filter(x => x !== t) : [...p.topics, t],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim())       return setError('Please enter an interview title.');
    if (!form.interviewType)      return setError('Please select an interview type.');
    if (!form.topics.length)      return setError('Please select at least one topic.');
    if (!form.difficulty)         return setError('Please select a difficulty level.');
    if (!form.scheduledAt)        return setError('Please choose a date and time.');
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#f0f9ff 0%,#ffffff 50%,#f1f5f9 100%)' }}>
      <div className="max-w-3xl mx-auto py-10 px-4">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 mb-4">
            <MicrophoneIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700 font-medium">AI Interview Practice</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Schedule Your Mock Interview</h1>
          <p className="text-slate-500 text-lg">Practice with an AI voice interviewer that adapts to your level.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Title */}
          <Card title="1. Interview Title" icon={SparklesIcon}>
            <input
              type="text" placeholder="e.g. Software Engineer Technical Round"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              maxLength={120}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-sm"
            />
          </Card>

          {/* Type */}
          <Card title="2. Interview Type" icon={CpuChipIcon}>
            <div className="grid grid-cols-2 gap-3">
              {INTERVIEW_TYPES.map(({ value, label, icon: Icon, color, desc }) => {
                const s = typeStyles[color];
                const sel = form.interviewType === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, interviewType: value }))}
                    className={`relative flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      sel ? `${s.sel} shadow-sm` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${sel ? s.icon : 'text-slate-400'}`} />
                    <div>
                      <p className={`font-semibold text-sm ${sel ? s.text : 'text-slate-700'}`}>{label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    {sel && <CheckCircleIcon className={`absolute top-3 right-3 h-4 w-4 ${s.icon}`} />}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Topics */}
          <Card title="3. Topics to Cover" icon={AcademicCapIcon}>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map(t => {
                const sel = form.topics.includes(t);
                return (
                  <button key={t} type="button" onClick={() => toggleTopic(t)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      sel
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200'
                        : 'border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 bg-white'
                    }`}
                  >
                    {sel && <CheckCircleIcon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                    {t}
                  </button>
                );
              })}
            </div>
            {form.topics.length > 0 && (
              <p className="text-xs text-blue-600 mt-2 font-medium">{form.topics.length} topic{form.topics.length > 1 ? 's' : ''} selected</p>
            )}
          </Card>

          {/* Difficulty */}
          <Card title="4. Difficulty Level" icon={SparklesIcon}>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map(({ value, label, desc, cls }) => {
                const sel = form.difficulty === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, difficulty: value }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      sel ? `${cls} shadow-sm` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <span className={`text-sm font-bold ${sel ? '' : 'text-slate-700'}`}>{label}</span>
                    <span className="text-xs text-slate-400 text-center">{desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Duration */}
          <Card title="5. Duration" icon={ClockIcon}>
            <div className="grid grid-cols-4 gap-3">
              {DURATIONS.map(({ value, label, desc }) => {
                const sel = form.durationMinutes === value;
                return (
                  <button key={value} type="button"
                    onClick={() => setForm(p => ({ ...p, durationMinutes: value }))}
                    className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all ${
                      sel
                        ? 'border-blue-400 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-lg font-bold ${sel ? 'text-blue-700' : 'text-slate-700'}`}>{label}</span>
                    <span className="text-xs text-slate-400">{desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Date & Time */}
          <Card title="6. Preferred Date & Time" icon={CalendarDaysIcon}>
            <input type="datetime-local" value={form.scheduledAt} min={minDateTime}
              onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-sm"
            />
          </Card>

          {/* Notes */}
          <Card title="7. Personal Notes (Optional)" icon={SparklesIcon}>
            <textarea rows={3} placeholder="Any specific areas you want to focus on…"
              value={form.candidateNotes}
              onChange={e => setForm(p => ({ ...p, candidateNotes: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition text-sm resize-none"
            />
          </Card>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-lg py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-200"
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

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-blue-600" />
        <h2 className="text-slate-800 font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}
