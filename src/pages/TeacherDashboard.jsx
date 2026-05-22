import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage, teacher } from '../services/api';
import './TeacherDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend
);

const statusColors = {
  'On Track': '#16a34a',
  'At Risk': '#d97706',
  Struggling: '#dc2626',
};

const getFileType = (fileName = '') => {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (/\.(mp4|mov|webm|mkv)$/.test(name)) return 'video';
  return 'other';
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#334155',
        font: { family: 'Space Grotesk', size: 11, weight: 600 },
        boxWidth: 10,
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { family: 'Space Grotesk' } },
    },
    y: {
      beginAtZero: true,
      max: 100,
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
      ticks: { color: '#64748b', font: { family: 'Space Grotesk' } },
    },
  },
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingResource, setSavingResource] = useState(false);
  const [error, setError] = useState('');
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    targetGroup: 'At Risk students',
    file: null,
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await teacher.getDashboard();
      const payload = response.data.data;
      setDashboard(payload);
      setSelectedStudentId((current) => current || payload.students?.[0]?.id || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load teacher dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const students = dashboard?.students || [];
  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0];
  const summary = dashboard?.summary || {
    totalStudents: 0,
    statusCounts: { 'On Track': 0, 'At Risk': 0, Struggling: 0 },
    averageMastery: 0,
    averageBattleAccuracy: 0,
    interventionCount: 0,
  };

  const statusData = useMemo(
    () => ({
      labels: ['On Track', 'At Risk', 'Struggling'],
      datasets: [
        {
          data: [
            summary.statusCounts?.['On Track'] || 0,
            summary.statusCounts?.['At Risk'] || 0,
            summary.statusCounts?.Struggling || 0,
          ],
          backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
          borderWidth: 0,
        },
      ],
    }),
    [summary]
  );

  const masteryData = useMemo(
    () => ({
      labels: selectedStudent?.conceptMastery?.map((item) => item.subjectName) || [],
      datasets: [
        {
          label: 'Concept Mastery (%)',
          data: selectedStudent?.conceptMastery?.map((item) => item.score) || [],
          backgroundColor: 'rgba(14, 116, 144, 0.72)',
          borderColor: '#0e7490',
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [selectedStudent]
  );

  const quizHistoryData = useMemo(
    () => ({
      labels: selectedStudent?.quizHistory?.map((item, index) => `${item.type} ${index + 1}`) || [],
      datasets: [
        {
          label: 'Quiz / Battle Score',
          data: selectedStudent?.quizHistory?.map((item) => item.score) || [],
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.14)',
          pointRadius: 3,
          tension: 0.32,
        },
      ],
    }),
    [selectedStudent]
  );

  const attentionData = useMemo(
    () => ({
      labels: selectedStudent?.attention?.modalityScores?.map((item) => item.label) || [],
      datasets: [
        {
          label: 'Modality Score',
          data: selectedStudent?.attention?.modalityScores?.map((item) => item.score) || [],
          backgroundColor: ['#0e7490', '#7c3aed', '#ea580c'],
          borderRadius: 6,
        },
      ],
    }),
    [selectedStudent]
  );

  const submitResource = async (event) => {
    event.preventDefault();
    if (!resourceForm.file || !resourceForm.title.trim()) {
      setError('Add a title and choose a resource file.');
      return;
    }

    setSavingResource(true);
    setError('');
    try {
      await teacher.createResource({
        title: resourceForm.title.trim(),
        description: resourceForm.description.trim(),
        targetGroup: resourceForm.targetGroup,
        fileName: resourceForm.file.name,
        fileType: getFileType(resourceForm.file.name),
      });
      setResourceForm({
        title: '',
        description: '',
        targetGroup: 'At Risk students',
        file: null,
      });
      await loadDashboard();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save resource metadata'));
    } finally {
      setSavingResource(false);
    }
  };

  if (loading) {
    return (
      <div className="teacher-dashboard-page">
        <div className="teacher-loading">Loading teacher dashboard...</div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-page">
      <div className="teacher-dashboard">
        <header className="teacher-hero">
          <div>
            <p className="teacher-kicker">FR-TEACH</p>
            <h1>Teacher Dashboard</h1>
            <p>Class oversight, individual learning reports, risk prediction, and intervention workflow.</p>
          </div>
          <div className="teacher-actions">
            <div className="class-code-box">
              <span>Class Code</span>
              <strong>{user?.teacherCode || 'Pending'}</strong>
            </div>
            <button type="button" onClick={loadDashboard} className="teacher-refresh">
              Refresh
            </button>
          </div>
        </header>

        {error && <div className="teacher-error">{error}</div>}

        <section className="overview-band">
          <div className="overview-stat">
            <span>Enrolled</span>
            <strong>{summary.totalStudents}</strong>
          </div>
          <div className="overview-stat">
            <span>Class Mastery</span>
            <strong>{summary.averageMastery}%</strong>
          </div>
          <div className="overview-stat">
            <span>Battle Accuracy</span>
            <strong>{summary.averageBattleAccuracy}%</strong>
          </div>
          <div className="overview-stat urgent">
            <span>Alerts</span>
            <strong>{summary.interventionCount}</strong>
          </div>
          <div className="status-chart">
            <Doughnut data={statusData} options={{ responsive: true, maintainAspectRatio: false, cutout: '62%' }} />
          </div>
        </section>

        <main className="teacher-layout">
          <aside className="student-roster">
            <div className="section-head">
              <h2>Class Overview</h2>
              <span>{students.length} students</span>
            </div>
            <div className="roster-list">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`student-row ${selectedStudent?.id === student.id ? 'active' : ''}`}
                >
                  <span className={`status-dot ${student.status.toLowerCase().replace(/\s+/g, '-')}`} />
                  <span>
                    <strong>{student.name}</strong>
                    <small>{student.status} | {student.masteryAverage}% mastery</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="student-report">
            {selectedStudent ? (
              <>
                <div className="student-report-header">
                  <div>
                    <p className="teacher-kicker">Individual Report</p>
                    <h2>{selectedStudent.name}</h2>
                    <p>{selectedStudent.email}</p>
                  </div>
                  <span className={`status-pill ${selectedStudent.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {selectedStudent.status}
                  </span>
                </div>

                <div className="report-grid">
                  <div className="insight-panel">
                    <span>Learning Style</span>
                    <strong>{selectedStudent.preferredLearningStyle}</strong>
                    <p>{selectedStudent.recommendedTeachingApproach}</p>
                  </div>
                  <div className="insight-panel">
                    <span>Attention</span>
                    <strong>{selectedStudent.attention.attentionLevel}</strong>
                    <p>{selectedStudent.attention.engagementScore}% engagement | {selectedStudent.attention.focusReadiness}% focus readiness</p>
                  </div>
                  <div className="insight-panel">
                    <span>Weak Areas</span>
                    <strong>{selectedStudent.likelyWeakAreas.length || selectedStudent.conceptMastery.filter((item) => item.score < 55).length}</strong>
                    <p>{selectedStudent.likelyWeakAreas.slice(0, 3).join(', ') || 'Review low mastery subjects first.'}</p>
                  </div>
                </div>

                <div className="visual-grid">
                  <div className="viz-panel">
                    <h3>Concept Mastery Heatmap</h3>
                    <div className="heatmap">
                      {selectedStudent.conceptMastery.map((item) => (
                        <div key={item.subjectSlug} className={`heat-cell ${item.bucket}`}>
                          <span>{item.subjectName}</span>
                          <strong>{item.score}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="viz-panel">
                    <h3>Mastery by Subject</h3>
                    <div className="chart-box">
                      <Bar data={masteryData} options={chartOptions} />
                    </div>
                  </div>

                  <div className="viz-panel">
                    <h3>Quiz History</h3>
                    <div className="chart-box">
                      <Line data={quizHistoryData} options={chartOptions} />
                    </div>
                  </div>

                  <div className="viz-panel">
                    <h3>Attention Trends</h3>
                    <div className="chart-box">
                      <Bar data={attentionData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">No students available yet.</div>
            )}
          </section>
        </main>

        <section className="teacher-bottom-grid">
          <div className="risk-panel">
            <div className="section-head">
              <h2>Risk Prediction</h2>
              <span>{dashboard?.riskPredictions?.length || 0} flagged</span>
            </div>
            {(dashboard?.riskPredictions || []).length ? (
              dashboard.riskPredictions.map((risk) => (
                <div key={risk.studentId} className="risk-row">
                  <strong>{risk.studentName}</strong>
                  <span>{risk.prediction}</span>
                  <small>{risk.masteryAverage}% mastery</small>
                </div>
              ))
            ) : (
              <p className="quiet-copy">No declining mastery patterns detected.</p>
            )}
          </div>

          <div className="alert-panel">
            <div className="section-head">
              <h2>Intervention Alerts</h2>
              <span>{dashboard?.interventionAlerts?.length || 0} active</span>
            </div>
            {(dashboard?.interventionAlerts || []).slice(0, 5).map((alert) => (
              <div key={alert.studentId} className="alert-row">
                <strong>{alert.studentName}</strong>
                <span>{alert.status}</span>
                <p>{alert.reasons.join(' | ')}</p>
              </div>
            ))}
            {!dashboard?.interventionAlerts?.length && <p className="quiet-copy">No urgent interventions right now.</p>}
          </div>

          <div className="upload-panel">
            <div className="section-head">
              <h2>Content Upload</h2>
              <span>PDF / DOCX / Video</span>
            </div>
            <form onSubmit={submitResource} className="upload-form">
              <input
                value={resourceForm.title}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Resource title"
              />
              <textarea
                value={resourceForm.description}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Short note for students"
                rows="3"
              />
              <select
                value={resourceForm.targetGroup}
                onChange={(event) => setResourceForm((prev) => ({ ...prev, targetGroup: event.target.value }))}
              >
                <option>All students</option>
                <option>At Risk students</option>
                <option>Struggling students</option>
                <option>Visual learners</option>
                <option>Audio learners</option>
              </select>
              <input
                type="file"
                accept=".pdf,.docx,.mp4,.mov,.webm,.mkv"
                onChange={(event) => setResourceForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
              />
              <button type="submit" disabled={savingResource}>
                {savingResource ? 'Saving...' : 'Save Resource'}
              </button>
            </form>
            <div className="resource-list">
              {(dashboard?.resources || []).slice(0, 4).map((resource) => (
                <div key={resource._id} className="resource-row">
                  <strong>{resource.title}</strong>
                  <span>{resource.fileName}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
