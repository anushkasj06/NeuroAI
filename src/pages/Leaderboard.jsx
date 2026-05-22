import React, { useState, useEffect } from 'react';
import { leaderboard } from '../services/api';
import './Leaderboard.css';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState('all');

  useEffect(() => {
    // Use hardcoded data instead of API call
    const fetchLeaderboardData = () => {
      try {
        setLoading(true);
        setError(null);
        
        // Hardcoded sample data
        const sampleData = [
          {
            _id: '1',
            userName: 'kiran',
            subject: 'ads',
            totalScore: 95,
            correctAnswers: 19,
            totalQuestions: 20,
            date: new Date('2025-04-10').toISOString()
          },
          {
            _id: '2',
            userName: 'Anushka',
            subject: 'ds',
            totalScore: 90,
            correctAnswers: 18,
            totalQuestions: 20,
            date: new Date('2025-04-09').toISOString()
          },
          {
            _id: '3',
            userName: 'Om',
            subject: 'java',
            totalScore: 85,
            correctAnswers: 17,
            totalQuestions: 20,
            date: new Date('2025-04-08').toISOString()
          },
          {
            _id: '4',
            userName: 'Kiran',
            subject: 'dbms',
            totalScore: 80,
            correctAnswers: 16,
            totalQuestions: 20,
            date: new Date('2025-04-07').toISOString()
          },
          {
            _id: '5',
            userName: 'Yash',
            subject: 'am',
            totalScore: 45,
            correctAnswers: 9,
            totalQuestions: 20,
            date: new Date('2025-04-06').toISOString()
          },
          {
            _id: '6',
            userName: 'Anushka',
            subject: 'ads',
            totalScore: 88,
            correctAnswers: 17,
            totalQuestions: 20,
            date: new Date('2025-04-05').toISOString()
          },
          {
            _id: '7',
            userName: 'Om',
            subject: 'ds',
            totalScore: 92,
            correctAnswers: 18,
            totalQuestions: 20,
            date: new Date('2025-04-04').toISOString()
          },
          {
            _id: '8',
            userName: 'Kiran',
            subject: 'java',
            totalScore: 35,
            correctAnswers: 7,
            totalQuestions: 20,
            date: new Date('2025-04-03').toISOString()
          },
          {
            _id: '9',
            userName: 'Yash',
            subject: 'dbms',
            totalScore: 82,
            correctAnswers: 16,
            totalQuestions: 20,
            date: new Date('2025-04-02').toISOString()
          },
          {
            _id: '10',
            userName: 'Anushka',
            subject: 'am',
            totalScore: 30,
            correctAnswers: 6,
            totalQuestions: 20,
            date: new Date('2025-04-01').toISOString()
          },
          {
            _id: '11',
            userName: 'Om',
            subject: 'ads',
            totalScore: 85,
            correctAnswers: 17,
            totalQuestions: 20,
            date: new Date('2025-03-31').toISOString()
          },
          {
            _id: '12',
            userName: 'Kiran',
            subject: 'ds',
            totalScore: 40,
            correctAnswers: 8,
            totalQuestions: 20,
            date: new Date('2025-03-30').toISOString()
          }
        ];
        
        // Filter by subject if not 'all'
        const filteredData = selectedSubject === 'all' 
          ? sampleData 
          : sampleData.filter(entry => entry.subject === selectedSubject);
        
        // Sort data from highest to lowest score
        const sortedData = [...filteredData].sort((a, b) => b.totalScore - a.totalScore);
        
        setLeaderboardData(sortedData);
      } catch (err) {
        console.error('Error with leaderboard data:', err);
        setError('Failed to load leaderboard data.');
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [selectedSubject]);

  const subjects = [
    { value: 'all', label: 'All Subjects' },
    { value: 'ads', label: 'ADS' },
    { value: 'ds', label: 'DS' },
    { value: 'am', label: 'AM' },
    { value: 'java', label: 'Java' },
    { value: 'dbms', label: 'DBMS' }
  ];

  const getRankBadgeColor = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 shadow-md';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md';
      default:
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 font-bold';
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSubjectColor = (subject) => {
    switch (subject.toLowerCase()) {
      case 'ads': return 'bg-purple-100 text-purple-800';
      case 'ds': return 'bg-blue-100 text-blue-800';
      case 'am': return 'bg-red-100 text-red-800';
      case 'java': return 'bg-yellow-100 text-yellow-800';
      case 'dbms': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 sm:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <h1 className="text-3xl font-extrabold text-white mb-4 md:mb-0">Leaderboard</h1>
              <div className="relative">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="appearance-none bg-white text-gray-700 py-2 pl-4 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                >
                  {subjects.map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="mt-4 text-lg text-gray-600">Loading leaderboard data...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-red-100 rounded-full p-3 mb-4">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xl font-medium text-gray-900 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="bg-gray-100 rounded-full p-3 mb-4">
                <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xl font-medium text-gray-900 mb-4">No quiz data available yet.</p>
              <button 
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subject
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Correct Answers
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Questions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboardData.map((entry, index) => (
                    <tr key={entry._id || index} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center justify-center h-10 w-10 rounded-full ${getRankBadgeColor(index + 1)}`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-medium">{entry.userName.charAt(0)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{entry.userName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSubjectColor(entry.subject)}`}>
                          {entry.subject.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div 
                              className={`h-2.5 rounded-full ${
                                entry.totalScore >= 90 ? 'bg-green-500' : 
                                entry.totalScore >= 80 ? 'bg-green-400' : 
                                entry.totalScore >= 70 ? 'bg-yellow-500' : 
                                entry.totalScore >= 60 ? 'bg-yellow-400' : 
                                entry.totalScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                              }`} 
                              style={{ width: `${entry.totalScore}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${getScoreColor(entry.totalScore)}`}>
                            {entry.totalScore}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.correctAnswers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.totalQuestions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 