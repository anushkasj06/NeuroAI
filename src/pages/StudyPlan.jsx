import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudyPlan.css';

const StudyPlan = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [completedTopics, setCompletedTopics] = useState({});
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  const subjects = [
    { id: 'ads', name: 'ADS (Advanced Data Structures)', color: 'from-purple-500 to-indigo-600' },
    { id: 'ds', name: 'DS (Data Structures)', color: 'from-blue-500 to-cyan-600' },
    { id: 'am', name: 'AM (Applied Mathematics)', color: 'from-green-500 to-emerald-600' },
    { id: 'java', name: 'Java Programming', color: 'from-amber-500 to-orange-600' },
    { id: 'dbms', name: 'DBMS (Database Management)', color: 'from-red-500 to-pink-600' }
  ];

  const roadmaps = {
    ads: [
      {
        week: 'Week 1-2',
        title: 'Advanced Tree Structures',
        topics: [
          { name: 'AVL Trees', difficulty: 'Hard', estimatedTime: '4 hours' },
          { name: 'Red-Black Trees', difficulty: 'Hard', estimatedTime: '4 hours' },
          { name: 'B-Trees', difficulty: 'Medium', estimatedTime: '3 hours' },
          { name: 'Tree Balancing Techniques', difficulty: 'Hard', estimatedTime: '3 hours' }
        ],
        resources: ['Video Lectures', 'Practice Problems', 'Visualization Tools']
      },
      {
        week: 'Week 3-4',
        title: 'Graph Algorithms',
        topics: [
          { name: 'DFS Implementation', difficulty: 'Medium', estimatedTime: '3 hours' },
          { name: 'BFS Applications', difficulty: 'Medium', estimatedTime: '3 hours' },
          { name: 'Shortest Path Algorithms', difficulty: 'Hard', estimatedTime: '4 hours' },
          { name: 'Minimum Spanning Trees', difficulty: 'Hard', estimatedTime: '4 hours' }
        ],
        resources: ['Interactive Tutorials', 'Coding Exercises', 'Real-world Applications']
      }
    ],
    ds: [
      {
        week: 'Week 1-2',
        title: 'Linear Data Structures',
        topics: [
          { name: 'Arrays and Strings', difficulty: 'Easy', estimatedTime: '3 hours' },
          { name: 'Linked Lists', difficulty: 'Medium', estimatedTime: '4 hours' },
          { name: 'Stacks', difficulty: 'Medium', estimatedTime: '3 hours' },
          { name: 'Queues', difficulty: 'Medium', estimatedTime: '3 hours' }
        ],
        resources: ['Practice Problems', 'Implementation Exercises', 'Visualization Tools']
      }
    ],
    // Add similar structures for other subjects
  };

  const handleTopicCompletion = (subjectId, weekIndex, topicIndex) => {
    setCompletedTopics(prev => ({
      ...prev,
      [`${subjectId}-${weekIndex}-${topicIndex}`]: !prev[`${subjectId}-${weekIndex}-${topicIndex}`]
    }));
  };

  const handleTakeTest = (topicName) => {
    navigate('/test', {
      state: {
        topicName: topicName,
        subject: selectedSubject
      }
    });
  };

  const getSubjectColor = () => {
    const subject = subjects.find(s => s.id === selectedSubject);
    return subject ? subject.color : 'from-blue-500 to-indigo-600';
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className={`bg-gradient-to-r ${getSubjectColor()} px-6 py-8 sm:px-8`}>
            <h1 className="text-3xl font-extrabold text-white mb-2">Interactive Learning Journey</h1>
            <p className="text-white/80 text-lg">Select a subject to explore your personalized learning path</p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Choose Your Subject
              </label>
              <select
                id="subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm"
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedSubject && roadmaps[selectedSubject] && (
              <>
                <div className="flex justify-center mb-8">
                  <button
                    onClick={() => setShowRoadmapModal(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg 
                    hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2
                    shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <svg 
                      className="w-5 h-5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    Visualize Complete Roadmap
                  </button>
                </div>

                {showRoadmapModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="relative bg-white rounded-xl max-w-7xl max-h-[90vh] overflow-auto shadow-2xl">
                      <button
                        onClick={() => setShowRoadmapModal(false)}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-white rounded-full p-1 shadow-md"
                      >
                        <svg 
                          className="w-6 h-6" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                      <div className="p-8">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Complete DSA Roadmap</h2>
                        <img 
                          src="/roadmap-image.png" 
                          alt="DSA Roadmap" 
                          className="w-full h-auto rounded-lg shadow-md"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {roadmaps[selectedSubject].map((section, weekIndex) => (
                    <div key={weekIndex} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
                      <div className={`bg-gradient-to-r ${getSubjectColor()} px-6 py-4`}>
                        <h2 className="text-xl font-bold text-white">{section.week}</h2>
                        <h3 className="text-lg text-white/90">{section.title}</h3>
                      </div>

                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {section.topics.map((topic, topicIndex) => (
                            <div 
                              key={topicIndex} 
                              className={`bg-white rounded-lg shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-300 ${
                                completedTopics[`${selectedSubject}-${weekIndex}-${topicIndex}`] ? 'bg-green-50 border-green-100' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="text-lg font-semibold text-gray-800">{topic.name}</h4>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(topic.difficulty)}`}>
                                  {topic.difficulty}
                                </span>
                              </div>

                              <div className="flex items-center text-sm text-gray-600 mb-4">
                                <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                Estimated Time: {topic.estimatedTime}
                              </div>
                              
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                <label className="flex items-center cursor-pointer">
                                  <div className="relative">
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={completedTopics[`${selectedSubject}-${weekIndex}-${topicIndex}`] || false}
                                      onChange={() => handleTopicCompletion(selectedSubject, weekIndex, topicIndex)}
                                    />
                                    <div className={`block w-10 h-6 rounded-full ${completedTopics[`${selectedSubject}-${weekIndex}-${topicIndex}`] ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${completedTopics[`${selectedSubject}-${weekIndex}-${topicIndex}`] ? 'transform translate-x-4' : ''}`}></div>
                                  </div>
                                  <span className="ml-2 text-sm text-gray-700">Mark as Complete</span>
                                </label>
                                
                                <button 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg 
                                  hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2
                                  shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                                  onClick={() => handleTakeTest(topic.name)}
                                >
                                  <svg 
                                    className="w-4 h-4" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth="2" 
                                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                  </svg>
                                  Take Test
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                            </svg>
                            Learning Resources
                          </h4>
                          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {section.resources.map((resource, index) => (
                              <li key={index} className="flex items-center text-sm text-gray-600">
                                <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                {resource}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyPlan;