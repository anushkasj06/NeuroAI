import { useEffect, useMemo, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowPathIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { profile } from '../services/api';

const subjects = [
  { key: 'ads', label: 'ADS', name: 'Advanced Data Structures' },
  { key: 'ds', label: 'DS', name: 'Data Structures' },
  { key: 'am', label: 'AM', name: 'Applied Mathematics' },
  { key: 'java', label: 'Java', name: 'Java Programming' },
  { key: 'dbms', label: 'DBMS', name: 'Database Management Systems' },
];

const initialProfile = {
  name: '',
  email: '',
  profile: {
    collegeName: '',
    currentCGPA: '',
    hobbies: '',
    currentYear: '',
    branch: '',
    achievements: '',
    subjects: { ads: '', ds: '', am: '', java: '', dbms: '' },
  },
};

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialProfile);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await profile.getProfile();
      const userData = response.data.data.user;
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        profile: {
          collegeName: userData.profile?.collegeName || '',
          currentCGPA: userData.profile?.currentCGPA || '',
          hobbies: Array.isArray(userData.profile?.hobbies)
            ? userData.profile.hobbies.join(', ')
            : userData.profile?.hobbies || '',
          currentYear: userData.profile?.currentYear || '',
          branch: userData.profile?.branch || '',
          achievements: Array.isArray(userData.profile?.achievements)
            ? userData.profile.achievements.join('\n')
            : userData.profile?.achievements || '',
          subjects: {
            ads: userData.profile?.subjects?.ads || '',
            ds: userData.profile?.subjects?.ds || '',
            am: userData.profile?.subjects?.am || '',
            java: userData.profile?.subjects?.java || '',
            dbms: userData.profile?.subjects?.dbms || '',
          },
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const subjectAverage = useMemo(() => {
    const marks = subjects
      .map((item) => Number(formData.profile.subjects[item.key]))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (!marks.length) return 0;
    return Math.round(marks.reduce((sum, value) => sum + value, 0) / marks.length);
  }, [formData.profile.subjects]);

  const completedFields = useMemo(() => {
    const fields = [
      formData.name,
      formData.email,
      formData.profile.collegeName,
      formData.profile.currentCGPA,
      formData.profile.currentYear,
      formData.profile.branch,
      ...subjects.map((item) => formData.profile.subjects[item.key]),
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [formData]);

  const updateField = (path, value) => {
    setFormData((prev) => {
      if (path.startsWith('profile.subjects.')) {
        const key = path.replace('profile.subjects.', '');
        return {
          ...prev,
          profile: {
            ...prev.profile,
            subjects: { ...prev.profile.subjects, [key]: value },
          },
        };
      }
      if (path.startsWith('profile.')) {
        const key = path.replace('profile.', '');
        return { ...prev, profile: { ...prev.profile, [key]: value } };
      }
      return { ...prev, [path]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profile.updateProfile({
        name: formData.name,
        collegeName: formData.profile.collegeName,
        currentCGPA: formData.profile.currentCGPA,
        currentYear: formData.profile.currentYear,
        branch: formData.profile.branch,
        hobbies: formData.profile.hobbies
          ? formData.profile.hobbies.split(',').map((item) => item.trim()).filter(Boolean)
          : [],
        achievements: formData.profile.achievements
          ? formData.profile.achievements.split('\n').map((item) => item.trim()).filter(Boolean)
          : [],
        subjects: formData.profile.subjects,
      });
      setSuccess('Profile updated. Your AI teacher has fresher learning context now.');
      setIsEditing(false);
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-teal-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600">
                <UserCircleIcon className="h-4 w-4 text-teal-700" />
                Learning profile
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal">Student context for personalization</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                This profile feeds diagnostics, subject readiness, AI teacher personalization, and study-plan recommendations.
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit profile
              </button>
            )}
          </div>
        </header>

        {(error || success) && (
          <div className={`mt-5 rounded-lg border p-4 text-sm font-medium ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {error || success}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric icon={CheckCircleIcon} label="Profile readiness" value={`${completedFields}%`} />
          <Metric icon={AcademicCapIcon} label="Subject average" value={`${subjectAverage}%`} />
          <Metric icon={BookOpenIcon} label="Current CGPA" value={formData.profile.currentCGPA ? `${formData.profile.currentCGPA}/10` : 'Not set'} />
        </section>

        <main className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-xl font-semibold text-teal-800">
                  {(formData.name || formData.email || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{formData.name || 'Student'}</h2>
                  <p className="truncate text-sm text-slate-500">{formData.email || 'Email not set'}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <InfoRow label="College" value={formData.profile.collegeName} />
                <InfoRow label="Branch" value={formData.profile.branch} />
                <InfoRow label="Year" value={formatYear(formData.profile.currentYear)} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold">AI personalization signals</h3>
              <div className="mt-4 space-y-3">
                <Signal label="Academic base" ready={!!formData.profile.currentCGPA} />
                <Signal label="Subject marks" ready={subjectAverage > 0} />
                <Signal label="Learning interests" ready={!!formData.profile.hobbies} />
                <Signal label="Achievements" ready={!!formData.profile.achievements} />
              </div>
            </div>
          </aside>

          <section className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6">
            {!isEditing ? (
              <ProfileView data={formData} />
            ) : (
              <ProfileForm
                data={formData}
                saving={saving}
                onChange={updateField}
                onCancel={() => setIsEditing(false)}
                onSubmit={handleSubmit}
              />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function ProfileView({ data }) {
  const hobbies = data.profile.hobbies ? data.profile.hobbies.split(',').map((item) => item.trim()).filter(Boolean) : [];
  const achievements = data.profile.achievements ? data.profile.achievements.split('\n').map((item) => item.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold">Academic identity</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <InfoBlock label="Full name" value={data.name} />
          <InfoBlock label="Email" value={data.email} />
          <InfoBlock label="College" value={data.profile.collegeName} />
          <InfoBlock label="Branch" value={data.profile.branch} />
          <InfoBlock label="Current year" value={formatYear(data.profile.currentYear)} />
          <InfoBlock label="Current CGPA" value={data.profile.currentCGPA ? `${data.profile.currentCGPA}/10` : ''} />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold">Subject readiness</h3>
        <div className="mt-4 grid gap-4">
          {subjects.map((subject) => (
            <SubjectBar key={subject.key} subject={subject} value={data.profile.subjects[subject.key]} />
          ))}
        </div>
      </section>

      <section className="grid gap-5 border-t border-slate-200 pt-6 lg:grid-cols-2">
        <TagPanel title="Learning interests" empty="No interests added yet." items={hobbies} />
        <TagPanel title="Achievements" empty="No achievements added yet." items={achievements} ordered />
      </section>
    </div>
  );
}

function ProfileForm({ data, saving, onChange, onCancel, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section>
        <h3 className="text-lg font-semibold">Edit academic identity</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" value={data.name} onChange={(value) => onChange('name', value)} />
          <TextField label="Email" value={data.email} disabled onChange={() => {}} />
          <TextField label="College name" value={data.profile.collegeName} onChange={(value) => onChange('profile.collegeName', value)} />
          <TextField label="Branch" value={data.profile.branch} onChange={(value) => onChange('profile.branch', value)} placeholder="Computer Engineering" />
          <label>
            <span className="text-sm font-medium text-slate-700">Current year</span>
            <select
              value={data.profile.currentYear}
              onChange={(event) => onChange('profile.currentYear', event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-500 focus:bg-white"
            >
              <option value="">Select year</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </label>
          <TextField label="Current CGPA" type="number" min="0" max="10" step="0.01" value={data.profile.currentCGPA} onChange={(value) => onChange('profile.currentCGPA', value)} />
        </div>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold">Subject marks</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <TextField
              key={subject.key}
              label={`${subject.label} marks`}
              type="number"
              min="0"
              max="100"
              value={data.profile.subjects[subject.key]}
              onChange={(value) => onChange(`profile.subjects.${subject.key}`, value)}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-4 border-t border-slate-200 pt-6 lg:grid-cols-2">
        <TextArea
          label="Learning interests"
          helper="Separate interests with commas."
          value={data.profile.hobbies}
          onChange={(value) => onChange('profile.hobbies', value)}
          placeholder="Coding, debating, robotics"
        />
        <TextArea
          label="Achievements"
          helper="Write each achievement on a new line."
          value={data.profile.achievements}
          onChange={(value) => onChange('profile.achievements', value)}
          placeholder="Won coding contest&#10;Completed DBMS project"
        />
      </section>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckCircleIcon className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-teal-700" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value || 'Not set'}</span>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value || 'Not provided'}</p>
    </div>
  );
}

function SubjectBar({ subject, value }) {
  const mark = Math.max(0, Math.min(100, Number(value) || 0));
  const color = mark >= 75 ? 'bg-emerald-500' : mark >= 55 ? 'bg-sky-500' : mark > 0 ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-semibold text-slate-900">{subject.label}</p>
          <p className="text-xs text-slate-500">{subject.name}</p>
        </div>
        <span className="font-semibold text-slate-700">{value ? `${value}%` : 'Not set'}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${mark}%` }} />
      </div>
    </div>
  );
}

function TagPanel({ title, items, empty, ordered = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      {items.length ? (
        ordered ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {items.map((item) => <li key={item}>{item}</li>)}
          </ol>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {items.map((item) => (
              <span key={item} className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-medium text-teal-800">
                {item}
              </span>
            ))}
          </div>
        )
      ) : (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      )}
    </div>
  );
}

function Signal({ label, ready }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        {ready ? 'Ready' : 'Missing'}
      </span>
    </div>
  );
}

function TextField({ label, value, onChange, disabled = false, ...props }) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...props}
        value={value || ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-teal-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

function TextArea({ label, helper, value, onChange, ...props }) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        {...props}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:bg-white"
      />
      <span className="mt-1 block text-xs text-slate-500">{helper}</span>
    </label>
  );
}

function formatYear(year) {
  if (!year) return '';
  const suffix = year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th';
  return `${year}${suffix} Year`;
}
