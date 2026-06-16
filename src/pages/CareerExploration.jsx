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
function PathwayCard({ pathway, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  return (
    <div className={`ce-pathway ${expanded ? 'ce-pathway--open' : ''}`}>
      <button className="ce-pathway__header" onClick={() => setExpanded(!expanded)}>
        <div className="ce-pathway__header-left">
          <span className="ce-pathway__badge">Path {index + 1}</span>
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
function CareerDetail({ career: c, pathways, qualification, onBack }) {
  const Icon = CAREER_ICONS[c.id] || CodeBracketIcon;
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

      <div className="ce-detail__skills-section">
        <h3 className="ce-section-title">Key Skills Required</h3>
        <div className="ce-detail__skills">
          {c.skills.map((s) => (
            <span key={s} className="ce-pill ce-pill--lg">{s}</span>
          ))}
        </div>
      </div>

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
          <PathwayCard key={i} pathway={pw} index={i} />
        ))}
      </div>
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
  const [detailLoading, setDetailLoading] = useState(false);

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
      const { data } = await career.getCareerPathways(c.id);
      setSelectedCareer(data.data.career);
      setPathways(data.data.pathways);
      setQualification(data.data.qualification);
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
              onBack={() => setSelectedCareer(null)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ce-page">
      <div className="ce-shell">
        {/* Header */}
        <div className="ce-header">
          <div>
            <div className="ce-eyebrow">
              <GlobeAltIcon className="h-3.5 w-3.5" /> Career Exploration
            </div>
            <h1 className="ce-title">Explore Careers</h1>
            <p className="ce-subtitle">
              Discover career paths tailored to your qualifications. Click any career to see multiple pathways to get there.
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
