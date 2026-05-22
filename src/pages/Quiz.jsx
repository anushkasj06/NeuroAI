import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Quiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({
    currentCGPA: '',
    education: '',
    subjects: {
      ads: { marks: '', attendance: '', interest: '', assignments: '', quizzes: '', participation: '' },
      ds: { marks: '', attendance: '', interest: '', assignments: '', quizzes: '', participation: '' },
      am: { marks: '', attendance: '', interest: '', assignments: '', quizzes: '', participation: '' },
      java: { marks: '', attendance: '', interest: '', assignments: '', quizzes: '', participation: '' },
      dbms: { marks: '', attendance: '', interest: '', assignments: '', quizzes: '', participation: '' }
    },
    achievements: '',
    hobbies: '',
    studyStyle: '',
    parentEducation: '',
    aim: '',
    goal: '',
    screenTime: '',
    sleepTime: ''
  });

  const questions = [
    {
      id: 'currentCGPA',
      title: '🎓 Your Current CGPA',
      description: 'Let\'s start with your current academic standing!',
      type: 'number',
      placeholder: 'Enter your current CGPA (0-10)',
      min: 0,
      max: 10,
      step: 0.1
    },
    {
      id: 'education',
      title: '📚 Current Education Level',
      description: 'What\'s your current educational journey?',
      type: 'select',
      options: [
        { value: 'btech1', label: 'B.Tech 1st Year' },
        { value: 'btech2', label: 'B.Tech 2nd Year' },
        { value: 'btech3', label: 'B.Tech 3rd Year' },
        { value: 'btech4', label: 'B.Tech 4th Year' }
      ]
    },
    {
      id: 'subjects',
      title: '📖 Subject Performance',
      description: 'Let\'s dive into your subject-wise performance!',
      type: 'subjects',
      subjects: ['ads', 'ds', 'am', 'java', 'dbms']
    },
    {
      id: 'achievements',
      title: '🏆 Your Achievements',
      description: 'Share your proud moments!',
      type: 'textarea',
      placeholder: 'List your academic achievements...'
    },
    {
      id: 'hobbies',
      title: '🎨 Your Hobbies',
      description: 'What makes you unique outside academics?',
      type: 'textarea',
      placeholder: 'Tell us about your hobbies...'
    },
    {
      id: 'studyStyle',
      title: '📝 Study Style',
      description: 'How do you prefer to learn?',
      type: 'select',
      options: [
        { value: 'visual', label: 'Visual Learner' },
        { value: 'auditory', label: 'Auditory Learner' },
        { value: 'reading', label: 'Reading/Writing Learner' },
        { value: 'kinesthetic', label: 'Kinesthetic Learner' }
      ]
    },
    {
      id: 'parentEducation',
      title: '👨‍👩‍👧‍👦 Parent\'s Education',
      description: 'Tell us about your parents\' educational background',
      type: 'select',
      options: [
        { value: 'high_school', label: 'High School' },
        { value: 'bachelors', label: 'Bachelor\'s Degree' },
        { value: 'masters', label: 'Master\'s Degree' },
        { value: 'phd', label: 'PhD' }
      ]
    },
    {
      id: 'aim',
      title: '🎯 Your Aim',
      description: 'What\'s your career aim?',
      type: 'select',
      options: [
        { value: 'software', label: 'Software Development' },
        { value: 'data', label: 'Data Science' },
        { value: 'ai', label: 'Artificial Intelligence' },
        { value: 'other', label: 'Other' }
      ]
    },
    {
      id: 'goal',
      title: '⭐ Your Goal',
      description: 'What\'s your target CGPA?',
      type: 'number',
      placeholder: 'Enter your target CGPA (0-10)',
      min: 0,
      max: 10,
      step: 0.1
    },
    {
      id: 'screenTime',
      title: '📱 Daily Screen Time',
      description: 'How many hours do you spend on screens daily?',
      type: 'number',
      placeholder: 'Enter hours (0-24)',
      min: 0,
      max: 24
    },
    {
      id: 'sleepTime',
      title: '😴 Sleep Schedule',
      description: 'How many hours do you sleep daily?',
      type: 'number',
      placeholder: 'Enter hours (0-12)',
      min: 0,
      max: 12
    }
  ];

  const handleAnswer = (value) => {
    const currentQuestion = questions[currentStep];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleSubjectAnswer = (subject, field, value) => {
    setAnswers(prev => ({
      ...prev,
      subjects: {
        ...prev.subjects,
        [subject]: {
          ...prev.subjects[subject],
          [field]: value
        }
      }
    }));
  };

  const validateAnswers = () => {
    // Validate required fields
    const requiredFields = ['currentCGPA', 'education', 'studyStyle', 'parentEducation', 'aim', 'goal', 'screenTime', 'sleepTime'];
    for (const field of requiredFields) {
      if (!answers[field]) {
        setError(`Please answer the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} question`);
        return false;
      }
    }

    // Validate numeric fields
    const numericFields = {
      currentCGPA: { min: 0, max: 10 },
      goal: { min: 0, max: 10 },
      screenTime: { min: 0, max: 24 },
      sleepTime: { min: 0, max: 12 }
    };

    for (const [field, range] of Object.entries(numericFields)) {
      const value = parseFloat(answers[field]);
      if (isNaN(value) || value < range.min || value > range.max) {
        setError(`${field.replace(/([A-Z])/g, ' $1')} must be between ${range.min} and ${range.max}`);
        return false;
      }
    }

    // Validate subject data
    for (const subject of ['ads', 'ds', 'am', 'java', 'dbms']) {
      const subjectData = answers.subjects[subject];
      const requiredSubjectFields = ['marks', 'attendance', 'interest', 'assignments', 'quizzes', 'participation'];
      
      for (const field of requiredSubjectFields) {
        const value = subjectData[field];
        if (value === '' && value !== 0) {
          setError(`Please complete all fields for ${subject.toUpperCase()}`);
          return false;
        }

        // Validate numeric ranges
        if (field === 'interest') {
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 1 || numValue > 10) {
            setError(`${subject.toUpperCase()} interest must be between 1 and 10`);
            return false;
          }
        } else {
          const numValue = parseInt(value);
          if (isNaN(numValue) || numValue < 0 || numValue > 100) {
            setError(`${subject.toUpperCase()} ${field} must be between 0 and 100`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setError('');
    } else {
      if (!validateAnswers()) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Convert string values to numbers where needed
        const formattedAnswers = {
          ...answers,
          currentCGPA: parseFloat(answers.currentCGPA),
          goal: parseFloat(answers.goal),
          screenTime: parseInt(answers.screenTime),
          sleepTime: parseInt(answers.sleepTime),
          subjects: Object.entries(answers.subjects).reduce((acc, [subject, data]) => ({
            ...acc,
            [subject]: {
              marks: parseInt(data.marks) || 0,
              attendance: parseInt(data.attendance) || 0,
              interest: parseInt(data.interest) || 0,
              assignments: parseInt(data.assignments) || 0,
              quizzes: parseInt(data.quizzes) || 0,
              participation: parseInt(data.participation) || 0
            }
          }), {})
        };

        console.log('Submitting quiz data:', formattedAnswers);

        const response = await axios.post('http://localhost:5000/api/quiz/submit', formattedAnswers, {
          withCredentials: true
        });
        
        if (response.status === 201) {
          console.log('Quiz completed:', response.data);
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error submitting quiz:', error);
        console.error('Error response:', error.response?.data);
        setError(error.response?.data?.message || error.response?.data?.error || 'Error submitting quiz. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderQuestion = () => {
    const question = questions[currentStep];

    switch (question.type) {
      case 'number':
        return (
          <div className="space-y-4">
            <input
              type="number"
              className="w-full px-6 py-4 text-lg rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-purple-200"
              placeholder={question.placeholder}
              min={question.min}
              max={question.max}
              step={question.step}
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                className={`p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                  answers[question.id] === option.value
                    ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md'
                    : 'border-gray-100 hover:border-purple-200 hover:bg-gray-50'
                }`}
                onClick={() => handleAnswer(option.value)}
              >
                <span className="text-lg font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        );

      case 'subjects':
        return (
          <div className="space-y-8">
            {question.subjects.map((subject) => (
              <div key={subject} className="bg-gray-50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
                <h3 className="text-xl font-semibold mb-6 text-gray-800 capitalize flex items-center">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 w-2 h-6 rounded mr-3"></span>
                  {subject.toUpperCase()}
                </h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marks (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      value={answers.subjects[subject].marks || ''}
                      onChange={(e) => handleSubjectAnswer(subject, 'marks', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attendance (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      value={answers.subjects[subject].attendance || ''}
                      onChange={(e) => handleSubjectAnswer(subject, 'attendance', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Interest (1-10)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      min="1"
                      max="10"
                      value={answers.subjects[subject].interest || ''}
                      onChange={(e) => handleSubjectAnswer(subject, 'interest', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assignments (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      value={answers.subjects[subject].assignments || ''}
                      onChange={(e) => handleSubjectAnswer(subject, 'assignments', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quizzes (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      value={answers.subjects[subject].quizzes || ''}
                      onChange={(e) => handleSubjectAnswer(subject, 'quizzes', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participation (%)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      value={answers.subjects[subject].participation || ''}
                      onChange={(e) => handleSubjectAnswer(subject, 'participation', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-4">
            <textarea
              className="w-full px-6 py-4 text-lg rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 hover:border-purple-200 min-h-[160px]"
              rows="4"
              placeholder={question.placeholder}
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg">
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm font-medium text-gray-600">
              Question {currentStep + 1} of {questions.length}
            </p>
            <p className="text-sm font-medium text-purple-600">
              {Math.round(((currentStep + 1) / questions.length) * 100)}% Complete
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-xl shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 transition-all duration-500 hover:shadow-2xl">
          <div className="space-y-6">
            {/* Question Header */}
            <div className="border-b border-gray-100 pb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {questions[currentStep].title}
              </h2>
              <p className="mt-2 text-lg text-gray-600">{questions[currentStep].description}</p>
            </div>

            {/* Question Content */}
            <div className="py-4">
              {renderQuestion()}
            </div>

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
              <button
                onClick={handleBack}
                disabled={currentStep === 0 || loading}
                className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 transform ${
                  currentStep === 0 || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 hover:-translate-x-1 border border-gray-200 hover:shadow-md'
                }`}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                disabled={loading}
                className={`px-8 py-3 rounded-xl font-medium text-white transition-all duration-300 transform ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:translate-x-1 hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    {currentStep === questions.length - 1 ? 'Finish' : 'Next'} →
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quiz;