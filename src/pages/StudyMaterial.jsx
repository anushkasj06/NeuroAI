import { useEffect, useMemo, useState } from 'react';
import { content, getApiErrorMessage } from '../services/api';
import ContentRenderer from '../components/ContentRenderer';
import './StudyMaterial.css';

export default function StudyMaterial() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [selectedId, setSelectedId] = useState(null);

  const loadMaterials = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await content.getStudentContent();
      const data = response.data.data || [];
      setMaterials(data);
      setSelectedId(data[0]?._id || null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load study materials'));
    } finally {
      setLoading(false);
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
    return materials.filter((item) => {
      const matchesTag = activeTag === 'All' || (item.tags || []).includes(activeTag);
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.summary?.toLowerCase().includes(query);
      return matchesTag && matchesSearch;
    });
  }, [materials, activeTag, search]);

  const selected = materials.find((item) => item._id === selectedId) || filtered[0];

  useEffect(() => {
    if (filtered.length && !filtered.find((item) => item._id === selectedId)) {
      setSelectedId(filtered[0]._id);
    }
  }, [filtered, selectedId]);

  if (loading) {
    return (
      <div className="materials-page">
        <div className="materials-loading">Loading your study library...</div>
      </div>
    );
  }

  return (
    <div className="materials-page">
      <div className="materials-shell">
        <header className="materials-hero">
          <div>
            <p className="materials-kicker">Library</p>
            <h1>Study Materials</h1>
            <p>Curated by your teacher, tailored to your progress. Explore, practice, and revisit anytime.</p>
          </div>
          <div className="materials-search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search modules, topics, or tags"
            />
            <button type="button" onClick={loadMaterials}>
              Refresh
            </button>
          </div>
        </header>

        {error && <div className="materials-error">{error}</div>}

        <div className="materials-tags">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={activeTag === tag ? 'active' : ''}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="materials-grid">
          <section className="materials-list">
            {filtered.map((item) => (
              <article
                key={item._id}
                className={`material-card ${selectedId === item._id ? 'active' : ''}`}
                onClick={() => setSelectedId(item._id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && setSelectedId(item._id)}
              >
                {item.coverImage?.url && (
                  <div className="material-cover">
                    <img src={item.coverImage.url} alt={item.title || 'Material'} />
                  </div>
                )}
                <div className="material-body">
                  <h3>{item.title}</h3>
                  <p>{item.summary || 'No summary provided yet.'}</p>
                  <div className="material-meta">
                    <span>{item.teacherId?.name || 'Your teacher'}</span>
                    <span>
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString()
                        : 'Just now'}
                    </span>
                  </div>
                  <div className="material-tags">
                    {(item.tags || []).slice(0, 3).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {!filtered.length && <p className="materials-empty">No materials match this filter yet.</p>}
          </section>

          <section className="materials-detail">
            {selected ? (
              <ContentRenderer content={selected} />
            ) : (
              <div className="materials-empty">Select a module to view details.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
