import { useEffect, useMemo, useState } from 'react';
import { content, getApiErrorMessage } from '../services/api';
import ContentRenderer from '../components/ContentRenderer';
import './TeacherContentStudio.css';

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createBlock = (type) => {
  const id = createId();
  switch (type) {
    case 'text':
      return { id, type, text: '', style: 'paragraph' };
    case 'image':
      return { id, type, url: '', caption: '', fileName: '', mimeType: '', size: 0 };
    case 'video':
      return { id, type, url: '', caption: '', fileName: '', mimeType: '', size: 0 };
    case 'file':
      return { id, type, url: '', fileName: '', mimeType: '', size: 0 };
    case 'callout':
      return { id, type, text: '', tone: 'info' };
    case 'checklist':
      return {
        id,
        type,
        checklist: [
          { text: 'Define the objective for this lesson', checked: false },
          { text: 'Add the key reference material', checked: false },
          { text: 'Include a quick practice prompt', checked: false },
        ],
      };
    default:
      return { id, type };
  }
};

const emptyForm = {
  title: '',
  summary: '',
  tags: '',
  targetUserIds: [],
  coverImage: null,
};

export default function TeacherContentStudio() {
  const [students, setStudents] = useState([]);
  const [library, setLibrary] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [blocks, setBlocks] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState({});
  const [filter, setFilter] = useState('all');

  const loadStudioData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsRes, contentRes] = await Promise.all([
        content.getTeacherStudents(),
        content.getTeacherContent(),
      ]);
      setStudents(studentsRes.data.data || []);
      setLibrary(contentRes.data.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load content studio'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudioData();
  }, []);

  const tags = useMemo(
    () =>
      form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [form.tags]
  );

  const previewContent = useMemo(
    () => ({
      title: form.title || 'Untitled module',
      summary: form.summary,
      coverImage: form.coverImage,
      tags,
      blocks,
    }),
    [form.title, form.summary, form.coverImage, tags, blocks]
  );

  const filteredLibrary = useMemo(() => {
    if (filter === 'all') return library;
    return library.filter((item) => item.status === filter);
  }, [library, filter]);

  const selectedCount = form.targetUserIds.length;
  const allSelected = students.length > 0 && selectedCount === students.length;

  const toggleTarget = (studentId) => {
    setForm((prev) => {
      const exists = prev.targetUserIds.includes(studentId);
      const targetUserIds = exists
        ? prev.targetUserIds.filter((id) => id !== studentId)
        : [...prev.targetUserIds, studentId];
      return { ...prev, targetUserIds };
    });
  };

  const toggleAllTargets = () => {
    setForm((prev) => ({
      ...prev,
      targetUserIds: allSelected ? [] : students.map((student) => student._id),
    }));
  };

  const updateBlock = (blockId, patch) => {
    setBlocks((prev) => prev.map((block) => (block.id === blockId ? { ...block, ...patch } : block)));
  };

  const removeBlock = (blockId) => {
    setBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  const addChecklistItem = (blockId) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const checklist = block.checklist ? [...block.checklist] : [];
        checklist.push({ text: '', checked: false });
        return { ...block, checklist };
      })
    );
  };

  const updateChecklistItem = (blockId, index, patch) => {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const checklist = block.checklist ? [...block.checklist] : [];
        checklist[index] = { ...checklist[index], ...patch };
        return { ...block, checklist };
      })
    );
  };

  const handleUpload = async (blockId, file) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, [blockId]: true }));
    setError('');
    try {
      const response = await content.uploadAsset(file);
      const asset = response.data.data;
      updateBlock(blockId, {
        url: asset.url,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        size: asset.size,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to upload asset'));
    } finally {
      setUploading((prev) => ({ ...prev, [blockId]: false }));
    }
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, cover: true }));
    setError('');
    try {
      const response = await content.uploadAsset(file);
      const asset = response.data.data;
      setForm((prev) => ({
        ...prev,
        coverImage: {
          url: asset.url,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          size: asset.size,
        },
      }));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to upload cover image'));
    } finally {
      setUploading((prev) => ({ ...prev, cover: false }));
    }
  };

  const buildPayload = () => ({
    title: form.title.trim(),
    summary: form.summary.trim(),
    tags,
    targetUserIds: form.targetUserIds,
    coverImage: form.coverImage,
    blocks,
  });

  const upsertContent = async () => {
    const payload = buildPayload();
    if (!payload.title) {
      throw new Error('TITLE_REQUIRED');
    }
    if (editingId) {
      const response = await content.updateContent(editingId, payload);
      return response.data.data;
    }
    const response = await content.createContent(payload);
    return response.data.data;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await upsertContent();
      setEditingId(saved._id);
      await loadStudioData();
    } catch (err) {
      if (err.message === 'TITLE_REQUIRED') {
        setError('Add a title before saving.');
      } else {
        setError(getApiErrorMessage(err, 'Failed to save draft'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!form.targetUserIds.length) {
      setError('Select at least one student to publish.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const saved = await upsertContent();
      await content.publishContent(saved._id, { targetUserIds: form.targetUserIds });
      setEditingId(saved._id);
      await loadStudioData();
    } catch (err) {
      if (err.message === 'TITLE_REQUIRED') {
        setError('Add a title before publishing.');
      } else {
        setError(getApiErrorMessage(err, 'Failed to publish content'));
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setBlocks([]);
    setEditingId(null);
    setError('');
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      title: item.title || '',
      summary: item.summary || '',
      tags: (item.tags || []).join(', '),
      targetUserIds: (item.targetUserIds || []).map((id) => id.toString()),
      coverImage: item.coverImage?.url ? item.coverImage : null,
    });
    const hydratedBlocks = (item.blocks || []).map((block) => ({
      ...block,
      id: block.id || createId(),
    }));
    setBlocks(hydratedBlocks);
  };

  const handleLibraryPublish = async (item) => {
    setPublishing(true);
    setError('');
    try {
      await content.publishContent(item._id, { targetUserIds: item.targetUserIds });
      await loadStudioData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to publish content'));
    } finally {
      setPublishing(false);
    }
  };

  const handleLibraryDraft = async (item) => {
    setSaving(true);
    setError('');
    try {
      await content.unpublishContent(item._id);
      await loadStudioData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to move content to draft'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="studio-page">
        <div className="studio-loading">Loading content studio...</div>
      </div>
    );
  }

  return (
    <div className="studio-page">
      <div className="studio-shell">
        <header className="studio-hero">
          <div>
            <p className="studio-kicker">Studio</p>
            <h1>Study Content Studio</h1>
            <p>
              Craft immersive modules, stage drafts, and deliver targeted content to the right learners at the
              right moment.
            </p>
          </div>
          <div className="studio-hero-actions">
            <button type="button" className="ghost" onClick={handleReset}>
              New Draft
            </button>
            <button type="button" className="solid" onClick={handleSaveDraft} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button type="button" className="glow" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish Now'}
            </button>
          </div>
        </header>

        {error && <div className="studio-error">{error}</div>}

        <div className="studio-grid">
          <section className="studio-panel">
            <div className="panel-head">
              <h2>Compose</h2>
              <span>{editingId ? 'Editing draft' : 'New module'}</span>
            </div>

            <div className="panel-section">
              <label>Module title</label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="e.g. Graph Traversal Masterclass"
              />
            </div>

            <div className="panel-section">
              <label>Overview</label>
              <textarea
                rows="3"
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                placeholder="Give students a quick briefing on what to expect."
              />
            </div>

            <div className="panel-section">
              <label>Tags</label>
              <input
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="algorithms, graphs, revision"
              />
            </div>

            <div className="panel-section">
              <label>Cover visual</label>
              <div className="upload-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleCoverUpload(event.target.files?.[0])}
                />
                {uploading.cover && <span>Uploading...</span>}
                {form.coverImage?.url && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setForm((prev) => ({ ...prev, coverImage: null }))}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-head compact">
                <h3>Target students</h3>
                <button type="button" className="ghost" onClick={toggleAllTargets}>
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="target-list">
                {students.map((student) => (
                  <label key={student._id} className="target-pill">
                    <input
                      type="checkbox"
                      checked={form.targetUserIds.includes(student._id)}
                      onChange={() => toggleTarget(student._id)}
                    />
                    <span>{student.name}</span>
                  </label>
                ))}
              </div>
              <p className="hint">{selectedCount} students selected.</p>
            </div>

            <div className="panel-section">
              <div className="panel-head compact">
                <h3>Build blocks</h3>
                <span>Mix formats for richer delivery.</span>
              </div>
              <div className="block-actions">
                <button type="button" onClick={() => setBlocks((prev) => [...prev, createBlock('text')])}>
                  Text
                </button>
                <button type="button" onClick={() => setBlocks((prev) => [...prev, createBlock('image')])}>
                  Image
                </button>
                <button type="button" onClick={() => setBlocks((prev) => [...prev, createBlock('video')])}>
                  Video
                </button>
                <button type="button" onClick={() => setBlocks((prev) => [...prev, createBlock('file')])}>
                  File
                </button>
                <button type="button" onClick={() => setBlocks((prev) => [...prev, createBlock('callout')])}>
                  Callout
                </button>
                <button type="button" onClick={() => setBlocks((prev) => [...prev, createBlock('checklist')])}>
                  Checklist
                </button>
              </div>
            </div>

            <div className="block-stack">
              {blocks.map((block) => (
                <div key={block.id} className="block-card">
                  <div className="block-head">
                    <strong>{block.type}</strong>
                    <button type="button" className="ghost" onClick={() => removeBlock(block.id)}>
                      Remove
                    </button>
                  </div>

                  {block.type === 'text' && (
                    <div className="block-body">
                      <select
                        value={block.style}
                        onChange={(event) => updateBlock(block.id, { style: event.target.value })}
                      >
                        <option value="paragraph">Paragraph</option>
                        <option value="heading">Heading</option>
                        <option value="quote">Quote</option>
                      </select>
                      <textarea
                        rows="4"
                        value={block.text}
                        onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                        placeholder="Write the lesson text here..."
                      />
                    </div>
                  )}

                  {['image', 'video', 'file'].includes(block.type) && (
                    <div className="block-body">
                      <input
                        type="file"
                        accept={
                          block.type === 'image'
                            ? 'image/*'
                            : block.type === 'video'
                              ? 'video/*'
                              : '.pdf,.doc,.docx,.ppt,.pptx,.txt'
                        }
                        onChange={(event) => handleUpload(block.id, event.target.files?.[0])}
                      />
                      {uploading[block.id] && <span>Uploading...</span>}
                      {block.url && (
                        <p className="hint">Uploaded: {block.fileName || 'asset'}</p>
                      )}
                      {(block.type === 'image' || block.type === 'video') && (
                        <input
                          value={block.caption || ''}
                          onChange={(event) => updateBlock(block.id, { caption: event.target.value })}
                          placeholder="Caption or guidance"
                        />
                      )}
                    </div>
                  )}

                  {block.type === 'callout' && (
                    <div className="block-body">
                      <select
                        value={block.tone}
                        onChange={(event) => updateBlock(block.id, { tone: event.target.value })}
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                      </select>
                      <textarea
                        rows="3"
                        value={block.text}
                        onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                        placeholder="Call out the key reminder or tip."
                      />
                    </div>
                  )}

                  {block.type === 'checklist' && (
                    <div className="block-body">
                      {(block.checklist || []).map((item, index) => (
                        <div key={`${block.id}-${index}`} className="checklist-row">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(event) =>
                              updateChecklistItem(block.id, index, { checked: event.target.checked })
                            }
                          />
                          <input
                            value={item.text}
                            onChange={(event) => updateChecklistItem(block.id, index, { text: event.target.value })}
                            placeholder="Checklist item"
                          />
                        </div>
                      ))}
                      <button type="button" className="ghost" onClick={() => addChecklistItem(block.id)}>
                        Add item
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="studio-panel preview-panel">
            <div className="panel-head">
              <h2>Preview</h2>
              <span>Student view</span>
            </div>
            <div className="preview-surface">
              <ContentRenderer content={previewContent} />
            </div>
          </section>
        </div>

        <section className="studio-panel library-panel">
          <div className="panel-head">
            <div>
              <h2>Content Library</h2>
              <p>{library.length} total modules</p>
            </div>
            <div className="filter-row">
              <button
                type="button"
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={filter === 'draft' ? 'active' : ''}
                onClick={() => setFilter('draft')}
              >
                Drafts
              </button>
              <button
                type="button"
                className={filter === 'published' ? 'active' : ''}
                onClick={() => setFilter('published')}
              >
                Published
              </button>
            </div>
          </div>

          <div className="library-grid">
            {filteredLibrary.map((item) => (
              <article key={item._id} className="library-card">
                <div className="library-meta">
                  <span className={`status-badge ${item.status}`}>{item.status}</span>
                  <span>{(item.targetUserIds || []).length} learners</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary || 'No summary yet.'}</p>
                <div className="library-actions">
                  <button type="button" className="ghost" onClick={() => handleEdit(item)}>
                    Edit
                  </button>
                  {item.status === 'draft' ? (
                    <button type="button" className="solid" onClick={() => handleLibraryPublish(item)}>
                      Publish
                    </button>
                  ) : (
                    <button type="button" className="ghost" onClick={() => handleLibraryDraft(item)}>
                      Move to draft
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!filteredLibrary.length && <p className="hint">No modules in this view yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
