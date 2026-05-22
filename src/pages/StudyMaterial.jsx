import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { content, getApiErrorMessage } from '../services/api';
import ContentRenderer from '../components/ContentRenderer';
import ConceptMapPanel from '../components/materials/ConceptMapPanel';
import './AIDashboard.css';
import './StudyMaterial.css';

const estimateReadMinutes = (item) => {
  const blockText = (item?.blocks || [])
    .map((block) => [block?.text, block?.caption, block?.fileName].filter(Boolean).join(' '))
    .join(' ');
  const words = `${item?.summary || ''} ${blockText}`.split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 185));
};

export default function StudyMaterial() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState('');

  const loadMaterials = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await content.getStudentContent();
      const data = response.data.data || [];
      setMaterials(data);
      setSelectedId((prev) => prev || data[0]?._id || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load study materials'));
    } finally {
      setLoading(false);
    }
  };

  const loadConceptMap = async (materialId, { refresh = false } = {}) => {
    if (!materialId) return;
    setMapLoading(true);
    setMapError('');

    try {
      const response = await content.getConceptMap(materialId, { refresh });
      setMapData(response.data.data || null);
    } catch (err) {
      setMapData(null);
      setMapError(getApiErrorMessage(err, 'Could not generate concept map right now.'));
    } finally {
      setMapLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const tags = useMemo(() => {
    const unique = new Set();
    materials.forEach((item) => (item.tags || []).forEach((tag) => unique.add(tag)));
    return ['All', ...Array.from(unique)];
  }, [materials]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((item) => {
      const matchesTag = activeTag === 'All' || (item.tags || []).includes(activeTag);
      const matchesSearch =
        !query
        || item.title?.toLowerCase().includes(query)
        || item.summary?.toLowerCase().includes(query)
        || (item.tags || []).join(' ').toLowerCase().includes(query);
      return matchesTag && matchesSearch;
    });
  }, [materials, activeTag, search]);

  const selected = materials.find((item) => item._id === selectedId) || filtered[0] || null;

  useEffect(() => {
    if (filtered.length && !filtered.find((item) => item._id === selectedId)) {
      setSelectedId(filtered[0]._id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected?._id) {
      setMapData(null);
      setMapError('');
      return;
    }

    loadConceptMap(selected._id);
  }, [selected?._id]);

  const publishedThisWeek = useMemo(() => {
    const now = Date.now();
    return materials.filter((item) => {
      if (!item.publishedAt) return false;
      const diff = now - new Date(item.publishedAt).getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
  }, [materials]);

  const avgReadMins = useMemo(() => {
    if (!materials.length) return 0;
    const total = materials.reduce((sum, item) => sum + estimateReadMinutes(item), 0);
    return Math.round(total / materials.length);
  }, [materials]);

  if (loading) {
    return (
      <div className="ai-dashboard min-h-screen">
        <div className="ai-shell materials-shell">
          <div className="materials-loading">Loading your intelligent materials workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-dashboard materials-page min-h-screen">
      <div className="ai-shell materials-shell space-y-8">
        <header className="ai-hero ai-fade-up materials-hero">
          <div className="space-y-3">
            <div className="ai-chip">
              <SparklesIcon className="h-4 w-4" />
              AI Materials Intelligence
            </div>
            <h1 className="ai-hero__title">Learning Materials Studio</h1>
            <p className="materials-hero-copy">
              Learn faster with teacher-curated content transformed into interactive concept maps and
              high-signal academic visualizations.
            </p>
          </div>

          <div className="materials-hero-actions">
            <label className="materials-search">
              <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, topic, or tag"
              />
            </label>
            <button type="button" className="ai-btn" onClick={loadMaterials}>
              <ArrowPathIcon className="h-4 w-4" />
              Refresh library
            </button>
          </div>
        </header>

        <section className="ai-section ai-fade-up" style={{ animationDelay: '0.06s' }}>
          <div className="ai-kpi-strip materials-kpi-strip">
            <div className="ai-kpi">
              <p className="materials-kpi-label">Total modules</p>
              <p className="materials-kpi-value">{materials.length}</p>
            </div>
            <div className="ai-kpi">
              <p className="materials-kpi-label">Published this week</p>
              <p className="materials-kpi-value">{publishedThisWeek}</p>
            </div>
            <div className="ai-kpi">
              <p className="materials-kpi-label">Average read time</p>
              <p className="materials-kpi-value">{avgReadMins} min</p>
            </div>
            <div className="ai-kpi">
              <p className="materials-kpi-label">Mapped concepts</p>
              <p className="materials-kpi-value">{mapData?.analytics?.conceptCount || 0}</p>
            </div>
          </div>
        </section>

        {error && <div className="materials-error">{error}</div>}

        <section className="ai-section">
          <div className="materials-stack">
            <section className="materials-library-top ai-rail ai-fade-up" style={{ animationDelay: '0.08s' }}>
              <div className="ai-panel__header">
                <div className="ai-panel__title">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-teal-600" />
                  Material Library
                </div>
                <span className="materials-filter-count">{filtered.length} shown</span>
              </div>

              <div className="materials-tags">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`materials-tag-btn ${activeTag === tag ? 'is-active' : ''}`}
                    onClick={() => setActiveTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="materials-list materials-list--inline">
                {filtered.map((item) => (
                  <article
                    key={item._id}
                    className={`material-card ${selected?._id === item._id ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(item._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === 'Enter' && setSelectedId(item._id)}
                  >
                    <div className="material-card__header">
                      <h3>{item.title}</h3>
                      <span>{estimateReadMinutes(item)} min</span>
                    </div>
                    <p>{item.summary || 'No summary provided yet.'}</p>
                    <div className="material-card__meta">
                      <span>{item.teacherId?.name || 'Your teacher'}</span>
                      <span>
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                    <div className="material-card__tags">
                      {(item.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </article>
                ))}

                {!filtered.length && (
                  <div className="materials-empty-card materials-empty-card--inline">
                    No materials match this filter. Try another tag or search keyword.
                  </div>
                )}
              </div>
            </section>

            <section className="materials-detail ai-rail ai-fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="ai-panel__header">
                <div className="ai-panel__title">
                  <ChartBarSquareIcon className="h-5 w-5 text-teal-600" />
                  Learning Module
                </div>
                {selected && <span className="materials-selected-pill">{selected.title}</span>}
              </div>

              <div className="materials-detail-body">
                {selected ? (
                  <ContentRenderer content={selected} />
                ) : (
                  <div className="materials-empty-card">Select a module to view details.</div>
                )}
              </div>
            </section>

            {selected && (
              <ConceptMapPanel
                mapData={mapData}
                loading={mapLoading}
                error={mapError}
                onRefresh={() => loadConceptMap(selected._id, { refresh: true })}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
