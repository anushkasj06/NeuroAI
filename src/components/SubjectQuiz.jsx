import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { quiz, leaderboard } from '../services/api';
import './SubjectQuiz.css';

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
  return 'Failed to generate quiz. Please try again.';
};

const SubjectQuiz = ({ subject, onClose }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY?.trim();

  useEffect(() => {
    generateQuiz();
  }, [subject]);

  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!groqApiKey) {
        throw new Error('MISSING_API_KEY');
      }

      const subjectName = (subject === "ads") ? "Advanced Data Structures" :
        (subject === "ds") ? "Data Structures" :
          (subject === "am") ? "Applied Mathematics" :
            (subject === "java") ? "Java Programming" :
              (subject === "dbms") ? "Database Management System" : "";

      const prompt = `Create a 10-question multiple choice quiz about ${subjectName}. 
      Format the response as a JSON array with the following structure for each question:
      {
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": number (0-3),
        "explanation": "string"
      }
      
      Make sure to:
      1. Cover important topics from the syllabus
      2. Include a mix of difficulty levels
      3. Make questions clear and concise
      4. Provide detailed explanations for answers
      5. Return ONLY the JSON array, no additional text`;

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

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI. Please try again.');
      }

      try {
        const parsedQuestions = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          throw new Error('No questions generated. Please try again.');
        }
        setQuestions(parsedQuestions);
        setRetryCount(0);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Failed to parse quiz questions. Please try again.');
      }
    } catch (err) {
      console.error('Error generating quiz:', err);
      let errorMessage = getAiErrorMessage(err);
      if (err.message === 'MISSING_API_KEY') {
        errorMessage = 'Missing Groq API key. Add VITE_GROQ_API_KEY in the project root .env and restart Vite.';
      }
      
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, optionIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    const newScore = {
      correct,
      total: questions.length,
      percentage: (correct / questions.length) * 100
    };
    setScore(newScore);
    return newScore;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate score
      const correctAnswers = questions.filter((question, index) => selectedAnswers[index] === question.correctAnswer).length;
      const totalScore = Math.round((correctAnswers / questions.length) * 100);

      // Hardcoded score data for testing
      setShowResults(true);
      setScore({
        correct: correctAnswers,
        total: questions.length,
        percentage: totalScore
      });
      setCorrectAnswers(correctAnswers);

      // Simulate API call delay
      setTimeout(() => {
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error('Error in quiz submission:', err);
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-container">
        <div className="error-card">
          <div className="error-icon">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="error-title">Quiz Generation Failed</h3>
          <p className="error-message">{error}</p>
          {error.includes('API key') ? (
            <div className="error-actions">
              <button
                onClick={onClose}
                className="close-button"
              >
                Close
              </button>
            </div>
          ) : retryCount < 3 ? (
            <div className="error-actions">
              <button
                onClick={generateQuiz}
                className="retry-button"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
              <button
                onClick={onClose}
                className="close-button"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="error-actions">
              <button
                onClick={onClose}
                className="close-button"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="quiz-container">
        <div className="score-card">
          <h2>Quiz Results</h2>
          <div className="score-details">
            <p>Correct Answers: {correctAnswers}/{questions.length}</p>
            <p>Percentage: {score.percentage.toFixed(1)}%</p>
            {saving && <p className="saving-indicator">Saving results...</p>}
            {error && (
              <div className="error-message">
                <p>{error}</p>
                <div className="error-actions">
                  <button
                    onClick={handleSubmit}
                    className="retry-button"
                    disabled={saving}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                  <button
                    onClick={onClose}
                    className="close-button"
                    disabled={saving}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="answers-review">
            {questions.map((question, index) => (
              <div key={index} className={`question-review ${selectedAnswers[index] === question.correctAnswer ? 'correct' : 'incorrect'}`}>
                <p><strong>Question {index + 1}:</strong> {question.question}</p>
                <p><strong>Your Answer:</strong> {question.options[selectedAnswers[index]]}</p>
                <p><strong>Correct Answer:</strong> {question.options[question.correctAnswer]}</p>
                <p><strong>Explanation:</strong> {question.explanation}</p>
              </div>
            ))}
          </div>
          {!error && (
            <button 
              onClick={handleSubmit}
              disabled={saving}
              className="submit-button"
            >
              {saving ? 'Saving...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>{subject.toUpperCase()} Quiz</h2>
        <p>Question {currentQuestion + 1} of {questions.length}</p>
      </div>

      <div className="question-card">
        <h3>{questions[currentQuestion]?.question}</h3>
        <div className="options-grid">
          {questions[currentQuestion]?.options.map((option, index) => (
            <button
              key={index}
              className={`option-button ${selectedAnswers[currentQuestion] === index ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(currentQuestion, index)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-navigation">
        <button
          onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>
        {currentQuestion === questions.length - 1 ? (
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="submit-button"
          >
            {saving ? 'Saving...' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
            disabled={selectedAnswers[currentQuestion] === undefined}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default SubjectQuiz; 