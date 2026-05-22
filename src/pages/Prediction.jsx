import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { quiz } from '../services/api';

const Prediction = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);



  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        // Get student data from context or local storage
        //fetching user quiz answers
        const response = await quiz.getAnswers();
        const userData = response.data;
        // console.log(userData);

        // console.log("userData");
        // console.log("User Data Details:");
        // console.log("------------------");
        // console.log("Basic Information:");
        // console.log("User ID:", userData.userId);
        // console.log("Current CGPA:", userData.currentCGPA);
        // console.log("Education Level:", userData.education);
        // console.log("Study Style:", userData.studyStyle);
        // console.log("Parent Education:", userData.parentEducation);
        // console.log("Screen Time:", userData.screenTime);
        // console.log("Sleep Time:", userData.sleepTime);
        // console.log("Achievements:", userData.achievements);
        // console.log("Aim:", userData.aim);
        // console.log("Goal CGPA:", userData.goal);
        // console.log("Hobbies:", userData.hobbies);
        // console.log("Created At:", userData.createdAt);

        // console.log("\nADS Subject Details:");
        // console.log("Marks:", userData.subjects.ads.marks);
        // console.log("Attendance:", userData.subjects.ads.attendance);
        // console.log("Interest:", userData.subjects.ads.interest);
        // console.log("Assignments:", userData.subjects.ads.assignments);
        // console.log("Quizzes:", userData.subjects.ads.quizzes);
        // console.log("Participation:", userData.subjects.ads.participation);

        // console.log("\nDS Subject Details:");
        // console.log("Marks:", userData.subjects.ds.marks);
        // console.log("Attendance:", userData.subjects.ds.attendance);
        // console.log("Interest:", userData.subjects.ds.interest);
        // console.log("Assignments:", userData.subjects.ds.assignments);
        // console.log("Quizzes:", userData.subjects.ds.quizzes);
        // console.log("Participation:", userData.subjects.ds.participation);

        // console.log("\nAM Subject Details:");
        // console.log("Marks:", userData.subjects.am.marks);
        // console.log("Attendance:", userData.subjects.am.attendance);
        // console.log("Interest:", userData.subjects.am.interest);
        // console.log("Assignments:", userData.subjects.am.assignments);
        // console.log("Quizzes:", userData.subjects.am.quizzes);
        // console.log("Participation:", userData.subjects.am.participation);

        // console.log("\nJava Subject Details:");
        // console.log("Marks:", userData.subjects.java.marks);
        // console.log("Attendance:", userData.subjects.java.attendance);
        // console.log("Interest:", userData.subjects.java.interest);
        // console.log("Assignments:", userData.subjects.java.assignments);
        // console.log("Quizzes:", userData.subjects.java.quizzes);
        // console.log("Participation:", userData.subjects.java.participation);

        // console.log("\nDBMS Subject Details:");
        // console.log("Marks:", userData.subjects.dbms.marks);
        // console.log("Attendance:", userData.subjects.dbms.attendance);
        // console.log("Interest:", userData.subjects.dbms.interest);
        // console.log("Assignments:", userData.subjects.dbms.assignments);
        // console.log("Quizzes:", userData.subjects.dbms.quizzes);
        // console.log("Participation:", userData.subjects.dbms.participation);

        const studentData = {
          // Basic features in exact order from training data
          current_cgpa: userData.currentCGPA,
          education_level: userData.education,
          study_style: userData.studyStyle,
          parent_education: userData.parentEducation,
          screen_time: userData.screenTime,
          sleep_time: userData.sleepTime,
          // overall_attendance: userData.attendance,
          // overall_interest: userData.interest,
          // overall_performance: userData.performance,

          // ADS features in exact order
          ads_marks: userData.subjects.ads.marks,
          ads_attendance: userData.subjects.ads.attendance,
          ads_interest: userData.subjects.ads.interest,
          ads_assignments: userData.subjects.ads.assignments,
          ads_quizzes: userData.subjects.ads.quizzes,
          ads_participation: userData.subjects.ads.participation,

          // DS features in exact order
          ds_marks: userData.subjects.ds.marks,
          ds_attendance: userData.subjects.ds.attendance,
          ds_interest: userData.subjects.ds.interest,
          ds_assignments: userData.subjects.ds.assignments,
          ds_quizzes: userData.subjects.ds.quizzes,
          ds_participation: userData.subjects.ds.participation,

          // AM features in exact order
          am_marks: userData.subjects.am.marks,
          am_attendance: userData.subjects.am.attendance,
          am_interest: userData.subjects.am.interest,
          am_assignments: userData.subjects.am.assignments,
          am_quizzes: userData.subjects.am.quizzes,
          am_participation: userData.subjects.am.participation,

          // Java features in exact order
          java_marks: userData.subjects.java.marks,
          java_attendance: userData.subjects.java.attendance,
          java_interest: userData.subjects.java.interest,
          java_assignments: userData.subjects.java.assignments,
          java_quizzes: userData.subjects.java.quizzes,
          java_participation: userData.subjects.java.participation,

          // DBMS features in exact order
          dbms_marks: userData.subjects.dbms.marks,
          dbms_attendance: userData.subjects.dbms.attendance,
          dbms_interest: userData.subjects.dbms.interest,
          dbms_assignments: userData.subjects.dbms.assignments,
          dbms_quizzes: userData.subjects.dbms.quizzes,
          dbms_participation: userData.subjects.dbms.participation,
        };

        // console.log("studentData");
        // console.log(studentData);

        // Log the feature names in order
        // console.log('Feature names in order:');
        // Object.keys(studentData).forEach((key, index) => {
        //   console.log(`${index + 1}. ${key}`);
        // });

        // Log the data types
        // console.log('\nData types:');
        // Object.entries(studentData).forEach(([key, value]) => {
        //   console.log(`${key}: ${typeof value} (${value})`);
        // });

        // Log the request data for debugging
        // console.log('\nSending request with data:', JSON.stringify(studentData, null, 2));

        try {
          // console.log('\nMaking API request...');
          const response = await axios.post('http://localhost:5001/api/predict', studentData, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          // console.log('\nAPI Response:', response.data);
          setPredictions(response.data.predictions);
          setError(null);
        } catch (error) {
          console.error('\nError details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers
          });
          setError(error.response?.data?.error || 'Failed to fetch predictions');
        } finally {
          setLoading(false);
        }
      } catch (err) {
        setError('Error fetching predictions: ' + err.message);
        fetchPredictions();
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [currentUser]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-600 font-medium animate-pulse">Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Error Loading Predictions</h3>
              <p className="mt-1 text-sm text-gray-600">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-2 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end mb-8">
          <button
            onClick={() => navigate('/study-plan/generate')}
            className="group flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold px-6 py-3 rounded-xl 
            hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl 
            transform hover:scale-[1.02] active:scale-95"
          >
            <svg
              className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Get Study Plan
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
              Performance Predictions
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Based on your past performance, attendance, and interest levels, here are your predicted scores for upcoming assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {predictions.map((pred, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-100"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">{pred.subject}</h3>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                    parseInt(pred.improvement) > 0 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {pred.improvement}%
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Score:</span>
                    <span className="font-medium text-gray-800">{pred.currentScore}%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Predicted Score:</span>
                    <span className="font-medium text-blue-600">{pred.predictedScore}%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Confidence:</span>
                    <span className="font-medium text-purple-600">{pred.confidence}</span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedRecommendation({ subject: pred.subject, recommendations: pred.recommendations })}
                      className="w-full bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 hover:from-blue-100 hover:to-purple-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      View Recommendations
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Factors Considered in Prediction</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <li className="flex items-center space-x-3 text-gray-700">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Previous quiz marks</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-700">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Attendance percentage</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-700">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Subject interest level</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-700">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Overall performance trend</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Recommendations Modal */}
        {selectedRecommendation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl transform hover:scale-[1.01] transition-all duration-300">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-semibold text-gray-800">
                    {selectedRecommendation.subject} Recommendations
                  </h3>
                  <button
                    onClick={() => setSelectedRecommendation(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div
                  className="prose prose-blue max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedRecommendation.recommendations }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export default Prediction; 
