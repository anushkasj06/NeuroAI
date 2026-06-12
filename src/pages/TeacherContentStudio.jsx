import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { content, getApiErrorMessage } from '../services/api';
import ContentRenderer from '../components/ContentRenderer';
import {
  DocumentTextIcon, PhotoIcon, VideoCameraIcon, PaperClipIcon,
  MegaphoneIcon, ClipboardDocumentCheckIcon, PlusIcon,
  TrashIcon, ChevronUpIcon, ChevronDownIcon, ArrowPathIcon,
  EyeIcon, PencilSquareIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import './AIDashboard.css';

const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const BLOCK_TYPES = [
  { type: 'text', label: 'Text', icon: DocumentTextIcon },
  { type: 'image', label: 'Image', icon: PhotoIcon },
  { type: 'video', label: 'Video', icon: VideoCameraIcon },
  { type: 'file', label: 'File', icon: PaperClipIcon },
  { type: 'callout', label: 'Callout', icon: MegaphoneIcon },
  { type: 'checklist', label: 'Checklist', icon: ClipboardDocumentCheckIcon },
];

const createBlock = (type) => {
  const id = createId();
  switch (type) {
    case 'text': return { id, type, text: '', style: 'paragraph' };
    case 'image': return { id, type, url: '', caption: '', fileName: '', mimeType: '', size: 0 };
    case 'video': return { id, type, url: '', caption: '', fileName: '', mimeType: '', size: 0 };
    case 'file': return { id, type, url: '', fileName: '', mimeType: '', size: 0 };
    case 'callout': return { id, type, text: '', tone: 'info' };
    case 'checklist': return {
      id, type, checklist: [
        { text: 'Define the objective for this lesson', checked: false },
        { text: 'Add the key reference material', checked: false },
        { text: 'Include a quick practice prompt', checked: false },
      ],
    };
    default: return { id, type };
  }
};

const emptyForm = { title: '', summary: '', tags: '', targetUserIds: [], coverImage: null };

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
  const [showPreview, setShowPreview] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [sRes, cRes] = await Promise.all([content.getTeacherStudents(), content.getTeacherContent()]);
      setStudents(sRes.data.data || []);
      setLibrary(cRes.data.data || []);
    } catch (err) { setError(getApiErrorMessage(err, 'Failed to load content studio')); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const tags = useMemo(() => form.tags.split(',').map((t) => t.trim()).filter(Boolean), [form.tags]);
  const previewContent = useMemo(() => ({
    title: form.title || 'Untitled module', summary: form.summary,
    coverImage: form.coverImage, tags, blocks,
  }), [form.title, form.summary, form.coverImage, tags, blocks]);

  const filteredLibrary = useMemo(() => {
    if (filter === 'all') return library;
    return library.filter((i) => i.status === filter);
  }, [library, filter]);

  const selectedCount = form.targetUserIds.length;
  const allSelected = students.length > 0 && selectedCount === students.length;

  const toggleTarget = (id) => setForm((p) => ({
    ...p, targetUserIds: p.targetUserIds.includes(id) ? p.targetUserIds.filter((x) => x !== id) : [...p.targetUserIds, id],
  }));
  const toggleAllTargets = () => setForm((p) => ({ ...p, targetUserIds: allSelected ? [] : students.map((s) => s._id) }));
  const updateBlock = (bId, patch) => setBlocks((p) => p.map((b) => b.id === bId ? { ...b, ...patch } : b));
  const removeBlock = (bId) => setBlocks((p) => p.filter((b) => b.id !== bId));
  const moveBlock = (i, dir) => setBlocks((p) => {
    const a = [...p]; const j = i + dir;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]]; return a;
  });
  const addChecklistItem = (bId) => setBlocks((p) => p.map((b) => b.id !== bId ? b : { ...b, checklist: [...(b.checklist || []), { text: '', checked: false }] }));
  const updateChecklistItem = (bId, idx, patch) => setBlocks((p) => p.map((b) => {
    if (b.id !== bId) return b;
    const cl = [...(b.checklist || [])]; cl[idx] = { ...cl[idx], ...patch }; return { ...b, checklist: cl };
  }));

  const handleUpload = async (bId, file) => {
    if (!file) return; setUploading((p) => ({ ...p, [bId]: true })); setError('');
    try { const r = await content.uploadAsset(file); const a = r.data.data; updateBlock(bId, { url: a.url, fileName: a.fileName, mimeType: a.mimeType, size: a.size }); }
    catch (err) { setError(getApiErrorMessage(err, 'Failed to upload')); }
    setUploading((p) => ({ ...p, [bId]: false }));
  };
  const handleCoverUpload = async (file) => {
    if (!file) return; setUploading((p) => ({ ...p, cover: true })); setError('');
    try { const r = await content.uploadAsset(file); const a = r.data.data; setForm((p) => ({ ...p, coverImage: { url: a.url, fileName: a.fileName, mimeType: a.mimeType, size: a.size } })); }
    catch (err) { setError(getApiErrorMessage(err, 'Failed to upload cover')); }
    setUploading((p) => ({ ...p, cover: false }));
  };

  const buildPayload = () => ({ title: form.title.trim(), summary: form.summary.trim(), tags, targetUserIds: form.targetUserIds, coverImage: form.coverImage, blocks });
  const upsertContent = async () => {
    const p = buildPayload(); if (!p.title) throw new Error('TITLE_REQUIRED');
    return editingId ? (await content.updateContent(editingId, p)).data.data : (await content.createContent(p)).data.data;
  };

  const handleSaveDraft = async () => {
    setSaving(true); setError('');
    try { const s = await upsertContent(); setEditingId(s._id); await load(); }
    catch (err) { setError(err.message === 'TITLE_REQUIRED' ? 'Add a title before saving.' : getApiErrorMessage(err, 'Failed to save')); }
    setSaving(false);
  };
  const handlePublish = async () => {
    if (!form.targetUserIds.length) { setError('Select at least one student.'); return; }
    setPublishing(true); setError('');
    try { const s = await upsertContent(); await content.publishContent(s._id, { targetUserIds: form.targetUserIds }); setEditingId(s._id); await load(); }
    catch (err) { setError(err.message === 'TITLE_REQUIRED' ? 'Add a title first.' : getApiErrorMessage(err, 'Failed to publish')); }
    setPublishing(false);
  };
  const handleReset = () => { setForm(emptyForm); setBlocks([]); setEditingId(null); setError(''); setShowPreview(false); };
  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({ title: item.title || '', summary: item.summary || '', tags: (item.tags || []).join(', '), targetUserIds: (item.targetUserIds || []).map(String), coverImage: item.coverImage?.url ? item.coverImage : null });
    setBlocks((item.blocks || []).map((b) => ({ ...b, id: b.id || createId() })));
    setShowPreview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleLibraryPublish = async (item) => {
    setPublishing(true); setError('');
    try { await content.publishContent(item._id, { targetUserIds: item.targetUserIds }); await load(); }
    catch (err) { setError(getApiErrorMessage(err, 'Failed to publish')); }
    setPublishing(false);
  };
  const handleLibraryDraft = async (item) => {
    setSaving(true); setError('');
    try { await content.unpublishContent(item._id); await load(); }
    catch (err) { setError(getApiErrorMessage(err, 'Failed to unpublish')); }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
        <div className="ai-shell">
          <div style={{ height: 80, background: 'linear-gradient(120deg,#0f172a,#0f766e 62%,#ca8a04)', borderRadius: 8 }} />
          <div style={{ height: 400, background: '#f1f5f9', borderRadius: 8, marginTop: 16 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="ai-dashboard" style={{ minHeight: '100vh' }}>
      <div className="ai-shell">
        {/* ── Hero ──────────────────────────────────────── */}
        <header className="ai-fade-up" style={{
          background: 'linear-gradient(135deg, #0f172a, #0f766e 55%, #f59e0b)',
          color: '#f8fafc', padding: '24px 28px', borderRadius: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
          boxShadow: '0 18px 40px rgba(15,23,42,0.25)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#99f6e4' }}>Content Studio</p>
            <h1 style={{ margin: '0 0 6px', fontSize: 'clamp(22px,3.5vw,34px)', fontWeight: 800 }}>Study Content Studio</h1>
            <p style={{ margin: 0, color: '#e2e8f0', fontSize: 12, maxWidth: 480 }}>
              Craft immersive modules, stage drafts, and deliver targeted content to learners.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <Link to="/teacher" style={{ border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '7px 12px', fontWeight: 700, fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeftIcon style={{ width: 12, height: 12 }} /> Dashboard
            </Link>
            <button onClick={handleReset} style={heroBtnGhost}>New Draft</button>
            <button onClick={handleSaveDraft} disabled={saving} style={heroBtnSolid}>{saving ? 'Saving...' : 'Save Draft'}</button>
            <button onClick={handlePublish} disabled={publishing} style={heroBtnGlow}>{publishing ? 'Publishing...' : 'Publish'}</button>
          </div>
        </header>

        {error && <div style={{ margin: '10px 0', padding: '10px 14px', borderRadius: 6, background: '#fff1f2', color: '#991b1b', border: '1px solid #fecdd3', fontSize: 12 }}>{error}</div>}

        {/* ── Editor/Preview Toggle ──────────────────── */}
        <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
          <TabBtn active={!showPreview} onClick={() => setShowPreview(false)} icon={<PencilSquareIcon style={{ width: 13, height: 13 }} />}>Compose</TabBtn>
          <TabBtn active={showPreview} onClick={() => setShowPreview(true)} icon={<EyeIcon style={{ width: 13, height: 13 }} />}>Preview</TabBtn>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', alignSelf: 'center' }}>
            {editingId ? 'Editing draft' : 'New module'} · {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Main Area ─────────────────────────────── */}
        {showPreview ? (
          <div className="ai-rail ai-fade-up" style={{ marginTop: 12 }}>
            <div className="ai-panel__header">
              <span className="ai-panel__title">Student Preview</span>
            </div>
            <div className="ai-panel__body" style={{ background: '#f8fafc', borderRadius: 8, padding: 20, maxHeight: 700, overflow: 'auto' }}>
              <ContentRenderer content={previewContent} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginTop: 12 }} className="ai-fade-up">
            {/* LEFT: Block editor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Meta fields */}
              <div className="ai-rail">
                <div style={{ display: 'grid', gap: 10 }}>
                  <Field label="Module title">
                    <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Graph Traversal Masterclass" style={inputStyle} />
                  </Field>
                  <Field label="Overview">
                    <textarea rows="2" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} placeholder="Give students a quick briefing..." style={{ ...inputStyle, resize: 'vertical' }} />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="Tags (comma-separated)">
                      <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="algorithms, graphs, revision" style={inputStyle} />
                    </Field>
                    <Field label="Cover image">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="file" accept="image/*" onChange={(e) => handleCoverUpload(e.target.files?.[0])} style={{ fontSize: 11, flex: 1 }} />
                        {uploading.cover && <span style={{ fontSize: 10, color: '#64748b' }}>Uploading...</span>}
                        {form.coverImage?.url && <button onClick={() => setForm((p) => ({ ...p, coverImage: null }))} style={{ ...heroBtnGhost, padding: '3px 8px', fontSize: 10 }}>Remove</button>}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>

              {/* Add block bar */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {BLOCK_TYPES.map((bt) => {
                  const Icon = bt.icon;
                  return (
                    <button key={bt.type} onClick={() => setBlocks((p) => [...p, createBlock(bt.type)])}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--ai-line)', background: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--ai-ink)' }}>
                      <Icon style={{ width: 13, height: 13, color: 'var(--ai-accent)' }} />
                      {bt.label}
                    </button>
                  );
                })}
              </div>

              {/* Block stack */}
              {blocks.length === 0 && (
                <div className="ai-rail" style={{ padding: '30px 20px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', fontSize: 12 }}>No blocks yet. Click a block type above to start building your module.</p>
                </div>
              )}
              {blocks.map((block, i) => (
                <BlockCard key={block.id} block={block} index={i} total={blocks.length}
                  onUpdate={updateBlock} onRemove={removeBlock} onMove={moveBlock}
                  uploading={uploading} onUpload={handleUpload}
                  onAddChecklistItem={addChecklistItem} onUpdateChecklistItem={updateChecklistItem} />
              ))}
            </div>

            {/* RIGHT: Target students */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="ai-rail">
                <div className="ai-panel__header">
                  <span className="ai-panel__title">Target Students</span>
                  <button onClick={toggleAllTargets} style={{ border: 'none', background: 'none', color: 'var(--ai-accent)', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    {allSelected ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="ai-panel__body" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {students.map((s) => (
                    <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ai-ink)' }}>
                      <input type="checkbox" checked={form.targetUserIds.includes(s._id)} onChange={() => toggleTarget(s._id)}
                        style={{ width: 14, height: 14, accentColor: 'var(--ai-accent)' }} />
                      {s.name}
                    </label>
                  ))}
                  {students.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8' }}>No students enrolled.</p>}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 10, color: '#64748b' }}>{selectedCount} student{selectedCount !== 1 ? 's' : ''} selected</p>
              </div>

              {/* Quick stats */}
              <div className="ai-rail">
                <div className="ai-panel__header"><span className="ai-panel__title">Module Stats</span></div>
                <div className="ai-panel__body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <MiniStat label="Blocks" value={blocks.length} />
                    <MiniStat label="Text blocks" value={blocks.filter((b) => b.type === 'text').length} />
                    <MiniStat label="Media" value={blocks.filter((b) => ['image', 'video', 'file'].includes(b.type)).length} />
                    <MiniStat label="Tags" value={tags.length} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Content Library ────────────────────────── */}
        <div className="ai-rail ai-fade-up" style={{ marginTop: 24, animationDelay: '0.1s' }}>
          <div className="ai-panel__header">
            <span className="ai-panel__title">Content Library</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'draft', 'published'].map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  border: filter === f ? '1.5px solid var(--ai-accent)' : '1px solid var(--ai-line)',
                  background: filter === f ? 'rgba(15,118,110,0.06)' : 'transparent',
                  color: filter === f ? 'var(--ai-accent)' : '#64748b',
                  textTransform: 'capitalize',
                }}>{f}</button>
              ))}
            </div>
          </div>
          <div className="ai-panel__body">
            {filteredLibrary.length === 0 && <p style={{ color: '#94a3b8', fontSize: 12 }}>No modules in this view.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {filteredLibrary.map((item) => (
                <div key={item._id} style={{
                  border: '1px solid var(--ai-line)', borderRadius: 8, padding: 14,
                  background: editingId === item._id ? 'rgba(15,118,110,0.03)' : 'rgba(255,255,255,0.6)',
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={item.status === 'published' ? 'pg-badge--success' : 'pg-badge--warn'}
                      style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.status}
                    </span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{(item.targetUserIds || []).length} learners</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ai-ink)' }}>{item.title}</h4>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary || 'No summary'}</p>
                  <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                    <button onClick={() => handleEdit(item)} style={libBtn}>Edit</button>
                    {item.status === 'draft'
                      ? <button onClick={() => handleLibraryPublish(item)} style={{ ...libBtn, background: 'var(--ai-accent)', color: '#fff', borderColor: 'var(--ai-accent)' }}>Publish</button>
                      : <button onClick={() => handleLibraryDraft(item)} style={libBtn}>Unpublish</button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */
const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--ai-line)',
  background: 'rgba(255,255,255,0.7)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};
const heroBtnGhost = { border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, background: 'rgba(255,255,255,0.12)', color: '#f8fafc', padding: '7px 14px', fontWeight: 700, fontSize: 11, cursor: 'pointer' };
const heroBtnSolid = { border: 0, borderRadius: 6, background: '#f8fafc', color: '#0f172a', padding: '7px 14px', fontWeight: 700, fontSize: 11, cursor: 'pointer' };
const heroBtnGlow = { border: 0, borderRadius: 6, background: 'linear-gradient(120deg,#22d3ee,#38bdf8)', color: '#0f172a', padding: '7px 14px', fontWeight: 700, fontSize: 11, cursor: 'pointer', boxShadow: '0 8px 20px rgba(56,189,248,0.3)' };
const libBtn = { padding: '4px 10px', borderRadius: 5, border: '1px solid var(--ai-line)', background: 'transparent', fontSize: 10, fontWeight: 700, cursor: 'pointer', color: 'var(--ai-ink)' };

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
      border: active ? '1.5px solid var(--ai-accent)' : '1px solid var(--ai-line)',
      background: active ? 'rgba(15,118,110,0.06)' : 'transparent',
      color: active ? 'var(--ai-accent)' : '#64748b', fontWeight: 700, fontSize: 11,
    }}>{icon}{children}</button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 6, background: 'rgba(148,163,184,0.04)', border: '1px solid var(--ai-line)' }}>
      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--ai-ink)', margin: 0 }}>{value}</p>
      <p style={{ fontSize: 9, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', margin: '2px 0 0' }}>{label}</p>
    </div>
  );
}

