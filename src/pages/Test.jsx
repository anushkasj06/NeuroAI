import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Test = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { topicName, subject } = location.state || {};
  const [answers, setAnswers] = useState({});
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);

  // Sample questions based on topic
  const questions = {
    'AVL Trees': [
      {
        id: 1,
        question: "What is the balance factor in AVL trees?",
        type: "radio",
        options: [
          "Height of left subtree - Height of right subtree",
          "Height of right subtree - Height of left subtree",
          "Total number of nodes in left - right subtree",
          "None of the above"
        ],
        correctAnswer: "Height of left subtree - Height of right subtree"
      },
      {
        id: 2,
        question: "Maximum height of an AVL tree with n nodes is:",
        type: "radio",
        options: [
          "1.44 log n",
          "2 log n",
          "log n",
          "n/2"
        ],
        correctAnswer: "1.44 log n"
      },
      {
        id: 3,
        question: "Explain the rotation operations in AVL trees:",
        type: "textarea",
        correctAnswer: "Left rotation, Right rotation, Left-Right rotation, Right-Left rotation"
      },
      {
        id: 4,
        question: "What is the time complexity of insertion in an AVL tree?",
        type: "radio",
        options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
        correctAnswer: "O(log n)"
      },
      {
        id: 5,
        question: "When is a Left-Right rotation performed?",
        type: "textarea",
        correctAnswer: "When a node has a left-heavy left subtree"
      },
      {
        id: 6,
        question: "What's the minimum number of nodes in an AVL tree of height h?",
        type: "radio",
        options: ["h", "2h", "Fibonacci(h)", "2^h - 1"],
        correctAnswer: "Fibonacci(h)"
      },
      {
        id: 7,
        question: "List the steps to insert a node in an AVL tree:",
        type: "textarea",
        correctAnswer: "1. Insert like BST 2. Update heights 3. Check balance factor 4. Perform rotations if needed"
      }
    ],
    // Add more topics with their questions
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    let correctAnswers = 0;
    const currentQuestions = questions[topicName] || [];

    currentQuestions.forEach(question => {
      if (question.type === 'radio') {
        if (answers[question.id] === question.correctAnswer) {
          correctAnswers++;
        }
      } else if (question.type === 'textarea') {
        // For textarea, check if key concepts are mentioned
        const userAnswer = (answers[question.id] || '').toLowerCase();
        const keyPoints = question.correctAnswer.toLowerCase().split(',');
        if (keyPoints.some(point => userAnswer.includes(point.trim()))) {
          correctAnswers++;
        }
      }
    });

    setScore((correctAnswers / currentQuestions.length) * 100);
    setShowScore(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">
            Test: {topicName}
          </h1>

          {!showScore ? (
            <div className="space-y-6">
              {questions[topicName]?.map((question) => (
                <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium mb-3">
                    {question.id}. {question.question}
                  </p>

                  {question.type === 'radio' ? (
                    <div className="space-y-2">
                      {question.options.map((option, index) => (
                        <label key={index} className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="form-radio text-blue-600"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      className="w-full p-2 border rounded-md"
                      rows="3"
                      placeholder="Enter your answer..."
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-center mt-6">
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg 
                  hover:bg-blue-700 transition-all duration-200"
                >
                  Submit Test
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Test Complete!</h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  Your Score: {score.toFixed(1)}%
                </p>
                <p className="mt-2 text-gray-600">
                  {score >= 70 ? 'Great job!' : 'Keep practicing!'}
                </p>
              </div>
              <button
                onClick={() => navigate('/studyplan')}
                className="mt-6 bg-gray-600 text-white px-6 py-2 rounded-lg 
                hover:bg-gray-700 transition-all duration-200"
              >
                Back to Study Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Test; 