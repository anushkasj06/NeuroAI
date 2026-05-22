import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, EnvelopeIcon, LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { Alert, AuthShell, Field } from './Login';

export default function Signup() {
  const navigate = useNavigate();
  const { signup, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    classCode: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    clearError();
    setLocalError('');
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const data = await signup({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        classCode: formData.role === 'student' ? formData.classCode : undefined,
        password: formData.password,
      });
      const role = data?.data?.user?.role || 'student';
      navigate(role === 'teacher' ? '/teacher' : '/diagnostic');
    } catch (err) {
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Join NeuroLearn"
      title="Create your adaptive learning account"
      subtitle="Start with diagnostics, then unlock AI teacher sessions, progress reports, and personalized plans."
      footer={(
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-900">Sign in</Link>
        </p>
      )}
    >
      {(authError || localError) && <Alert message={authError || localError} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" name="name" value={formData.name} onChange={(event) => update('name', event.target.value)} icon={UserCircleIcon} placeholder="Your name" />
        <Field label="Email address" name="email" type="email" value={formData.email} onChange={(event) => update('email', event.target.value)} icon={EnvelopeIcon} placeholder="you@example.com" />

        <div>
          <p className="text-sm font-medium text-slate-700">Account type</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {['student', 'teacher'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => update('role', role)}
                className={`h-11 rounded-xl border text-sm font-semibold capitalize transition ${
                  formData.role === role
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {formData.role === 'student' && (
          <Field
            label="Teacher class code"
            name="classCode"
            value={formData.classCode}
            onChange={(event) => update('classCode', event.target.value)}
            required={false}
            placeholder="Optional"
          />
        )}

        <Field label="Password" name="password" type="password" value={formData.password} onChange={(event) => update('password', event.target.value)} icon={LockClosedIcon} placeholder="Create password" />
        <Field label="Confirm password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} icon={LockClosedIcon} placeholder="Confirm password" />

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" />
          I agree to use NeuroLearn AI responsibly for learning, diagnostics, and progress tracking.
        </label>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-sky-600 text-sm font-semibold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create account'}
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}
