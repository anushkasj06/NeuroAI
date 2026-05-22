import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AcademicCapIcon, ArrowRightIcon, LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();
    setLoading(true);
    try {
      const data = await login(formData);
      const role = data?.data?.user?.role || 'student';
      navigate(role === 'teacher' ? '/teacher' : '/dashboard');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your AI learning studio"
      subtitle="Continue lessons, adaptive quizzes, progress reports, and dynamic study-plan updates."
      footer={(
        <p className="text-sm text-slate-500">
          New to NeuroLearn?{' '}
          <Link to="/signup" className="font-semibold text-teal-700 hover:text-teal-900">Create an account</Link>
        </p>
      )}
    >
      {authError && <Alert message={authError} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Email address"
          name="email"
          type="email"
          value={formData.email}
          onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
          icon={UserCircleIcon}
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
          icon={LockClosedIcon}
          placeholder="Enter your password"
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
            Remember me
          </label>
          <span className="text-slate-400">Secure access</span>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-sky-600 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ eyebrow, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_460px] lg:px-8">
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm">
            <AcademicCapIcon className="h-4 w-4 text-teal-700" />
            NeuroLearn AI
          </div>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-normal">
            Personalized teaching that adapts after every answer.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
            AI teacher sessions combine deep explanations, live checks, confidence tracking, mastery analytics,
            and automatic plan changes.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
            {['Learning style aware', 'One-question quizzes', 'Progress reports', 'Dynamic study plan'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/8 sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold text-teal-700">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
          </div>
          {children}
          <div className="mt-6 border-t border-slate-200 pt-5">{footer}</div>
        </section>
      </div>
    </div>
  );
}

export function Alert({ message }) {
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

export function Field({ label, icon: Icon, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-teal-500 focus-within:bg-white">
        {Icon && <Icon className="mr-2 h-5 w-5 shrink-0 text-slate-400" />}
        <input
          {...props}
          required={props.required ?? true}
          className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
        />
      </span>
    </label>
  );
}
