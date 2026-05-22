import React, { useState, useEffect, useMemo } from 'react';
import { quiz } from '../services/api';
import { diagnostic } from '../services/diagnosticApi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const Dashboard = () => {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizData();
  }, []);

  const fetchQuizData = async () => {
    try {
      const reportRes = await diagnostic.getReport();
      const { report, subjects, profile } = reportRes.data.data;
      setQuizData({
        currentCGPA: profile.currentCgpaOrPercentage / 10,
        education: profile.educationLevel,
        studyStyle: report.preferredLearningStyle,
        subjects: subjects.reduce((acc, s) => {
          acc[s.subjectSlug] = {
            marks: s.currentMarks,
            attendance: 85,
            interest: 7,
          };
          return acc;
        }, {}),
        _diagnosticReport: report,
      });
      setLoading(false);
    } catch (diagErr) {
      try {
        const response = await quiz.getAnswers();
        setQuizData(response.data);
        setLoading(false);
      } catch (err) {
        console.log('No diagnostic or quiz data available');
        setError('Please complete the diagnostic assessment to view your dashboard');
        setLoading(false);
      }
    }
  };

  // Helper function to determine if a subject is at risk and its severity
  const getRiskLevel = (marks, attendance) => {
    if (marks < 45 || attendance < 60) {
      return 'high';
    } else if (marks < 60 || attendance < 75) {
      return 'moderate';
    }
    return 'good';
  };

  const atRiskSubjects = useMemo(() => {
    return quizData?.subjects ? Object.entries(quizData.subjects)
      .filter(([_, subject]) => getRiskLevel(subject.marks, subject.attendance) !== 'good')
      .map(([subject, data]) => ({
        name: subject,
        marks: data.marks,
        attendance: data.attendance,
        riskLevel: getRiskLevel(data.marks, data.attendance)
      })) : [];
  }, [quizData]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading your academic insights...</div>
        </div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">📊</div>
          <h2>Welcome to Your Dashboard</h2>
          <p>{error || 'Please complete the quiz to view your dashboard'}</p>
          <a href="/diagnostic" className="take-quiz-btn">
            Start Diagnostic Assessment
          </a>
        </div>
      </div>
    );
  }

  // Prepare data for charts with enhanced colors
  const subjectPerformanceData = {
    labels: Object.keys(quizData.subjects || {}),
    datasets: [
      {
        label: 'Marks',
        data: Object.values(quizData.subjects || {}).map(subject => subject.marks),
        borderColor: Object.values(quizData.subjects || {}).map(subject => {
          const riskLevel = getRiskLevel(subject.marks, subject.attendance);
          return riskLevel === 'high' ? '#dc2626' : 
                 riskLevel === 'moderate' ? '#f97316' : 
                 '#22c55e';
        }),
        backgroundColor: Object.values(quizData.subjects || {}).map(subject => {
          const riskLevel = getRiskLevel(subject.marks, subject.attendance);
          return riskLevel === 'high' ? 'rgba(220, 38, 38, 0.2)' : 
                 riskLevel === 'moderate' ? 'rgba(249, 115, 22, 0.2)' : 
                 'rgba(34, 197, 94, 0.2)';
        }),
      },
    ],
  };

  const subjectInterestData = {
    labels: Object.keys(quizData.subjects || {}),
    datasets: [
      {
        label: 'Attendance',
        data: Object.values(quizData.subjects || {}).map(subject => subject.attendance),
        borderColor: Object.values(quizData.subjects || {}).map(subject => {
          const riskLevel = getRiskLevel(subject.marks, subject.attendance);
          return riskLevel === 'high' ? '#dc2626' : 
                 riskLevel === 'moderate' ? '#f97316' : 
                 '#22c55e';
        }),
        backgroundColor: Object.values(quizData.subjects || {}).map(subject => {
          const riskLevel = getRiskLevel(subject.marks, subject.attendance);
          return riskLevel === 'high' ? 'rgba(220, 38, 38, 0.2)' : 
                 riskLevel === 'moderate' ? 'rgba(249, 115, 22, 0.2)' : 
                 'rgba(34, 197, 94, 0.2)';
        }),
      },
    ],
  };

  const cgpaComparisonData = {
    labels: ['Current CGPA', 'Target CGPA'],
    datasets: [
      {
        label: 'CGPA Comparison',
        data: [quizData.currentCGPA || 0, quizData.goal || 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
      },
    ],
  };

  // New data for performance comparison
  const performanceComparisonData = {
    labels: Object.keys(quizData.subjects || {}),
    datasets: [
      {
        label: 'Your Performance',
        data: Object.values(quizData.subjects || {}).map(subject => subject.marks),
        backgroundColor: Object.values(quizData.subjects || {}).map(subject => 
          getRiskLevel(subject.marks, subject.attendance) === 'high' || getRiskLevel(subject.marks, subject.attendance) === 'moderate'
            ? 'rgba(220, 38, 38, 0.8)'
            : 'rgba(34, 197, 94, 0.8)'
        ),
        borderColor: Object.values(quizData.subjects || {}).map(subject => 
          getRiskLevel(subject.marks, subject.attendance) === 'high' || getRiskLevel(subject.marks, subject.attendance) === 'moderate'
            ? 'rgb(220, 38, 38)'
            : 'rgb(34, 197, 94)'
        ),
        borderWidth: 1,
      },
      {
        label: 'Best Possible Score',
        data: Object.values(quizData.subjects || {}).map(() => 100),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Your Academic Dashboard</h1>
            <p>Track your progress and unlock your potential</p>
          </div>
          <button
            onClick={() => navigate('/prediction')}
            className="prediction-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="prediction-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            See Predictions
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {atRiskSubjects.length > 0 && (
          <div className="risk-alert">
            <h3>Subjects Requiring Attention</h3>
            <div className="risk-grid">
              {atRiskSubjects.map((subject, index) => (
                <div 
                  key={index} 
                  className={`risk-card ${subject.riskLevel}-risk`}
                >
                  <div className="risk-card-header">
                    <span className="subject-name">{subject.name}</span>
                    <span className="risk-badge">
                      {subject.riskLevel === 'high' ? 'High Risk' : 'Moderate Risk'}
                    </span>
                  </div>
                  <div className="risk-card-stats">
                    <div className="stat-item">
                      <span className="stat-label">Marks</span>
                      <span className="stat-value">{subject.marks}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Attendance</span>
                      <span className="stat-value">{subject.attendance}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="charts-grid">
          <div className="chart-card cgpa-chart">
            <h2>CGPA Comparison</h2>
            <div className="chart-container">
              <Bar
                data={cgpaComparisonData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 10,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        boxWidth: 15,
                        padding: 15
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="chart-card interest-chart">
            <h2>Subject Interest Distribution</h2>
            <div className="chart-container">
              <Pie
                data={subjectInterestData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        boxWidth: 15,
                        padding: 15
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="chart-card performance-chart">
          <h2>Performance vs Best Possible Score</h2>
          <div className="chart-container large">
            <Bar
              data={performanceComparisonData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                      display: true,
                      text: 'Marks (%)',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      boxWidth: 15,
                      padding: 15
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="chart-card analysis-chart">
          <h2>Subject Performance Analysis</h2>
          <div className="chart-container large">
            <Line
              data={subjectPerformanceData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      boxWidth: 15,
                      padding: 15
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card study-style">
            <h3>Study Style</h3>
            <p>{quizData.studyStyle}</p>
            <div className="card-icon">📚</div>
          </div>
          <div className="summary-card career-aim">
            <h3>Career Aim</h3>
            <p>{quizData.aim}</p>
            <div className="card-icon">🎯</div>
          </div>
          <div className="summary-card cgpa-gap">
            <h3>CGPA Gap</h3>
            <p>{(quizData.goal - quizData.currentCGPA).toFixed(2)}</p>
            <div className="card-icon">📈</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 