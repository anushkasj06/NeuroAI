import { useState, useEffect, useMemo } from 'react';
import {
  EDUCATION_LEVELS,
  getSubjectsForLevel,
} from '../../constants/diagnostic';
import { diagnostic } from '../../services/diagnosticApi';
import { getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const INITIAL = {
  fullName: '',
  age: '',
  educationLevel: '',
  targetPercentage: '',
  currentCgpaOrPercentage: '',
  studyHoursPerDay: '',
  sleepHours: '',
  screenTimeHours: '',
  examDeadline: '',
  selectedSubjects: {},
};

const ONBOARDING_STEPS = [
  { id: 'personal', title: 'Personal Info', desc: 'Tell us about yourself' },
  { id: 'academic', title: 'Academic Details', desc: 'Goals and lifestyle' },
  { id: 'subjects', title: 'Subjects', desc: 'Select subjects and marks' },
];

const selectClass =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer';

export default function OnboardingForm({ onComplete, onError }) {
  const { user } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(0);
  const [subjectToAdd, setSubjectToAdd] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const availableSubjects = useMemo(
    () => getSubjectsForLevel(form.educationLevel),
    [form.educationLevel]
  );

  const unselectedSubjects = useMemo(
    () => availableSubjects.filter((s) => !form.selectedSubjects[s.slug]),
    [availableSubjects, form.selectedSubjects]
  );

  useEffect(() => {
    if (!form.educationLevel) return;
    diagnostic
      .getSubjectsForLevel(form.educationLevel)
      .then((res) => {
        const fromApi = res.data?.data?.subjects;
        if (fromApi?.length) {
          // API ok — local list already matches; no state change needed
        }
      })
      .catch(() => {
        // Offline / backend down — local getSubjectsForLevel is used
      });
  }, [form.educationLevel]);

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'educationLevel' && value !== prev.educationLevel) {
        next.selectedSubjects = {};
        setSubjectToAdd('');
      }
      return next;
    });
    setLocalError('');
  };

  const addSubjectFromDropdown = () => {
    if (!subjectToAdd) {
      setLocalError('Choose a subject from the dropdown first');
      return;
    }
    const sub = availableSubjects.find((s) => s.slug === subjectToAdd);
    if (!sub) return;
    setForm((prev) => ({
      ...prev,
      selectedSubjects: {
        ...prev.selectedSubjects,
        [sub.slug]: {
          subjectSlug: sub.slug,
          subjectName: sub.name,
          currentMarks: '',
        },
      },
    }));
    setSubjectToAdd('');
    setLocalError('');
  };

  const removeSubject = (slug) => {
    setForm((prev) => {
      const next = { ...prev.selectedSubjects };
      delete next[slug];
      return { ...prev, selectedSubjects: next };
    });
  };

  const setSubjectMarks = (slug, marks) => {
    setForm((prev) => ({
      ...prev,
      selectedSubjects: {
        ...prev.selectedSubjects,
        [slug]: { ...prev.selectedSubjects[slug], currentMarks: marks },
      },
    }));
  };

  const handleMultiSelectChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setForm((prev) => {
      const next = { ...prev.selectedSubjects };
      availableSubjects.forEach((sub) => {
        if (selected.includes(sub.slug) && !next[sub.slug]) {
          next[sub.slug] = {
            subjectSlug: sub.slug,
            subjectName: sub.name,
            currentMarks: next[sub.slug]?.currentMarks ?? '',
          };
        }
        if (!selected.includes(sub.slug)) {
          delete next[sub.slug];
        }
      });
      return { ...prev, selectedSubjects: next };
    });
    setLocalError('');
  };

  const validateStep = () => {
    if (step === 0) {
      if (!form.fullName.trim()) return 'Full name is required';
      if (!form.age || Number(form.age) < 5) return 'Valid age is required';
      if (!form.educationLevel) return 'Select your education level from the dropdown';
    }
    if (step === 1) {
      if (form.targetPercentage === '' || form.targetPercentage == null) {
        return 'Target percentage required';
      }
      if (form.currentCgpaOrPercentage === '' || form.currentCgpaOrPercentage == null) {
        return 'Current CGPA/percentage required';
      }
      if (!form.studyHoursPerDay) return 'Study hours per day required';
      if (form.sleepHours === '') return 'Sleep hours required';
      if (form.screenTimeHours === '') return 'Screen time required';
      if (!form.examDeadline) return 'Exam deadline required';
    }
    if (step === 2) {
      if (!form.educationLevel) {
        return 'Go back to step 1 and select your education level first';
      }
      const selected = Object.values(form.selectedSubjects);
      if (selected.length === 0) return 'Select at least one subject';
      for (const s of selected) {
        const marks = Number(s.currentMarks);
        if (s.currentMarks === '' || Number.isNaN(marks) || marks < 0 || marks > 100) {
          return `Enter valid marks (0-100) for ${s.subjectName}`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) {
      setLocalError(err);
      return;
    }

    if (step < ONBOARDING_STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    if (!user) {
      setLocalError('Please log in before submitting onboarding.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setLocalError('Session expired. Please log out and log in again.');
      return;
    }

    setLoading(true);
    setLocalError('');
    try {
      const payload = {
        fullName: form.fullName.trim(),
        age: Number(form.age),
        educationLevel: form.educationLevel,
        targetPercentage: Number(form.targetPercentage),
        currentCgpaOrPercentage: Number(form.currentCgpaOrPercentage),
        studyHoursPerDay: Number(form.studyHoursPerDay),
        sleepHours: Number(form.sleepHours),
        screenTimeHours: Number(form.screenTimeHours),
        examDeadline: form.examDeadline,
        subjects: Object.values(form.selectedSubjects).map((s) => ({
          subjectSlug: s.subjectSlug,
          subjectName: s.subjectName,
          currentMarks: Number(s.currentMarks),
        })),
      };
      const res = await diagnostic.submitOnboarding(payload);
      if (res.data?.data?.resumeStep) {
        onComplete(res.data.data.resumeStep);
      } else {
        onComplete('text');
      }
    } catch (e) {
      const msg = getApiErrorMessage(e, 'Failed to submit onboarding');
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
              value={form.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={5}
              max={30}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Education level
            </label>
            <select
              id="educationLevel"
              className={selectClass}
              value={form.educationLevel}
              onChange={(e) => update('educationLevel', e.target.value)}
            >
              <option value="">— Select your class / year —</option>
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
            {form.educationLevel && (
              <p className="mt-2 text-sm text-indigo-600">
                {availableSubjects.length} subjects available for your level (choose them in step 3)
              </p>
            )}
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            ['targetPercentage', 'Target percentage (%)', 0, 100],
            ['currentCgpaOrPercentage', 'Current CGPA / %', 0, 100],
            ['studyHoursPerDay', 'Study hours per day', 0.5, 16, 0.5],
            ['sleepHours', 'Sleep hours', 0, 14],
            ['screenTimeHours', 'Screen time (hours)', 0, 24],
          ].map(([key, label, min, max, stepVal]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type="number"
                min={min}
                max={max}
                step={stepVal || 1}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exam / learning deadline
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500"
              value={form.examDeadline}
              onChange={(e) => update('examDeadline', e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (!form.educationLevel) {
      return (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          Please go back to <strong>Step 1</strong> and select your <strong>Education level</strong>{' '}
          from the dropdown before choosing subjects.
        </div>
      );
    }

    const selectedSlugs = Object.keys(form.selectedSubjects);

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-600">
          Education:{' '}
          <strong>
            {EDUCATION_LEVELS.find((e) => e.value === form.educationLevel)?.label}
          </strong>
        </p>

        {/* Multi-select dropdown (hold Ctrl/Cmd to select multiple) */}
        <div>
          <label htmlFor="subjectsMulti" className="block text-sm font-medium text-gray-700 mb-1">
            Select subjects (multi-select)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Hold <kbd className="px-1 bg-gray-100 rounded">Ctrl</kbd> (Windows) or{' '}
            <kbd className="px-1 bg-gray-100 rounded">Cmd</kbd> (Mac) and click to select multiple
          </p>
          <select
            id="subjectsMulti"
            multiple
            size={Math.min(10, availableSubjects.length)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-white"
            value={selectedSlugs}
            onChange={handleMultiSelectChange}
          >
            {availableSubjects.map((sub) => (
              <option key={sub.slug} value={sub.slug} className="py-2 px-2">
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Single-select dropdown + Add button */}
        <div className="border-t border-gray-100 pt-6">
          <label htmlFor="subjectAdd" className="block text-sm font-medium text-gray-700 mb-1">
            Or add one subject at a time
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              id="subjectAdd"
              className={`${selectClass} flex-1`}
              value={subjectToAdd}
              onChange={(e) => setSubjectToAdd(e.target.value)}
            >
              <option value="">— Choose a subject —</option>
              {unselectedSubjects.map((sub) => (
                <option key={sub.slug} value={sub.slug}>
                  {sub.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addSubjectFromDropdown}
              disabled={!subjectToAdd}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 whitespace-nowrap"
            >
              + Add subject
            </button>
          </div>
        </div>

        {/* Selected subjects with marks */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Your subjects ({Object.keys(form.selectedSubjects).length})
          </h3>
          {Object.keys(form.selectedSubjects).length === 0 ? (
            <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-xl">
              No subjects selected yet. Use the dropdowns above.
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {Object.values(form.selectedSubjects).map((s) => (
                <div
                  key={s.subjectSlug}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl"
                >
                  <span className="font-medium text-gray-800 sm:w-48 shrink-0">{s.subjectName}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Current marks %"
                    aria-label={`Marks for ${s.subjectName}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={s.currentMarks}
                    onChange={(e) => setSubjectMarks(s.subjectSlug, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSubject(s.subjectSlug)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {ONBOARDING_STEPS[step].title}
        </h2>
        <p className="text-gray-600">{ONBOARDING_STEPS[step].desc}</p>
        <p className="text-sm text-indigo-600 mt-1">
          Step {step + 1} of {ONBOARDING_STEPS.length}
        </p>
      </div>

      {localError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{localError}</div>
      )}

      {renderStep()}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          disabled={step === 0 || loading}
          onClick={() => setStep((s) => s - 1)}
          className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium disabled:opacity-60"
        >
          {loading ? 'Saving...' : step === ONBOARDING_STEPS.length - 1 ? 'Start Assessments' : 'Next'}
        </button>
      </div>
    </div>
  );
}