function BlockCard({ block, index, total, onUpdate, onRemove, onMove, uploading, onUpload, onAddChecklistItem, onUpdateChecklistItem }) {
  const bt = BLOCK_TYPES.find((t) => t.type === block.type);
  const Icon = bt?.icon || DocumentTextIcon;

  return (
    <div className="ai-rail" style={{ borderLeft: '3px solid var(--ai-accent)' }}>
      {/* Block header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon style={{ width: 14, height: 14, color: 'var(--ai-accent)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ai-ink)' }}>{block.type}</span>
        <span style={{ flex: 1 }} />
        <button onClick={() => onMove(index, -1)} disabled={index === 0}
          style={{ border: 'none', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>
          <ChevronUpIcon style={{ width: 13, height: 13, color: '#64748b' }} />
        </button>
        <button onClick={() => onMove(index, 1)} disabled={index === total - 1}
          style={{ border: 'none', background: 'none', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}>
          <ChevronDownIcon style={{ width: 13, height: 13, color: '#64748b' }} />
        </button>
        <button onClick={() => onRemove(block.id)}
          style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
          <TrashIcon style={{ width: 13, height: 13, color: '#dc2626' }} />
        </button>
      </div>

      {/* Block body */}
      {block.type === 'text' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <select value={block.style} onChange={(e) => onUpdate(block.id, { style: e.target.value })} style={{ ...inputStyle, width: 'auto', maxWidth: 150 }}>
            <option value="paragraph">Paragraph</option>
            <option value="heading">Heading</option>
            <option value="quote">Quote</option>
          </select>
          <textarea rows="4" value={block.text} onChange={(e) => onUpdate(block.id, { text: e.target.value })}
            placeholder="Write the lesson text here..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      )}

      {['image', 'video', 'file'].includes(block.type) && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="file" accept={block.type === 'image' ? 'image/*' : block.type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.ppt,.pptx,.txt'}
              onChange={(e) => onUpload(block.id, e.target.files?.[0])} style={{ fontSize: 11, flex: 1 }} />
            {uploading[block.id] && <span style={{ fontSize: 10, color: 'var(--ai-accent)', fontWeight: 600 }}>Uploading...</span>}
          </div>
          {block.url && <p style={{ fontSize: 10, color: '#059669', margin: 0 }}>Uploaded: {block.fileName || 'asset'}</p>}
          {(block.type === 'image' || block.type === 'video') && (
            <input value={block.caption || ''} onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
              placeholder="Caption or guidance" style={inputStyle} />
          )}
        </div>
      )}

      {block.type === 'callout' && (
        <div style={{ display: 'grid', gap: 6 }}>
          <select value={block.tone} onChange={(e) => onUpdate(block.id, { tone: e.target.value })} style={{ ...inputStyle, width: 'auto', maxWidth: 150 }}>
            <option value="info">Info</option><option value="warning">Warning</option><option value="success">Success</option>
          </select>
          <textarea rows="3" value={block.text} onChange={(e) => onUpdate(block.id, { text: e.target.value })}
            placeholder="Key reminder or tip..." style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      )}

      {block.type === 'checklist' && (
        <div style={{ display: 'grid', gap: 6 }}>
          {(block.checklist || []).map((item, idx) => (
            <div key={`${block.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={item.checked} onChange={(e) => onUpdateChecklistItem(block.id, idx, { checked: e.target.checked })}
                style={{ width: 14, height: 14, accentColor: 'var(--ai-accent)' }} />
              <input value={item.text} onChange={(e) => onUpdateChecklistItem(block.id, idx, { text: e.target.value })}
                placeholder="Checklist item" style={{ ...inputStyle, flex: 1 }} />
            </div>
          ))}
          <button onClick={() => onAddChecklistItem(block.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: 'var(--ai-accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            <PlusIcon style={{ width: 12, height: 12 }} /> Add item
          </button>
        </div>
      )}
    </div>
  );
}
