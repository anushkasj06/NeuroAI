import React, { useState, useEffect } from 'react';
import { profile, quiz } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    profile: {
      collegeName: '',
      currentCGPA: '',
      hobbies: '',
      currentYear: '',
      branch: '',
      achievements: '',
      subjects: {
        ads: '',
        ds: '',
        am: '',
        java: '',
        dbms: ''
      }
    }
  });

  useEffect(() => {
    fetchProfile();
    fetchQuizData();
  }, []);

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile data...');
      const response = await profile.getProfile();
      console.log('Profile data response:', response.data);
      
      const userData = response.data.data.user;
      
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        profile: {
          collegeName: userData.profile?.collegeName || '',
          currentCGPA: userData.profile?.currentCGPA || '',
          hobbies: Array.isArray(userData.profile?.hobbies) 
            ? userData.profile?.hobbies.join(', ') 
            : userData.profile?.hobbies || '',
          currentYear: userData.profile?.currentYear || '',
          branch: userData.profile?.branch || '',
          achievements: Array.isArray(userData.profile?.achievements) 
            ? userData.profile?.achievements.join('\n') 
            : userData.profile?.achievements || '',
          subjects: {
            ads: userData.profile?.subjects?.ads || '',
            ds: userData.profile?.subjects?.ds || '',
            am: userData.profile?.subjects?.am || '',
            java: userData.profile?.subjects?.java || '',
            dbms: userData.profile?.subjects?.dbms || ''
          }
        }
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching profile:', err.response?.data || err.message || err);
      setError(err.response?.data?.message || 'Failed to load profile data');
      setLoading(false);
    }
  };

  const fetchQuizData = async () => {
    try {
      const response = await quiz.getAnswers();
      setQuizData(response.data);
    } catch (err) {
      console.log('No quiz data available');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent] || {},
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Format the data according to the backend expectations
      const dataToSubmit = {
        name: formData.name,
        profile: {
          collegeName: formData.profile.collegeName,
          currentCGPA: formData.profile.currentCGPA,
          currentYear: formData.profile.currentYear,
          branch: formData.profile.branch,
          hobbies: formData.profile.hobbies ? formData.profile.hobbies.split(',').map(hobby => hobby.trim()) : [],
          achievements: formData.profile.achievements ? formData.profile.achievements.split('\n').map(achievement => achievement.trim()).filter(a => a) : [],
          subjects: formData.profile.subjects
        }
      };
      
      console.log('Sending profile data to backend:', dataToSubmit);
      const response = await profile.updateProfile(dataToSubmit);
      console.log('Profile update response:', response);
      
      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        await fetchProfile(); // Refresh the profile data
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 shadow-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 transition-all duration-300">
      <div className="max-w-4xl mx-auto transform hover:scale-[1.01] transition-transform duration-300">
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden border border-white/20">
          {/* Header Section */}
          <div className="relative px-6 py-8 sm:px-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -inset-[100%] opacity-50">
                <div className="absolute top-0 -left-48 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-indigo-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-0 -right-48 w-96 h-96 bg-gradient-to-r from-indigo-400/30 to-purple-400/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
              </div>
            </div>

            <div className="relative flex flex-col sm:flex-row justify-between items-center">
              <h3 className="text-2xl leading-6 font-bold text-white mb-4 sm:mb-0 flex items-center">
                <span className="inline-block mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Student Profile
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="group px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-2 group-hover:rotate-12 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>
          
          <div className="px-4 py-6 sm:p-8">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded-r-lg animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-green-700 text-sm">{success}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-blue-600 animate-spin"></div>
                  <div className="absolute inset-0 h-16 w-16 rounded-full border-t-4 border-b-4 border-indigo-600 animate-spin" style={{ animationDirection: 'reverse', opacity: 0.7 }}></div>
                </div>
              </div>
            )}

            {/* Quiz Data Section */}
            {quizData && (
              <div className="bg-blue-50 rounded-xl p-6 mb-8">
                <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Quiz Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Current CGPA</h4>
                    <p className="text-2xl font-bold text-blue-900">{quizData.currentCGPA}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Target CGPA</h4>
                    <p className="text-2xl font-bold text-blue-900">{quizData.goal}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Study Style</h4>
                    <p className="text-lg text-blue-900 capitalize">{quizData.studyStyle}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Career Aim</h4>
                    <p className="text-lg text-blue-900 capitalize">{quizData.aim}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Subject Performance</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {Object.entries(quizData.subjects).map(([subject, data]) => (
                        <div key={subject} className="bg-white p-3 rounded-lg shadow-sm">
                          <p className="text-sm font-medium text-blue-900 capitalize">{subject}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-gray-600">Marks: {data.marks}%</p>
                            <p className="text-xs text-gray-600">Attendance: {data.attendance}%</p>
                            <p className="text-xs text-gray-600">Interest: {data.interest}/10</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Profile Form */}
            {!isEditing ? (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <h4 className="text-sm font-semibold text-blue-600">Name</h4>
                      <p className="mt-2 text-base text-gray-800">{formData.name || 'Not provided'}</p>
                    </div>
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <h4 className="text-sm font-semibold text-blue-600">Email</h4>
                      <p className="mt-2 text-base text-gray-800">{formData.email || 'Not provided'}</p>
                    </div>
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <h4 className="text-sm font-semibold text-blue-600">College Name</h4>
                      <p className="mt-2 text-base text-gray-800">{formData.profile?.collegeName || 'Not provided'}</p>
                    </div>
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <h4 className="text-sm font-semibold text-blue-600">Current CGPA</h4>
                      <p className="mt-2 text-base text-gray-800">
                        {formData.profile?.currentCGPA ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {formData.profile.currentCGPA} / 10
                          </span>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <h4 className="text-sm font-semibold text-blue-600">Current Year</h4>
                      <p className="mt-2 text-base text-gray-800">
                        {formData.profile?.currentYear 
                          ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {formData.profile?.currentYear}
                              {formData.profile?.currentYear === '1' ? 'st' : 
                               formData.profile?.currentYear === '2' ? 'nd' : 
                               formData.profile?.currentYear === '3' ? 'rd' : 'th'} Year
                            </span>
                          )
                          : 'Not provided'}
                      </p>
                    </div>
                    <div className="transform transition-all duration-300 hover:scale-105">
                      <h4 className="text-sm font-semibold text-blue-600">Branch</h4>
                      <p className="mt-2 text-base text-gray-800">{formData.profile?.branch || 'Not provided'}</p>
                    </div>
                    <div className="sm:col-span-2 transform transition-all duration-300 hover:scale-[1.02]">
                      <h4 className="text-sm font-semibold text-blue-600">Hobbies</h4>
                      <p className="mt-2 text-base text-gray-800">
                        {formData.profile?.hobbies ? (
                          <div className="flex flex-wrap gap-2">
                            {formData.profile.hobbies.split(',').map((hobby, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                                {hobby.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                    </div>
                    <div className="sm:col-span-2 transform transition-all duration-300 hover:scale-[1.02]">
                      <h4 className="text-sm font-semibold text-blue-600">Achievements</h4>
                      <div className="mt-2 text-base text-gray-800">
                        {formData.profile?.achievements ? (
                          <ul className="list-disc pl-5 space-y-1">
                            {formData.profile.achievements.split('\n').filter(a => a.trim()).map((achievement, index) => (
                              <li key={index} className="text-gray-800">{achievement.trim()}</li>
                            ))}
                          </ul>
                        ) : (
                          'Not provided'
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Subject Marks
                  </h3>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                      {[
                        { label: 'ADS', value: formData.profile?.subjects?.ads },
                        { label: 'DS', value: formData.profile?.subjects?.ds },
                        { label: 'AM', value: formData.profile?.subjects?.am },
                        { label: 'Java', value: formData.profile?.subjects?.java },
                        { label: 'DBMS', value: formData.profile?.subjects?.dbms }
                      ].map((subject, index) => (
                        <div key={index} className="transform transition-all duration-300 hover:scale-105">
                          <h4 className="text-sm font-semibold text-blue-600">{subject.label}</h4>
                          {subject.value ? (
                            <div className="mt-2 relative pt-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                    {subject.value}%
                                  </span>
                                </div>
                              </div>
                              <div className="overflow-hidden h-2 mt-2 text-xs flex rounded bg-gray-200">
                                <div 
                                  style={{ width: `${subject.value}%` }}
                                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                    parseInt(subject.value) >= 75 ? 'bg-green-500' : 
                                    parseInt(subject.value) >= 60 ? 'bg-blue-500' : 
                                    parseInt(subject.value) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-base text-gray-800">Not provided</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ''}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      disabled
                      className="block w-full rounded-lg border-gray-300 bg-gray-50 shadow-sm text-gray-500"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">College Name</label>
                    <input
                      type="text"
                      name="profile.collegeName"
                      value={formData.profile?.collegeName || ''}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Current CGPA</label>
                    <input
                      type="number"
                      name="profile.currentCGPA"
                      value={formData.profile?.currentCGPA || ''}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      max="10"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Current Year</label>
                    <select
                      name="profile.currentYear"
                      value={formData.profile?.currentYear || ''}
                      onChange={handleChange}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div className="group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Branch</label>
                    <input
                      type="text"
                      name="profile.branch"
                      value={formData.profile?.branch || ''}
                      onChange={handleChange}
                      placeholder="e.g., Computer Science, Electronics"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                  </div>

                  <div className="sm:col-span-2 group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Hobbies</label>
                    <input
                      type="text"
                      name="profile.hobbies"
                      value={formData.profile?.hobbies || ''}
                      onChange={handleChange}
                      placeholder="e.g., Reading, Gaming, Sports"
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                    <p className="mt-1 text-xs text-gray-500">Separate multiple hobbies with commas</p>
                  </div>

                  <div className="sm:col-span-2 group">
                    <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Achievements</label>
                    <textarea
                      name="profile.achievements"
                      value={formData.profile?.achievements || ''}
                      onChange={handleChange}
                      rows={3}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    />
                    <p className="mt-1 text-xs text-gray-500">Enter each achievement on a new line</p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Subject Marks
                  </h4>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">ADS</label>
                      <input
                        type="number"
                        name="profile.subjects.ads"
                        value={formData.profile?.subjects?.ads || ''}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">DS</label>
                      <input
                        type="number"
                        name="profile.subjects.ds"
                        value={formData.profile?.subjects?.ds || ''}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">AM</label>
                      <input
                        type="number"
                        name="profile.subjects.am"
                        value={formData.profile?.subjects?.am || ''}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">Java</label>
                      <input
                        type="number"
                        name="profile.subjects.java"
                        value={formData.profile?.subjects?.java || ''}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 mb-1 group-hover:text-blue-600 transition-colors duration-200">DBMS</label>
                      <input
                        type="number"
                        name="profile.subjects.dbms"
                        value={formData.profile?.subjects?.dbms || ''}
                        onChange={handleChange}
                        min="0"
                        max="100"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 