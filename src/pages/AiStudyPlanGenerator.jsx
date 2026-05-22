import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart, Bar } from 'recharts';
import './AiStudyPlanGenerator.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { quiz } from '../services/api';
import SubjectQuiz from '../components/SubjectQuiz';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const getAiErrorMessage = (err) => {
  const message = err?.message || '';
  if (message.includes('401') || message.includes('invalid_api_key') || message.includes('API key')) {
    return 'Invalid Groq API key. Add VITE_GROQ_API_KEY in the project root .env and restart Vite.';
  }
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('rate limit')) {
    return 'Groq free-tier rate limit reached. Wait a minute and try again.';
  }
  if (message.includes('404') || message.includes('model')) {
    return 'Selected Groq model is unavailable right now. Please try again.';
  }
  return 'Failed to generate study plan. Please try again.';
};

const AiStudyPlanGenerator = () => {
  const [subject, setSubject] = useState('');
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await quiz.getAnswers();
        const userData = response.data;
        setUserData(userData);
      } catch (err) {
        if (err.response?.status === 401) {
          // not logged in — treat as anonymous
          setUserData(null);
        } else {
          console.error('Error fetching quiz answers:', err);
          setUserData(null);
        }
      }
    };
    fetchUserData();
  }, []);

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

  const generateStudyPlan = async () => {
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!groqApiKey) {
        throw new Error('MISSING_API_KEY');
      }

      const subjectName = (subject === "ads") ? "Advanced Data Structures" :
        (subject === "ds") ? "Data Structures" :
          (subject === "am") ? "Applied Mathematics" :
            (subject === "java") ? "Java Programming" :
              (subject === "dbms") ? "Database Management System" : "";

      const subjectData = userData?.subjects?.[subject] || {};

      const prompt = `Create a personalized 8-week study plan for ${subjectName} based on the following student data:
      Student Profile:
      - Current CGPA: ${userData?.currentCGPA || 'Not available'}
      - Education Level: ${userData?.education || 'Not available'}
      - Study Style: ${userData?.studyStyle || 'Not available'}
      - Screen Time: ${userData?.screenTime || 'Not available'} hours/day
      - Sleep Time: ${userData?.sleepTime || 'Not available'} hours/day

      Subject Performance:
      - Marks: ${subjectData?.marks || 'Not available'}
      - Attendance: ${subjectData?.attendance || 'Not available'}%
      - Interest Level: ${subjectData?.interest || 'Not available'}
      - Assignment Completion: ${subjectData?.assignments || 'Not available'}%
      - Quiz Performance: ${subjectData?.quizzes || 'Not available'}%
      - Class Participation: ${subjectData?.participation || 'Not available'}%

      Format the response as a JSON object with the following structure:
      {
        "weeks": [
          {
            "week": 1,
            "totalHours": number,
            "difficultyScore": number,
            "topics": [
              {
                "name": "string",
                "difficulty": "string",
                "hours": number,
                "resources": ["string"],
                "exercises": ["string"],
                "focusAreas": ["string"],
                "learningStyle": "string"
              }
            ]
          }
        ]
      }

      Make sure to:
      1. Consider the student's study style and learning preferences
      2. Adjust difficulty based on current performance
      3. Include focus areas that need improvement
      4. Suggest resources matching the student's learning style
      5. Provide exercises that target weak areas
      6. Return ONLY the JSON object, no additional text`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: 'Return only valid JSON. Do not include markdown code fences or extra text.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${errorText}`);
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('No response from Groq');
      }

      // Sanitize and extract JSON-like content from the model output.
      const extractAndCleanJson = (raw) => {
        const first = raw.indexOf('{');
        const last = raw.lastIndexOf('}');
        if (first === -1 || last === -1) return null;
        let candidate = raw.slice(first, last + 1);
        // Remove trailing commas before ] or }
        candidate = candidate.replace(/,\s*(\]|\})/g, '$1');
        // Remove any accidental non-JSON characters at start/end
        return candidate.trim();
      };

      const cleaned = extractAndCleanJson(text);
      if (!cleaned) {
        throw new Error('Failed to extract JSON from response');
      }

      try {
        const parsedPlan = JSON.parse(cleaned);
        setStudyPlan(parsedPlan);
      } catch (parseErr) {
        console.warn('JSON.parse failed, falling back to local generator', parseErr);
        // fall through to fallback below
        throw parseErr;
      }
    } catch (err) {
      console.error('Error generating study plan:', err);
      if (err.message === 'MISSING_API_KEY') {
        setError('Missing Groq API key. Add VITE_GROQ_API_KEY in the project root .env and restart Vite.');
      } else {
        setError(getAiErrorMessage(err));
      }
      // provide a deterministic local fallback so UI remains usable
      try {
        const fallback = generateLocalStudyPlan(subject, userData);
        setStudyPlan(fallback);
        // clear the error since fallback is provided
        setError(null);
      } catch (fErr) {
        console.error('Fallback generation failed:', fErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateLocalStudyPlan = (subjectKey, userData) => {
    const subjectName = (subjectKey === 'ads') ? 'Advanced Data Structures' :
      (subjectKey === 'ds') ? 'Data Structures' :
        (subjectKey === 'am') ? 'Applied Mathematics' :
          (subjectKey === 'java') ? 'Java Programming' :
            (subjectKey === 'dbms') ? 'Database Management System' : subjectKey;

    const weeks = [];
    for (let w = 1; w <= 8; w++) {
      weeks.push({
        week: w,
        totalHours: 6 + (w % 2),
        difficultyScore: Math.min(10, 5 + Math.floor(w / 2)),
        topics: [
          {
            name: `${subjectName} - Core Topic ${w}`,
            difficulty: w <= 3 ? 'Easy' : w <= 6 ? 'Medium' : 'Hard',
            hours: 3,
            resources: ['Lecture notes', 'Practice exercises'],
            exercises: ['Solve 10 problems', 'Review past quizzes'],
            focusAreas: ['Concept clarity', 'Problem solving'],
            learningStyle: userData?.studyStyle || 'visual',
          },
        ],
      });
    }

    return { weeks };
  };

  const handleTakeTest = () => {
    setShowQuiz(true);
    setQuizResult(null);
    setShowBadge(false);
  };

  const handleCloseQuiz = () => {
    setShowQuiz(false);
  };

  const handleQuizComplete = (result) => {
    setQuizResult(result);
    setShowQuiz(false);
    setShowBadge(true);
  };

  const getBadgeInfo = (score) => {
    if (score >= 90) {
      return {
        name: "Master",
        color: "from-amber-400 to-yellow-500",
        borderColor: "border-amber-300",
        textColor: "text-amber-800",
        icon: (
          <svg className="w-16 h-16 text-amber-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l.707.707L15.414 5a1 1 0 01-1.414 1.414L13 5.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 14a1 1 0 01.707.293l.707.707L15.414 13a1 1 0 01-1.414 1.414L13 13.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ),
        description: "Outstanding performance! You've mastered this subject."
      };
    } else if (score >= 80) {
      return {
        name: "Expert",
        color: "from-purple-400 to-indigo-500",
        borderColor: "border-purple-300",
        textColor: "text-purple-800",
        icon: (
          <svg className="w-16 h-16 text-purple-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ),
        description: "Excellent work! You're an expert in this subject."
      };
    } else if (score >= 70) {
      return {
        name: "Proficient",
        color: "from-blue-400 to-cyan-500",
        borderColor: "border-blue-300",
        textColor: "text-blue-800",
        icon: (
          <svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        description: "Great job! You're proficient in this subject."
      };
    } else if (score >= 60) {
      return {
        name: "Intermediate",
        color: "from-green-400 to-emerald-500",
        borderColor: "border-green-300",
        textColor: "text-green-800",
        icon: (
          <svg className="w-16 h-16 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
        description: "Good effort! You have a solid understanding of this subject."
      };
    } else if (score >= 50) {
      return {
        name: "Beginner",
        color: "from-orange-400 to-amber-500",
        borderColor: "border-orange-300",
        textColor: "text-orange-800",
        icon: (
          <svg className="w-16 h-16 text-orange-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        ),
        description: "You're on your way! Keep practicing to improve your knowledge."
      };
    } else {
      return {
        name: "Novice",
        color: "from-red-400 to-pink-500",
        borderColor: "border-red-300",
        textColor: "text-red-800",
        icon: (
          <svg className="w-16 h-16 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
        description: "You're just starting out. Review the study plan and try again!"
      };
    }
  };

  const renderStudyPlan = () => {
    if (!studyPlan) return null;

    return (
      <div className="space-y-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Study Plan Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-5 shadow-sm border border-indigo-100">
              <h3 className="text-lg font-semibold text-indigo-700 mb-2">Total Weeks</h3>
              <p className="text-3xl font-bold text-indigo-600">{studyPlan.weeks.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 shadow-sm border border-purple-100">
              <h3 className="text-lg font-semibold text-purple-700 mb-2">Total Topics</h3>
              <p className="text-3xl font-bold text-purple-600">{studyPlan.weeks.reduce((acc, week) => acc + week.topics.length, 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-lg p-5 shadow-sm border border-pink-100">
              <h3 className="text-lg font-semibold text-pink-700 mb-2">Total Hours</h3>
              <p className="text-3xl font-bold text-pink-600">{studyPlan.weeks.reduce((acc, week) => acc + week.topics.reduce((sum, topic) => sum + topic.hours, 0), 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
            </svg>
            Study Timeline
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studyPlan.weeks} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalHours" 
                  stroke="#6366f1" 
                  name="Study Hours" 
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#4f46e5' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Difficulty Distribution
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studyPlan.weeks} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    border: '1px solid #e5e7eb'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="difficultyScore" 
                  fill="#10b981" 
                  name="Difficulty Score" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-2xl font-bold text-indigo-700 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            Weekly Breakdown
          </h2>
          <div className="space-y-6">
            {studyPlan.weeks.map((week, index) => (
              <div key={index} className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 shadow-sm border border-indigo-100">
                <h3 className="text-xl font-bold text-indigo-700 mb-4 flex items-center">
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white mr-3">
                    {week.week}
                  </span>
                  Week {week.week}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {week.topics.map((topic, topicIndex) => (
                    <div key={topicIndex} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                      <h4 className="text-lg font-semibold text-gray-800 mb-2">{topic.name}</h4>
                      <div className="flex items-center mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          topic.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                          topic.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {topic.difficulty}
                        </span>
                        <span className="ml-2 text-sm text-gray-600">
                          {topic.hours} hours
                        </span>
                      </div>
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Resources:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {topic.resources.map((resource, resIndex) => (
                            <li key={resIndex} className="flex items-start">
                              <svg className="h-4 w-4 text-indigo-500 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              {resource}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Practice Exercises:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {topic.exercises.map((exercise, exIndex) => (
                            <li key={exIndex} className="flex items-start">
                              <svg className="h-4 w-4 text-indigo-500 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                              </svg>
                              {exercise}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Focus Areas:</h5>
                        <div className="flex flex-wrap gap-1">
                          {topic.focusAreas.map((area, areaIndex) => (
                            <span key={areaIndex} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderBadge = () => {
    if (!showBadge || !quizResult) return null;
    
    const score = Math.round((quizResult.correctAnswers / quizResult.totalQuestions) * 100);
    const badgeInfo = getBadgeInfo(score);
    
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
            <h2 className="text-2xl font-extrabold text-white text-center">Quiz Completed!</h2>
            <p className="text-indigo-100 text-center mt-2">You scored {score}%</p>
          </div>
          
          <div className="p-8 flex flex-col items-center">
            <div className={`bg-gradient-to-br ${badgeInfo.color} rounded-full p-4 border-4 ${badgeInfo.borderColor} shadow-lg mb-6`}>
              {badgeInfo.icon}
            </div>
            
            <h3 className={`text-2xl font-bold ${badgeInfo.textColor} mb-2`}>{badgeInfo.name} Badge</h3>
            <p className="text-gray-600 text-center mb-6">{badgeInfo.description}</p>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className={`h-2.5 rounded-full ${badgeInfo.color.split(' ')[1]}`} 
                style={{ width: `${score}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Correct</p>
                <p className="text-xl font-bold text-green-600">{quizResult.correctAnswers}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-700">{quizResult.totalQuestions}</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowBadge(false)}
              className="w-full py-3 px-4 rounded-lg text-white font-medium bg-indigo-600 hover:bg-indigo-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">AI-Powered Study Plan Generator</h1>
            <p className="text-indigo-100 text-lg">Enter your subject to get a personalized study plan generated by AI</p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Select a subject
              </label>
              <select 
                id="subject" 
                className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm"
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="">Select a subject</option>
                <option value="ads">Advanced Data Structures</option>
                <option value="ds">Data Structures</option>
                <option value="am">Applied Mathematics</option>
                <option value="java">Java Programming</option>
                <option value="dbms">Database Management System</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={generateStudyPlan}
                disabled={loading || !subject}
                className={`flex-1 py-3 px-4 rounded-lg text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  loading || !subject 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) :"Generate Study Plan"}
              </button>
              
              {subject && (
                <button
                  onClick={handleTakeTest}
                  className="flex-1 py-3 px-4 rounded-lg text-white font-medium bg-purple-600 hover:bg-purple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Take Test
                </button>
              )}
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {studyPlan && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              {renderStudyPlan()}
            </div>
          </div>
        )}

        {showQuiz && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-800">Subject Quiz</h3>
                <button 
                  onClick={handleCloseQuiz}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <SubjectQuiz subject={subject} onClose={handleCloseQuiz} onComplete={handleQuizComplete} />
              </div>
            </div>
          </div>
        )}

        {renderBadge()}
      </div>
    </div>
  );
};

export default AiStudyPlanGenerator; 