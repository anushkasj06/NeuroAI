import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  CommandLineIcon,
  ChartBarIcon,
  CpuChipIcon,
  PaintBrushIcon,
  CodeBracketIcon,
  ServerIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  CloudIcon,
  LinkIcon,
  PresentationChartLineIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  XMarkIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import { career } from '../services/api';
import './CareerExploration.css';

// Map career IDs to Heroicons
const CAREER_ICONS = {
  'software-engineer': CommandLineIcon,
  'data-scientist': ChartBarIcon,
  'ml-engineer': CpuChipIcon,
  'frontend-developer': PaintBrushIcon,
  'backend-developer': ServerIcon,
  'devops-engineer': ArrowPathIcon,
  'cybersecurity-analyst': ShieldCheckIcon,
  'product-manager': ClipboardDocumentListIcon,
  'ui-ux-designer': SparklesIcon,
  'cloud-architect': CloudIcon,
  'blockchain-developer': LinkIcon,
  'data-analyst': PresentationChartLineIcon,
};

// ─── Qualification Modal ───────────────────────────────────────────────────
function QualificationModal({ onSave, onSkip }) {
  const [form, setForm] = useState({
    educationLevel: '',
    college: '',
    branch: '',
    year: '',
    skills: '',
    interests: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      educationLevel: form.educationLevel || undefined,
      college: form.college || undefined,
      branch: form.branch || undefined,
      year: form.year ? parseInt(form.year) : undefined,
      skills: form.skills ? form.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      interests: form.interests ? form.interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    onSave(data);
  };

  return (
    <div className="ce-modal-overlay">
      <div className="ce-modal">
        <div className="ce-modal__header">
          <AcademicCapIcon className="h-6 w-6" />
          <h2 className="ce-modal__title">Tell us about yourself</h2>
          <p className="ce-modal__subtitle">Help us personalize career pathways based on your background</p>
        </div>
        <form className="ce-modal__form" onSubmit={handleSubmit}>
          <div className="ce-modal__row">
            <div className="ce-modal__field">
              <label>Education Level</label>
              <select value={form.educationLevel} onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}>
                <option value="">Select...</option>
                <option value="10th_standard">10th Standard</option>
                <option value="12th_standard">12th Standard</option>
                <option value="computer_engineering_fe">Engineering FE (1st Year)</option>
                <option value="computer_engineering_se">Engineering SE (2nd Year)</option>
                <option value="computer_engineering_te">Engineering TE (3rd Year)</option>
                <option value="computer_engineering_be">Engineering BE (4th Year)</option>
                <option value="graduate">Graduate</option>
                <option value="postgraduate">Post Graduate</option>
              </select>
            </div>
            <div className="ce-modal__field">
              <label>Branch / Stream</label>
              <input
                type="text"
                placeholder="e.g. Computer Engineering"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
              />
            </div>
          </div>
          <div className="ce-modal__row">
            <div className="ce-modal__field">
              <label>College / School</label>
              <input
                type="text"
                placeholder="e.g. MIT Pune"
                value={form.college}
                onChange={(e) => setForm({ ...form, college: e.target.value })}
              />
            </div>
            <div className="ce-modal__field">
              <label>Current Year</label>
              <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
                <option value="">Select...</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>
          <div className="ce-modal__field">
            <label>Skills (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Python, React, SQL, Machine Learning"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
            />
          </div>
          <div className="ce-modal__field">
            <label>Interests (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. AI, Web Development, Data Science"
              value={form.interests}
              onChange={(e) => setForm({ ...form, interests: e.target.value })}
            />
          </div>
          <div className="ce-modal__actions">
            <button type="button" className="ce-modal__btn ce-modal__btn--ghost" onClick={onSkip}>
              Skip for now
            </button>
            <button type="submit" className="ce-modal__btn ce-modal__btn--primary">
              <CheckCircleIcon className="h-4 w-4" />
              Save & Explore
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Visual Skill Roadmap (inspired by roadmap.sh) ─────────────────────────
function SkillRoadmap({ roadmap }) {
  if (!roadmap) return null;

  return (
    <div className="ce-roadmap">
      <div className="ce-roadmap__header">
        <MapIcon className="h-5 w-5" />
        <h3 className="ce-roadmap__title">{roadmap.title}</h3>
      </div>
      <div className="ce-roadmap__track">
        {/* Central line */}
        <div className="ce-roadmap__spine" />

        {roadmap.levels.map((level, li) => (
          <div key={li} className="ce-roadmap__level" style={{ '--level-color': level.color }}>
            {/* Level label on the spine */}
            <div className="ce-roadmap__level-label" style={{ background: level.color }}>
              {level.label}
            </div>

            {/* Nodes branching out */}
            <div className="ce-roadmap__nodes">
              {level.nodes.map((node) => (
                <div key={node.id} className={`ce-roadmap__node ${node.children ? 'ce-roadmap__node--parent' : 'ce-roadmap__node--leaf'}`}>
                  <span className="ce-roadmap__node-name">{node.name}</span>
                  {node.children && (
                    <div className="ce-roadmap__children">
                      {node.children.map((childId) => {
                        const child = level.nodes.find((n) => n.id === childId);
                        return child ? (
                          <div key={childId} className="ce-roadmap__child">
                            <CheckCircleIcon className="h-3.5 w-3.5 ce-roadmap__check" />
                            <span>{child.name}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Career Card ───────────────────────────────────────────────────────────
function CareerCard({ career: c, onClick }) {
  const demandColor = c.demand === 'Very High' ? '#16a34a' : c.demand === 'High' ? '#0ea5e9' : '#d97706';
  const Icon = CAREER_ICONS[c.id] || CodeBracketIcon;
  return (
    <button className="ce-card" onClick={() => onClick(c)}>
      <div className="ce-card__icon">
        <Icon className="h-6 w-6" />
      </div>
      <div className="ce-card__body">
        <h3 className="ce-card__title">{c.title}</h3>
        <p className="ce-card__desc">{c.description}</p>
        <div className="ce-card__meta">
          <span className="ce-card__salary">{c.avgSalary}</span>
          <span className="ce-card__demand" style={{ color: demandColor }}>
            <span className="ce-demand-dot" style={{ background: demandColor }} />
            {c.demand} Demand
          </span>
        </div>
        <div className="ce-card__skills">
          {c.skills.slice(0, 4).map((s) => (
            <span key={s} className="ce-pill">{s}</span>
          ))}
          {c.skills.length > 4 && <span className="ce-pill ce-pill--more">+{c.skills.length - 4}</span>}
        </div>
      </div>
      <div className="ce-card__arrow">
        <ArrowRightIcon className="h-4 w-4" />
      </div>
    </button>
  );
}

// ─── Pathway Step ──────────────────────────────────────────────────────────
function PathwayStep({ step, index, total }) {
  return (
    <div className="ce-step">
      <div className="ce-step__timeline">
        <div className="ce-step__dot">{index + 1}</div>
        {index < total - 1 && <div className="ce-step__line" />}
      </div>
      <div className="ce-step__content">
        <h4 className="ce-step__title">{step.title}</h4>
        <p className="ce-step__desc">{step.desc}</p>
        {step.duration && (
          <span className="ce-step__duration">
            <ClockIcon className="h-3.5 w-3.5" />
            {step.duration}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Pathway Card ──────────────────────────────────────────────────────────
function PathwayCard({ pathway, index, suggested }) {
  const [expanded, setExpanded] = useState(index === 0 || suggested);
  return (
    <div className={`ce-pathway ${expanded ? 'ce-pathway--open' : ''} ${suggested ? 'ce-pathway--suggested' : ''}`}>
      <button className="ce-pathway__header" onClick={() => setExpanded(!expanded)}>
        <div className="ce-pathway__header-left">
          <span className="ce-pathway__badge">Path {index + 1}</span>
          {suggested && (
            <span className="ce-pathway__suggested-badge">
              <SparklesIcon className="h-3.5 w-3.5" />
              Suggested for you
            </span>
          )}
          <h3 className="ce-pathway__name">{pathway.name}</h3>
        </div>
        <div className="ce-pathway__header-right">
          <span className="ce-pathway__duration">
            <ClockIcon className="h-3.5 w-3.5" />
            {pathway.duration}
          </span>
          <ChevronDownIcon className={`h-4 w-4 ce-pathway__chevron ${expanded ? 'ce-pathway__chevron--up' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="ce-pathway__steps">
          {pathway.steps.map((step, i) => (
            <PathwayStep key={i} step={step} index={i} total={pathway.steps.length} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Career Detail View ────────────────────────────────────────────────────
function CareerDetail({ career: c, pathways, qualification, roadmap, suggestedIndex, onBack }) {
  const Icon = CAREER_ICONS[c.id] || CodeBracketIcon;
  const [activeTab, setActiveTab] = useState('pathways');

  return (
    <div className="ce-detail">
      <button className="ce-back-btn" onClick={onBack}>
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Careers
      </button>

      <div className="ce-detail__header">
        <span className="ce-detail__icon">
          <Icon className="h-8 w-8" />
        </span>
        <div>
          <h1 className="ce-detail__title">{c.title}</h1>
          <p className="ce-detail__desc">{c.description}</p>
        </div>
      </div>

      <div className="ce-detail__stats">
        <div className="ce-stat">
          <span className="ce-stat__label">Avg. Salary</span>
          <span className="ce-stat__value">{c.avgSalary}</span>
        </div>
        <div className="ce-stat">
          <span className="ce-stat__label">Growth</span>
          <span className="ce-stat__value">{c.growth}</span>
        </div>
        <div className="ce-stat">
          <span className="ce-stat__label">Demand</span>
          <span className="ce-stat__value">{c.demand}</span>
        </div>
        <div className="ce-stat">
          <span className="ce-stat__label">Category</span>
          <span className="ce-stat__value">{c.category}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="ce-detail__tabs">
        <button
          className={`ce-detail__tab ${activeTab === 'pathways' ? 'ce-detail__tab--active' : ''}`}
          onClick={() => setActiveTab('pathways')}
        >
          Pathways
        </button>
        <button
          className={`ce-detail__tab ${activeTab === 'roadmap' ? 'ce-detail__tab--active' : ''}`}
          onClick={() => setActiveTab('roadmap')}
        >
          <MapIcon className="h-4 w-4" />
          Skill Roadmap
        </button>
      </div>

      {activeTab === 'pathways' && (
        <>
          {qualification && (
            <div className="ce-detail__qual">
              <h3 className="ce-section-title">Your Current Profile</h3>
              <div className="ce-qual-grid">
                {qualification.college && (
                  <div className="ce-qual-item">
                    <span className="ce-qual-item__label">College</span>
                    <span className="ce-qual-item__value">{qualification.college}</span>
                  </div>
                )}
                {qualification.educationLevel && (
                  <div className="ce-qual-item">
                    <span className="ce-qual-item__label">Education</span>
                    <span className="ce-qual-item__value">{qualification.educationLevel.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {qualification.branch && (
                  <div className="ce-qual-item">
                    <span className="ce-qual-item__label">Branch</span>
                    <span className="ce-qual-item__value">{qualification.branch}</span>
                  </div>
                )}
                {qualification.year && (
                  <div className="ce-qual-item">
                    <span className="ce-qual-item__label">Year</span>
                    <span className="ce-qual-item__value">Year {qualification.year}</span>
                  </div>
                )}
                {qualification.cgpa && (
                  <div className="ce-qual-item">
                    <span className="ce-qual-item__label">CGPA</span>
                    <span className="ce-qual-item__value">{qualification.cgpa}</span>
                  </div>
                )}
                {qualification.skills && qualification.skills.length > 0 && (
                  <div className="ce-qual-item ce-qual-item--wide">
                    <span className="ce-qual-item__label">Your Skills</span>
                    <div className="ce-qual-item__skills">
                      {qualification.skills.slice(0, 8).map((s) => (
                        <span key={s} className="ce-pill ce-pill--sm">{s}</span>
                      ))}
                      {qualification.skills.length > 8 && <span className="ce-pill ce-pill--sm ce-pill--more">+{qualification.skills.length - 8}</span>}
                    </div>
                  </div>
                )}
                {qualification.interests && qualification.interests.length > 0 && (
                  <div className="ce-qual-item ce-qual-item--wide">
                    <span className="ce-qual-item__label">Interests</span>
                    <div className="ce-qual-item__skills">
                      {qualification.interests.map((s) => (
                        <span key={s} className="ce-pill ce-pill--sm">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="ce-detail__pathways">
            <h3 className="ce-section-title">
              Pathways to {c.title}
              <span className="ce-section-subtitle">Multiple routes based on your background</span>
            </h3>
            {pathways.map((pw, i) => (
              <PathwayCard key={i} pathway={pw} index={i} suggested={i === suggestedIndex} />
            ))}
          </div>
        </>
      )}

      {activeTab === 'roadmap' && (
        <SkillRoadmap roadmap={roadmap} />
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CareerExploration() {
  const [careers, setCareers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail view state
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [pathways, setPathways] = useState([]);
  const [qualification, setQualification] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [suggestedIndex, setSuggestedIndex] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // Qualification modal
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('ce_qualification_asked');
    if (!seen) {
      setShowModal(true);
    }
  }, []);

  const handleQualificationSave = async (data) => {
    try {
      await career.saveQualification(data);
    } catch (err) {
      // Non-critical — continue even if save fails
      console.error('Failed to save qualification:', err);
    }
    localStorage.setItem('ce_qualification_asked', '1');
    setShowModal(false);
  };

  const handleQualificationSkip = () => {
    localStorage.setItem('ce_qualification_asked', '1');
    setShowModal(false);
  };

  const fetchCareers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await career.explore(activeCategory === 'All' ? null : activeCategory);
      setCareers(data.data.careers);
      setCategories(data.data.categories);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load careers');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchCareers();
  }, [fetchCareers]);

  const handleCareerClick = async (c) => {
    try {
      setDetailLoading(true);
      const [pathRes, roadmapRes] = await Promise.all([
        career.getCareerPathways(c.id),
        career.getSkillRoadmap(c.id),
      ]);
      setSelectedCareer(pathRes.data.data.career);
      setPathways(pathRes.data.data.pathways);
      setQualification(pathRes.data.data.qualification);
      setSuggestedIndex(pathRes.data.data.suggestedPathwayIndex ?? 0);
      setRoadmap(roadmapRes.data.data.roadmap);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pathways');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredCareers = careers.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedCareer) {
    return (
      <div className="ce-page">
        <div className="ce-shell">
          {detailLoading ? (
            <div className="ce-loader">Loading pathways...</div>
          ) : (
            <CareerDetail
              career={selectedCareer}
              pathways={pathways}
              qualification={qualification}
              roadmap={roadmap}
              suggestedIndex={suggestedIndex}
              onBack={() => setSelectedCareer(null)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ce-page">
      {showModal && (
        <QualificationModal onSave={handleQualificationSave} onSkip={handleQualificationSkip} />
      )}
      <div className="ce-shell">
        {/* Header */}
        <div className="ce-header">
          <div>
            <div className="ce-eyebrow">
              <GlobeAltIcon className="h-3.5 w-3.5" /> Career Exploration
            </div>
            <h1 className="ce-title">Explore Careers</h1>
            <p className="ce-subtitle">
              Discover career paths tailored to your qualifications. Click any career to see multiple pathways and skill roadmaps.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="ce-controls">
          <div className="ce-search">
            <svg className="ce-search__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className="ce-search__input"
              placeholder="Search careers, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="ce-filters">
            <button
              className={`ce-filter-btn ${activeCategory === 'All' ? 'ce-filter-btn--active' : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`ce-filter-btn ${activeCategory === cat ? 'ce-filter-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <div className="ce-error">{error}</div>}

        {/* Loading */}
        {loading ? (
          <div className="ce-loader">Loading careers...</div>
        ) : (
          /* Career Grid */
          <div className="ce-grid">
            {filteredCareers.map((c) => (
              <CareerCard key={c.id} career={c} onClick={handleCareerClick} />
            ))}
            {filteredCareers.length === 0 && (
              <div className="ce-empty">No careers found matching your search.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
