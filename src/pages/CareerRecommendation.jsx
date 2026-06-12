import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { career } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CareerRecommendation.css';

// ─── tiny helpers ──────────────────────────────────────────────────────────
const pct = (v) => `${Math.round((v || 0) * 100)}%`;
const norm = (r) => ({
  roleName:    r.roleName    ?? r.role_name    ?? r.role ?? '',
  finalScore:  r.finalScore  ?? r.final_score  ?? r.score ?? 0,
  contentScore:(r.sourceBreakdown?.contentScore ?? r.source_breakdown?.content_score ?? 0),
  cfScore:     (r.sourceBreakdown?.cfScore      ?? r.source_breakdown?.cf_score      ?? 0),
});
const normJob = (j) => ({
  title:    j.title   ?? 'Unknown Role',
  company:  j.company ?? 'Unknown Company',
  location: j.location ?? null,
  url:      j.url     ?? '#',
  source:   j.source  ?? 'unknown',
});

// ─── Markdown renderer with proper table support ──────────────────────
const mdComponents = {
  table: ({children}) => <div className="cr-md-table-wrap"><table className="cr-md-table">{children}</table></div>,
  thead: ({children}) => <thead>{children}</thead>,
  tbody: ({children}) => <tbody>{children}</tbody>,
  tr:    ({children}) => <tr>{children}</tr>,
  th:    ({children, style}) => <th style={style}>{children}</th>,
  td:    ({children, style}) => <td style={style}>{children}</td>,
};
const MD_PLUGINS = [remarkGfm];

// ─── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ value, color = '#0f766e', height = 6 }) {
  return (
    <div style={{ height, borderRadius: 4, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct(value), background: color, borderRadius: 4, transition: 'width .6s ease' }} />
    </div>
  );
}

function ReadinessBadge({ score }) {
  const s = Math.round((score || 0) * 100);
  const color = s >= 70 ? '#16a34a' : s >= 40 ? '#d97706' : '#dc2626';
  return <span style={{ color, fontWeight: 700, fontSize: '0.82rem' }}>{s}% fit</span>;
}

// ─── SVG Skill Radar ───────────────────────────────────────────────────────
const RADAR_AXES = ['Programming', 'Data', 'Cloud / DevOps', 'ML / AI', 'Communication', 'Problem Solving'];
const RADAR_KW = [
  ['python','java','javascript','react','node','spring','sql','typescript','c++'],
  ['sql','pandas','analytics','statistics','data','excel','power bi','tableau'],
  ['aws','azure','docker','kubernetes','linux','gcp','terraform','devops'],
  ['machine learning','deep learning','tensorflow','pytorch','nlp','ai','ml'],
  ['communication','presentation','leadership','teamwork'],
  ['dsa','algorithms','problem solving','data structures','system design'],
];
const ROLE_RADAR = {
  'Data Scientist':            [4,5,2,5,3,5],
  'Machine Learning Engineer': [5,4,4,5,3,5],
  'Backend Developer':         [5,3,4,1,3,4],
  'Frontend Developer':        [5,2,2,1,3,3],
  'Data Analyst':              [3,5,2,2,4,4],
  'Cloud Engineer':            [4,2,5,2,3,4],
  'DevOps Engineer':           [4,2,5,2,3,4],
  'Full Stack Developer':      [5,3,3,2,3,4],
  'Software Engineer':         [4,3,3,2,3,5],
};
const DEFAULT_RADAR = [3,3,2,2,3,4];

function scoreCluster(skills, kwList) {
  // Count how many distinct keywords from this cluster the user has
  const matchedKw = kwList.filter(k => skills.some(s => (s.name||s).toLowerCase().includes(k)));
  if (!matchedKw.length) return 0;
  // Scale: 1 match=1, half the list=3, full list=5
  return Math.min(5, Math.max(1, Math.round((matchedKw.length / kwList.length) * 5)));
}

function SkillRadar({ skills = [], roleName = '' }) {
  const size = 280, cx = 140, cy = 140, R = 100;
  const target = (() => {
    const k = Object.keys(ROLE_RADAR).find(r => r.toLowerCase() === roleName.toLowerCase());
    return k ? ROLE_RADAR[k] : DEFAULT_RADAR;
  })();
  const current = RADAR_KW.map(kw => scoreCluster(skills, kw));

  const pts = (vals, max = 5) => vals.map((v, i) => {
    const a = -Math.PI / 2 + i * (2 * Math.PI / vals.length);
    const r = (v / max) * R;
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  }).join(' ');

  return (
    <div className="cr-card">
      <p className="cr-card-title">⬡ Skill Radar — <span style={{color:'#0f766e'}}>{roleName}</span></p>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', maxWidth: 280 }}>
        {[1,2,3,4,5].map(r => (
          <circle key={r} cx={cx} cy={cy} r={R*r/5} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth={1}/>
        ))}
        {RADAR_AXES.map((axis, i) => {
          const a = -Math.PI/2 + i*(2*Math.PI/RADAR_AXES.length);
          const x = cx + Math.cos(a)*R, y = cy + Math.sin(a)*R;
          const lx = cx + Math.cos(a)*(R+18), ly = cy + Math.sin(a)*(R+18);
          return (
            <g key={axis}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,163,184,0.3)" strokeWidth={1}/>
              <text x={lx} y={ly} fontSize={7} fill="#64748b" textAnchor="middle" dominantBaseline="middle">{axis}</text>
            </g>
          );
        })}
        <polygon points={pts(target)} fill="rgba(14,165,233,0.12)" stroke="rgba(14,165,233,0.5)" strokeWidth={1.5}/>
        <polygon points={pts(current)} fill="rgba(15,118,110,0.18)" stroke="#0f766e" strokeWidth={2}/>
      </svg>
      <div style={{display:'flex',gap:12,marginTop:6,fontSize:'0.72rem',color:'#64748b'}}>
        <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(15,118,110,0.4)',borderRadius:2,marginRight:4}}/>You</span>
        <span><span style={{display:'inline-block',width:10,height:10,background:'rgba(14,165,233,0.25)',borderRadius:2,marginRight:4}}/>Target role</span>
      </div>
    </div>
  );
}

// ─── Career Metro Map ──────────────────────────────────────────────────────
const METRO_COLORS = [
  '#7ae0ff','#22c55e','#f59e0b','#c084fc','#fb7185',
];

function CareerMetroMap({ recs = [], marketRoles = [], focusRole = '' }) {
  const W = 420, H = 260, sx = 50, sy = H/2, ex = W-100;
  const top = recs.slice(0,5);
  if (!top.length) return null;
  const maxScore = Math.max(0.01, ...top.map(r => r.finalScore));

  return (
    <div className="cr-card">
      <p className="cr-card-title">🗺 Career Path Map</p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%'}}>
        {top.map((rec, i) => {
          const ny = 30 + (H-60)*i/Math.max(1,top.length-1);
          const y = top.length===1 ? sy : ny;
          const mx = sx+(ex-sx)*0.45;
          const cy2 = sy+(y-sy)*0.3;
          const w = 1.5+(rec.finalScore/maxScore)*3;
          const isFocus = rec.roleName===focusRole;
          return (
            <g key={rec.roleName}>
              <path d={`M ${sx} ${sy} C ${mx} ${cy2}, ${mx+40} ${y}, ${ex} ${y}`}
                fill="none" stroke={METRO_COLORS[i%METRO_COLORS.length]}
                strokeWidth={w} strokeLinecap="round" opacity={isFocus?1:0.55}/>
              {isFocus && <circle cx={ex} cy={y} r={12} fill="none" stroke={METRO_COLORS[i%METRO_COLORS.length]} strokeWidth={1.5} strokeDasharray="3 2" opacity={0.5}/>}
              <circle cx={ex} cy={y} r={6+(rec.finalScore/maxScore)*5}
                fill={METRO_COLORS[i%METRO_COLORS.length]} opacity={0.8}/>
              <text x={ex+14} y={y+4} fontSize={9} fill="#334155">{rec.roleName}</text>
              <text x={ex+14} y={y+14} fontSize={8} fill="#94a3b8">{pct(rec.finalScore)}</text>
            </g>
          );
        })}
        <circle cx={sx} cy={sy} r={10} fill="rgba(156,255,219,0.9)" stroke="rgba(156,255,219,0.4)" strokeWidth={3}/>
        <text x={sx} y={sy+22} fontSize={9} fill="#334155" textAnchor="middle">You</text>
      </svg>
    </div>
  );
}

// ─── Resume Upload ─────────────────────────────────────────────────────────
function ResumeUpload({ onUploaded }) {
  const inputRef = useRef();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handle(file) {
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const res = await career.uploadResume(file);
      onUploaded(res.data.data);
    } catch(e) { setErr(e.response?.data?.message || e.message || 'Upload failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="cr-upload-zone">
      <div style={{fontSize:44,marginBottom:8}}>📄</div>
      <p style={{fontWeight:700,fontSize:'1rem',color:'#0f172a'}}>Upload your resume for richer recommendations</p>
      <p style={{fontSize:'0.82rem',color:'#64748b',marginTop:4}}>PDF · DOC · DOCX · max 10 MB — we extract skills, projects and experience automatically</p>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>handle(e.target.files[0])}/>
      <button className="cr-btn cr-btn-primary" onClick={()=>inputRef.current?.click()} disabled={busy} style={{marginTop:14}}>
        {busy ? '⏳ Extracting…' : '📤 Upload resume'}
      </button>
      {err && <p style={{color:'#dc2626',fontSize:'0.78rem',marginTop:6}}>{err}</p>}
    </div>
  );
}

// ─── Resume Data Display ───────────────────────────────────────────────────
function ResumeDataPanel({ resumeData, resume, onDeleted, onReplaced }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const replaceRef = useRef();

  if (!resumeData?.extractedAt) return null;
  const rd = resumeData;

  async function handleDelete() {
    if (!window.confirm('Delete your resume and extracted data?')) return;
    setDeleting(true);
    try {
      await career.deleteResume();
      onDeleted();
    } catch (e) { alert(e.response?.data?.message || 'Delete failed'); }
    finally { setDeleting(false); }
  }

  async function handleReplace(file) {
    if (!file) return;
    setReplacing(true);
    try {
      const res = await career.uploadResume(file);
      onReplaced(res.data.data);
    } catch (e) { alert(e.response?.data?.message || 'Upload failed'); }
    finally { setReplacing(false); }
  }

  const viewUrl = career.viewResumeUrl();
  const token = localStorage.getItem('token');

  return (
    <div className="cr-card" style={{marginBottom:0}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <p className="cr-card-title" style={{marginBottom:0}}>📋 Extracted Resume Data
          <span className="cr-badge cr-badge-green" style={{marginLeft:8}}>✓ Loaded</span>
        </p>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {/* View resume in new tab */}
          <a
            href={`${viewUrl}?token=${token}`}
            target="_blank" rel="noreferrer"
            className="cr-btn cr-btn-ghost cr-btn-sm"
            title="View resume PDF"
          >👁 View</a>
          {/* Replace resume */}
          <label className="cr-btn cr-btn-ghost cr-btn-sm" style={{cursor:'pointer'}} title="Replace resume">
            {replacing ? '⏳' : '🔄 Replace'}
            <input ref={replaceRef} type="file" accept=".pdf,.doc,.docx" style={{display:'none'}}
              onChange={e=>handleReplace(e.target.files[0])}/>
          </label>
          {/* Delete resume */}
          <button className="cr-btn cr-btn-ghost cr-btn-sm cr-btn-danger" onClick={handleDelete} disabled={deleting} title="Delete resume">
            {deleting ? '⏳' : '🗑 Delete'}
          </button>
          <button className="cr-btn cr-btn-ghost cr-btn-sm" onClick={()=>setExpanded(v=>!v)}>
            {expanded ? '▲ Collapse' : '▼ Expand'}
          </button>
        </div>
      </div>

      {/* Always visible summary */}
      <div className="cr-resume-summary" style={{marginTop:12}}>
        {[
          ['Name',   rd.name || '—'],
          ['College',rd.college || '—'],
          ['Branch', rd.branch  || '—'],
          ['Year',   rd.year    || '—'],
        ].map(([label,val])=>(
          <div key={label} className="cr-resume-meta-item">
            <span className="cr-meta-label">{label}</span>
            <span className="cr-meta-val">{val}</span>
          </div>
        ))}
      </div>

      {/* Skills always visible */}
      {rd.skills?.length > 0 && (
        <div style={{marginTop:12}}>
          <p style={{fontSize:'0.72rem',fontWeight:700,color:'#0f766e',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>
            ⚡ {rd.skills.length} skills extracted
          </p>
          <div className="cr-pill-row">
            {rd.skills.slice(0,expanded?undefined:18).map((s,i)=>(
              <span key={i} className="cr-pill">{typeof s==='string'?s:s.name}</span>
            ))}
            {!expanded && rd.skills.length>18 && (
              <button className="cr-pill cr-pill-more" onClick={()=>setExpanded(true)}>+{rd.skills.length-18} more</button>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <>
          {rd.objective && (
            <div style={{marginTop:12}}>
              <p className="cr-section-label">🎯 Objective</p>
              <p style={{fontSize:'0.83rem',color:'#334155',lineHeight:1.6}}>{rd.objective}</p>
            </div>
          )}
          {rd.projects?.length > 0 && (
            <div style={{marginTop:12}}>
              <p className="cr-section-label">🔨 Projects ({rd.projects.length})</p>
              <ul className="cr-list">
                {rd.projects.map((p,i)=><li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {rd.experience?.length > 0 && (
            <div style={{marginTop:12}}>
              <p className="cr-section-label">💼 Experience ({rd.experience.length})</p>
              <ul className="cr-list">
                {rd.experience.map((e,i)=><li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
          {rd.certifications?.length > 0 && (
            <div style={{marginTop:12}}>
              <p className="cr-section-label">🎓 Certifications</p>
              <div className="cr-pill-row">
                {rd.certifications.map((c,i)=><span key={i} className="cr-pill cr-pill-blue">{c}</span>)}
              </div>
            </div>
          )}
          {resume?.originalName && (
            <p style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:12}}>
              📎 {resume.originalName} · extracted {new Date(resumeData.extractedAt).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab({ user, resumeData, resume, recs, market, jobs, topRole, hasResume, onUploaded, onDeleted, jobLocation, onJobLocationChange, jobsLoading }) {
  const topRoles = market?.snapshot?.roles?.slice(0,5) || [];
  const topSkills = market?.snapshot?.topSkills || [];
  const topRec = recs[0];

  return (
    <div className="cr-grid-main">
      {/* Left column */}
      <div className="cr-col">
        {/* Resume section */}
        {hasResume
          ? <ResumeDataPanel resumeData={resumeData} resume={resume} onDeleted={onDeleted} onReplaced={onUploaded}/>
          : <ResumeUpload onUploaded={onUploaded}/>
        }

        {/* Top role hero */}
        {topRec && (
          <div className="cr-card cr-hero-card">
            <p className="cr-card-title">🏆 Top career match</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
              <div>
                <p style={{fontWeight:800,fontSize:'1.3rem',color:'#0f766e'}}>{topRec.roleName}</p>
                <ReadinessBadge score={topRec.finalScore}/>
              </div>
              <div style={{textAlign:'right'}}>
                <p style={{fontSize:'0.72rem',color:'#64748b'}}>Skill match</p>
                <p style={{fontWeight:700,color:'#0f172a'}}>{pct(topRec.contentScore)}</p>
              </div>
            </div>
            <ScoreBar value={topRec.finalScore} color="#0f766e" height={8}/>
          </div>
        )}

        {/* Career metro map */}
        <CareerMetroMap recs={recs} marketRoles={topRoles} focusRole={topRole}/>

        {/* All top matches */}
        {recs.length > 0 && (
          <div className="cr-card">
            <p className="cr-card-title">🎯 All matches</p>
            {recs.map((r,i)=>(
              <div key={i} style={{padding:'9px 0',borderBottom:'1px solid rgba(148,163,184,0.15)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:'0.86rem'}}>{i+1}. {r.roleName}</span>
                  <ReadinessBadge score={r.finalScore}/>
                </div>
                <ScoreBar value={r.finalScore}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="cr-col">
        {/* Skill radar */}
        {topRec && (
          <SkillRadar
            skills={resumeData?.skills || []}
            roleName={topRec.roleName}
          />
        )}

        {/* Market demand */}
        {topRoles.length > 0 && (
          <div className="cr-card">
            <p className="cr-card-title">📈 Market demand</p>
            {topRoles.map((r,i)=>{
              const name = r.roleName??r.role_name;
              const demand = r.demandIndex??r.demand_index??0;
              return (
                <div key={i} style={{padding:'8px 0',borderBottom:'1px solid rgba(148,163,184,0.12)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:'0.82rem',fontWeight:600}}>{name}</span>
                    <span style={{fontSize:'0.75rem',color:'#0f766e',fontWeight:700}}>{r.openings} openings</span>
                  </div>
                  <ScoreBar value={demand} color="#0ea5e9"/>
                </div>
              );
            })}
            {topSkills.length > 0 && (
              <div style={{marginTop:14}}>
                <p className="cr-section-label">🔥 In-demand skills</p>
                <div className="cr-pill-row" style={{marginTop:6}}>
                  {topSkills.map((s,i)=><span key={i} className="cr-pill">{s}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live jobs */}
        <div className="cr-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <p className="cr-card-title" style={{marginBottom:0}}>💼 Live openings — {topRole}</p>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              <input
                className="cr-input"
                style={{width:130,padding:'5px 10px',fontSize:'0.78rem'}}
                placeholder="📍 Location…"
                value={jobLocation}
                onChange={e=>onJobLocationChange(e.target.value)}
              />
            </div>
          </div>
          {jobsLoading
            ? <div style={{textAlign:'center',padding:'20px 0',color:'#94a3b8',fontSize:'0.82rem'}}>⏳ Fetching jobs…</div>
            : jobs.length === 0
              ? <p style={{fontSize:'0.8rem',color:'#94a3b8'}}>No jobs found for this location.</p>
              : jobs.slice(0,10).map((j,i)=>(
                <div key={i} className="cr-job-row">
                  <div>
                    <a href={j.url} target="_blank" rel="noreferrer" className="cr-job-title">{j.title}</a>
                    <p className="cr-job-meta">{j.company}{j.location ? ` · ${j.location}` : ''}</p>
                  </div>
                  <span className="cr-badge">{j.source}</span>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── Recommendations Tab ───────────────────────────────────────────────────
function RecommendationsTab({ recs, explanation, selectedRole, setSelectedRole, careerGoal, setCareerGoal, onSkillGap, skillGap, sgLoading }) {
  return (
    <div className="cr-grid-main">
      {/* Left — role list */}
      <div className="cr-col">
        <div className="cr-card">
          <p className="cr-card-title">🎯 Role recommendations</p>
          {recs.map((r,i)=>{
            const active = selectedRole===r.roleName;
            return (
              <button key={i} type="button" onClick={()=>setSelectedRole(r.roleName)} className={`cr-role-btn ${active?'active':''}`}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                  <span style={{fontWeight:700,fontSize:'0.9rem',color:active?'#0f766e':'#0f172a'}}>{i+1}. {r.roleName}</span>
                  <ReadinessBadge score={r.finalScore}/>
                </div>
                <ScoreBar value={r.finalScore} color={active?'#0f766e':'#94a3b8'}/>
                <div style={{display:'flex',gap:16,marginTop:5,fontSize:'0.7rem',color:'#64748b'}}>
                  <span>Skill match {pct(r.contentScore)}</span>
                  <span>CF {pct(r.cfScore)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right — skill gap + explanation */}
      <div className="cr-col">
        {selectedRole && (
          <div className="cr-card">
            <p className="cr-card-title">🗺️ Skill gap — {selectedRole}</p>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input
                className="cr-input"
                placeholder="Career goal (optional)…"
                value={careerGoal}
                onChange={e=>setCareerGoal(e.target.value)}
              />
              <button className="cr-btn cr-btn-primary" onClick={()=>onSkillGap(selectedRole)} disabled={sgLoading}>
                {sgLoading ? <><span style={{display:'inline-block',animation:'cr-spin 1s linear infinite'}}>&#8635;</span> Analyzing…</> : 'Analyze'}
              </button>
            </div>

            {skillGap && (
              <div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
                  <span style={{fontSize:'0.78rem',color:'#64748b'}}>Readiness</span>
                  <div style={{flex:1}}><ScoreBar value={skillGap.readiness} height={8}/></div>
                  <span style={{fontWeight:700,color:'#0f766e',fontSize:'0.85rem'}}>{pct(skillGap.readiness)}</span>
                </div>
                {skillGap.matched_skills?.length>0 && (
                  <div style={{marginBottom:10}}>
                    <p className="cr-section-label" style={{color:'#16a34a'}}>✅ You have ({skillGap.matched_skills.length})</p>
                    <div className="cr-pill-row" style={{marginTop:5}}>
                      {skillGap.matched_skills.map((s,i)=><span key={i} className="cr-pill cr-pill-green">{s}</span>)}
                    </div>
                  </div>
                )}
                {skillGap.missing_skills?.length>0 && (
                  <div>
                    <p className="cr-section-label" style={{color:'#dc2626'}}>❌ To learn ({skillGap.missing_skills.length})</p>
                    <div className="cr-pill-row" style={{marginTop:5}}>
                      {skillGap.missing_skills.map((s,i)=><span key={i} className="cr-pill cr-pill-red">{s}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {explanation && (
          <div className="cr-card">
            <p className="cr-card-title">🤖 AI Analysis <span className="cr-badge" style={{marginLeft:6}}>llama3</span></p>
            <div className="cr-markdown">
              <ReactMarkdown remarkPlugins={MD_PLUGINS} components={mdComponents}>{explanation}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── What-If Tab ───────────────────────────────────────────────────────────
function SimulationTab({ simulation, addSkills, removeSkills, setAddSkills, setRemoveSkills, onSimulate, simLoading }) {
  return (
    <div style={{maxWidth:740}}>
      <div className="cr-card" style={{marginBottom:20}}>
        <p className="cr-card-title">🔮 What-If Simulator</p>
        <p style={{fontSize:'0.8rem',color:'#64748b',marginBottom:14}}>
          See how adding or removing skills changes your career fit scores — instant algorithmic simulation.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div>
            <label className="cr-label">Skills to ADD (comma-separated)</label>
            <input className="cr-input" placeholder="e.g. React, AWS, Docker, TensorFlow" value={addSkills} onChange={e=>setAddSkills(e.target.value)}/>
          </div>
          <div>
            <label className="cr-label">Skills to REMOVE (comma-separated)</label>
            <input className="cr-input" placeholder="e.g. Excel, VBA" value={removeSkills} onChange={e=>setRemoveSkills(e.target.value)}/>
          </div>
          <button className="cr-btn cr-btn-primary" style={{alignSelf:'flex-start'}} onClick={onSimulate} disabled={simLoading}>
            {simLoading ? '⏳ Simulating…' : '🔮 Run simulation'}
          </button>
        </div>
      </div>

      {simulation?.roles?.length > 0 && (
        <div className="cr-card">
          <p className="cr-card-title">📊 Impact on role scores</p>
          {simulation.roles.slice(0,10).map((r,i)=>{
            const name = r.roleName??r.role_name;
            const delta = r.delta??0;
            const after = r.scoreAfter??r.score_after??0;
            const before = r.scoreBefore??r.score_before??0;
            const pos = delta>0.005;
            const neg = delta<-0.005;
            const barColor = pos?'#16a34a':neg?'#dc2626':'#94a3b8';
            const maxAbs = Math.max(0.01, ...simulation.roles.map(x=>Math.abs(x.delta??0)));
            return (
              <div key={i} style={{padding:'10px 0',borderBottom:'1px solid rgba(148,163,184,0.15)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:'0.85rem'}}>{name}</span>
                  <span style={{fontWeight:700,color:barColor,fontSize:'0.82rem'}}>
                    {pos?'+':neg?'':''}{(delta*100).toFixed(1)}% {pos?'↑':neg?'↓':'→'}
                  </span>
                </div>
                <ScoreBar value={after} color={barColor}/>
                <div style={{display:'flex',gap:16,marginTop:4,fontSize:'0.7rem',color:'#94a3b8'}}>
                  <span>Before {(before*100).toFixed(1)}%</span>
                  <span>After {(after*100).toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Roadmap Tab ───────────────────────────────────────────────────────────
function RoadmapTab({ skillGap, selectedRole }) {
  if (!skillGap?.roadmap) return (
    <div style={{textAlign:'center',padding:'60px 0',color:'#94a3b8'}}>
      <p style={{fontSize:'2.5rem',marginBottom:10}}>🗺️</p>
      <p style={{fontWeight:600,fontSize:'1rem'}}>Select a role in the Roles tab, then click Analyze to generate your personalized roadmap.</p>
    </div>
  );

  const { phases, immediate_action, six_month_outcome, readiness_summary } = skillGap.roadmap;

  return (
    <div style={{maxWidth:800}}>
      {/* Header with LLM badge */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <h2 style={{fontSize:'1.1rem',fontWeight:700,margin:0}}>🗺️ Learning Roadmap — {skillGap.role}</h2>
        {skillGap.llm_powered
          ? <span className="cr-badge cr-badge-green">✨ llama3 powered</span>
          : <span className="cr-badge">⚙️ algorithmic</span>
        }
      </div>
      {/* Readiness summary */}
      {readiness_summary && (
        <div className="cr-card cr-info-card" style={{marginBottom:16}}>
          <p style={{fontSize:'0.78rem',fontWeight:700,color:'#0369a1',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>📊 Readiness summary</p>
          <p style={{fontSize:'0.9rem',color:'#0f172a',lineHeight:1.6}}>{readiness_summary}</p>
        </div>
      )}
      {immediate_action && (
        <div className="cr-card cr-accent-card" style={{marginBottom:16}}>
          <p style={{fontSize:'0.78rem',fontWeight:700,color:'#0f766e',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>⚡ Immediate action</p>
          <p style={{fontSize:'0.9rem',color:'#0f172a',lineHeight:1.6}}>{immediate_action}</p>
        </div>
      )}

      {/* Phase timeline */}
      <div className="cr-timeline">
        {(phases||[]).map((ph,i)=>(
          <div key={i} className="cr-timeline-item">
            <div className="cr-timeline-dot">{ph.phase}</div>
            <div className="cr-timeline-body">
              <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
                <span style={{fontWeight:700,fontSize:'0.95rem'}}>Phase {ph.phase}: {ph.title}</span>
                <span className="cr-badge">{ph.duration}</span>
              </div>
              {ph.skills?.length>0 && (
                <div className="cr-pill-row" style={{marginBottom:8}}>
                  {ph.skills.map((s,j)=><span key={j} className="cr-pill cr-pill-blue">{s}</span>)}
                </div>
              )}
              {ph.actions?.length>0 && (
                <ul className="cr-list">
                  {ph.actions.map((a,j)=><li key={j}>{a}</li>)}
                </ul>
              )}
              {ph.milestone && <p className="cr-milestone">🏁 {ph.milestone}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Resources */}
      {skillGap.resources?.length>0 && (
        <div className="cr-card" style={{marginTop:20}}>
          <p className="cr-card-title">📚 Learning resources</p>
          {skillGap.resources.slice(0,6).map((res,i)=>(
            <div key={i} style={{marginBottom:12}}>
              <p style={{fontWeight:600,fontSize:'0.85rem',color:'#0f172a',marginBottom:4}}>{res.skill}</p>
              <div style={{display:'flex',flexDirection:'column',gap:3}}>
                {res.resources?.map((r,j)=>(
                  <a key={j} href={r.url} target="_blank" rel="noreferrer" className="cr-resource-link">
                    🔗 {r.title}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {six_month_outcome && (
        <div className="cr-card cr-info-card" style={{marginTop:16}}>
          <p style={{fontSize:'0.78rem',fontWeight:700,color:'#0369a1',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>🚀 6-month outcome</p>
          <p style={{fontSize:'0.9rem',color:'#0f172a',lineHeight:1.6}}>{six_month_outcome}</p>
        </div>
      )}
    </div>
  );
}

// ─── AI Advisors Tab ───────────────────────────────────────────────────────
const PERSONAS = [
  { key:'mentor',     label:'Mentor',     emoji:'🎓', desc:'Supportive career coach' },
  { key:'recruiter',  label:'Recruiter',  emoji:'🏢', desc:'Market reality & hiring bar' },
  { key:'future_you', label:'Future You', emoji:'🔭', desc:'Your future self, 2 years on' },
];

function AdvisorsTab({ chats, onSend, onInputChange, targetRole }) {
  const [active, setActive] = useState('mentor');
  const bottomRef = useRef();
  const chat = chats[active] || { messages:[], input:'', loading:false };

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [chat.messages]);

  return (
    <div className="cr-advisors">
      {/* Persona sidebar */}
      <div className="cr-persona-list">
        {PERSONAS.map(p=>(
          <button key={p.key} type="button" onClick={()=>setActive(p.key)} className={`cr-persona-btn ${active===p.key?'active':''}`}>
            <span style={{fontSize:'1.6rem'}}>{p.emoji}</span>
            <span style={{fontWeight:700,fontSize:'0.82rem'}}>{p.label}</span>
            <span style={{fontSize:'0.7rem',color:'#64748b',lineHeight:1.3}}>{p.desc}</span>
          </button>
        ))}
        {targetRole && (
          <div className="cr-persona-role-hint">
            <span style={{fontSize:'0.72rem',color:'#64748b'}}>Discussing</span>
            <span style={{fontWeight:700,fontSize:'0.78rem',color:'#0f766e'}}>{targetRole}</span>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="cr-chat-area">
        <div className="cr-messages">
          {chat.messages.length===0 && (
            <div style={{color:'#94a3b8',textAlign:'center',padding:'40px 0',fontSize:'0.85rem'}}>
              Start chatting with your {PERSONAS.find(p=>p.key===active)?.label}…
            </div>
          )}
          {chat.messages.map((m,i)=>(
            <div key={i} className={`cr-msg cr-msg-${m.speaker}`}>
              <div className="cr-msg-bubble">
                {m.speaker==='assistant'
                  ? <div className="cr-markdown cr-markdown-sm"><ReactMarkdown remarkPlugins={MD_PLUGINS} components={mdComponents}>{m.message}</ReactMarkdown></div>
                  : m.message
                }
              </div>
            </div>
          ))}
          {chat.loading && <div style={{color:'#94a3b8',fontSize:'0.8rem',padding:'8px 0'}}>⏳ Thinking…</div>}
          <div ref={bottomRef}/>
        </div>
        <div className="cr-chat-input-row">
          <input
            className="cr-input"
            style={{flex:1}}
            placeholder={`Ask your ${PERSONAS.find(p=>p.key===active)?.label} about ${targetRole||'your career'}…`}
            value={chat.input}
            onChange={e=>onInputChange(active,e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); onSend(active,chat.input); } }}
          />
          <button className="cr-btn cr-btn-primary" onClick={()=>onSend(active,chat.input)} disabled={chat.loading||!chat.input.trim()}>
            Send ↵
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
const TABS = [
  {key:'overview',        label:'Overview',    icon:'📊'},
  {key:'recommendations', label:'Roles',       icon:'🎯'},
  {key:'simulation',      label:'What-If',     icon:'🔮'},
  {key:'roadmap',         label:'Roadmap',     icon:'🗺️'},
  {key:'advisors',        label:'AI Advisors', icon:'💬'},
];

const initChats = () => Object.fromEntries(PERSONAS.map(p=>[p.key,{messages:[],input:'',loading:false}]));

export default function CareerRecommendation() {
  const { user } = useAuth();

  const [tab, setTab]               = useState('overview');
  const [resumeData, setResumeData] = useState(null);
  const [resume, setResume]         = useState(null);
  const [hasResume, setHasResume]   = useState(false);
  const [recs, setRecs]             = useState([]);
  const [explanation, setExplanation] = useState('');
  const [market, setMarket]         = useState(null);
  const [jobs, setJobs]             = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [skillGap, setSkillGap]     = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [addSkills, setAddSkills]   = useState('');
  const [removeSkills, setRemoveSkills] = useState('');
  const [chats, setChats]           = useState(initChats);
  const [loading, setLoading]       = useState(true);
  const [recLoading, setRecLoading] = useState(false);
  const [sgLoading, setSgLoading]   = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [err, setErr]               = useState('');
  const [jobLocation, setJobLocation] = useState(() => localStorage.getItem('cr_job_location') || '');

  function saveJobLocation(val) {
    setJobLocation(val);
    localStorage.setItem('cr_job_location', val);
  }

  const topRole = recs[0]?.roleName || 'software engineer';

  const [cachedAt, setCachedAt]     = useState(null);
  const [isStale, setIsStale]       = useState(false);

  // Normalise recommendations
  const setRecsFromResponse = useCallback((res) => {
    const d = res.data;
    const normalized = (d.data?.recommendations || []).map(norm);
    setRecs(normalized);
    setExplanation(d.data?.explanation || '');
    setCachedAt(d.generatedAt || null);
    setIsStale(d.stale || false);
    if (normalized.length) setSelectedRole(r => r || normalized[0].roleName);
  }, []);

  // Initial load — reads from MongoDB cache, no ML call
  useEffect(()=>{
    (async()=>{
      setLoading(true); setErr('');
      try {
        const [rdRes, mktRes, recRes] = await Promise.allSettled([
          career.getResumeData(),
          career.marketTrends(),
          career.recommend(false),   // false = serve from MongoDB cache
        ]);
        if (rdRes.status==='fulfilled') {
          const d = rdRes.value.data.data;
          if (d?.resumeData?.extractedAt) { setResumeData(d.resumeData); setResume(d.resume); setHasResume(true); }
        }
        if (mktRes.status==='fulfilled') setMarket(mktRes.value.data.data);
        if (recRes.status==='fulfilled') setRecsFromResponse(recRes.value);
        // If rec failed (ML down + no cache), show soft warning only
        if (recRes.status==='rejected') setErr('ml_down');
      } catch(e) {
        setErr('ml_down');
      } finally { setLoading(false); }
    })();
  }, []);

  // Refresh jobs when top role or location changes
  useEffect(()=>{
    if (!topRole || loading) return;
    setJobsLoading(true);
    career.liveJobs(topRole, jobLocation || undefined, 20)
      .then(r=>setJobs((r.data.data?.jobs||[]).map(normJob)))
      .catch(()=>{})
      .finally(()=>setJobsLoading(false));
  }, [topRole, jobLocation]);

  async function handleUploaded(data) {
    if (data?.resumeData) { setResumeData(data.resumeData); setResume(data.resume||null); setHasResume(true); }
    setRecLoading(true); setErr('');
    try {
      const res = await career.recommend(true); // force = hit ML + save to MongoDB
      setRecsFromResponse(res);
    } catch(e) { setErr('ml_down'); }
    finally { setRecLoading(false); }
  }

  function handleDeleted() {
    setResumeData(null); setResume(null); setHasResume(false);
    setRecs([]); setExplanation(''); setCachedAt(null); setIsStale(false);
  }

  async function handleRefresh() {
    setRecLoading(true); setErr('');
    try {
      const res = await career.recommend(true); // force = hit ML + save to MongoDB
      setRecsFromResponse(res);
    } catch(e) { setErr('ml_down'); }
    finally { setRecLoading(false); }
  }

  async function handleSkillGap(role) {
    setSgLoading(true);
    try {
      const res = await career.skillGap(role, careerGoal);
      setSkillGap(res.data.data);
    } catch(e) { console.error(e); }
    finally { setSgLoading(false); }
  }

  async function handleSimulate() {
    const added   = addSkills.split(',').map(s=>s.trim()).filter(Boolean);
    const removed = removeSkills.split(',').map(s=>s.trim()).filter(Boolean);
    if (!added.length && !removed.length) return;
    setSimLoading(true);
    try {
      const res = await career.simulate(added, removed);
      setSimulation(res.data.data);
    } catch(e) { console.error(e); }
    finally { setSimLoading(false); }
  }

  async function handleChatSend(persona, message) {
    const trimmed = message.trim();
    if (!trimmed) return;
    const prev = chats[persona].messages;
    setChats(c=>({...c,[persona]:{...c[persona],messages:[...prev,{speaker:'user',message:trimmed}],input:'',loading:true}}));
    try {
      const res = await career.roleChat(selectedRole||topRole, persona, trimmed, prev);
      const reply = res.data.data?.reply || res.data.data?.message || '';
      setChats(c=>({...c,[persona]:{...c[persona],messages:[...c[persona].messages,{speaker:'assistant',message:reply}],loading:false}}));
    } catch(e) {
      setChats(c=>({...c,[persona]:{...c[persona],messages:[...c[persona].messages,{speaker:'assistant',message:`⚠️ ${e.message}`}],loading:false}}));
    }
  }

  function handleChatInput(persona, value) {
    setChats(c=>({...c,[persona]:{...c[persona],input:value}}));
  }

  if (loading) return <Skeleton/>;

  return (
    <div className="cr-page">
      <div className="cr-shell">
        {/* ── Header ── */}
        <header className="cr-header">
          <div className="cr-header-left">
            <span className="cr-eyebrow">🤖 Powered by llama3 via Ollama · scikit-learn recommendation engine</span>
            <h1 className="cr-title">Career Recommendation</h1>
            <p className="cr-subtitle">
              AI-powered career path analysis from your learning data{hasResume?' + extracted resume data':''}.
              Recommendations adapt as your skills grow.
            </p>
          </div>
          <div className="cr-header-actions">
            {hasResume
              ? (
                <>
                  <span className="cr-badge cr-badge-green" style={{padding:'6px 12px',fontSize:'0.8rem'}}>✅ Resume loaded</span>
                  <label className="cr-btn" style={{cursor:'pointer'}} title="Replace resume">
                    🔄 Replace resume
                    <input type="file" accept=".pdf,.doc,.docx" style={{display:'none'}}
                      onChange={async e=>{
                        if(e.target.files[0]) {
                          try { const r = await career.uploadResume(e.target.files[0]); await handleUploaded(r.data.data); } catch {}
                        }
                      }}/>
                  </label>
                </>
              )
              : (
                <label className="cr-btn cr-btn-primary" style={{cursor:'pointer'}}>
                  📤 Upload resume
                  <input type="file" accept=".pdf,.doc,.docx" style={{display:'none'}}
                    onChange={async e=>{
                      if(e.target.files[0]) {
                        try { const r = await career.uploadResume(e.target.files[0]); await handleUploaded(r.data.data); } catch {}
                      }
                    }}/>
                </label>
              )
            }
            <button className="cr-btn" onClick={handleRefresh} disabled={recLoading}>
              <span style={{display:'inline-block',animation:recLoading?'cr-spin 1s linear infinite':'none'}}>↻</span>
              {recLoading?'Refreshing…':'Refresh AI'}
            </button>
          </div>
        </header>

        {/* ── KPI strip ── */}
        {recs.length > 0 && (
          <div className="cr-kpi-strip">
            <div className="cr-kpi">
              <span className="cr-kpi-label">Top match</span>
              <span className="cr-kpi-value" style={{color:'#0f766e'}}>{recs[0]?.roleName}</span>
              <ReadinessBadge score={recs[0]?.finalScore}/>
            </div>
            <div className="cr-kpi">
              <span className="cr-kpi-label">Roles analysed</span>
              <span className="cr-kpi-value">{recs.length}</span>
            </div>
            <div className="cr-kpi">
              <span className="cr-kpi-label">Skills extracted</span>
              <span className="cr-kpi-value">{resumeData?.skills?.length||0}</span>
            </div>
            <div className="cr-kpi">
              <span className="cr-kpi-label">Resume status</span>
              <span className="cr-kpi-value" style={{color:hasResume?'#16a34a':'#d97706'}}>{hasResume?'✓ Loaded':'⚠ Not uploaded'}</span>
            </div>
          </div>
        )}

        {/* ── Stale cache notice (soft) ── */}
        {isStale && recs.length > 0 && (
          <div className="cr-stale-banner">
            ⚠️ Showing last saved recommendations (ML service was unreachable). Click Refresh AI when it's back online.
          </div>
        )}

        {/* ── Hard error: no cache AND ML down ── */}
        {err === 'ml_down' && recs.length === 0 && (
          <div className="cr-error-banner">
            ML service is not running. Start it with: <code>cd ml_service &amp;&amp; python3 main.py</code>
            <br/><span style={{fontSize:'0.75rem',opacity:0.8}}>Recommendations will appear after the first successful run.</span>
          </div>
        )}

        {/* ── Cached-at notice ── */}
        {cachedAt && recs.length > 0 && !isStale && (
          <div className="cr-cache-notice">
            ✅ Recommendations from {new Date(cachedAt).toLocaleString()} · click <strong>Refresh AI</strong> to regenerate
          </div>
        )}

        {/* ── Tab nav ── */}
        <div className="cr-tabs">
          {TABS.map(t=>(
            <button key={t.key} type="button" onClick={()=>setTab(t.key)} className={`cr-tab ${tab===t.key?'active':''}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="cr-tab-content cr-fade-up">
          {tab==='overview' && (
            <OverviewTab user={user} resumeData={resumeData} resume={resume}
              recs={recs} market={market} jobs={jobs} topRole={topRole}
              hasResume={hasResume} onUploaded={handleUploaded} onDeleted={handleDeleted}
              jobLocation={jobLocation} onJobLocationChange={saveJobLocation} jobsLoading={jobsLoading}/>
          )}
          {tab==='recommendations' && (
            <RecommendationsTab recs={recs} explanation={explanation}
              selectedRole={selectedRole} setSelectedRole={setSelectedRole}
              careerGoal={careerGoal} setCareerGoal={setCareerGoal}
              onSkillGap={handleSkillGap} skillGap={skillGap} sgLoading={sgLoading}/>
          )}
          {tab==='simulation' && (
            <SimulationTab simulation={simulation}
              addSkills={addSkills} removeSkills={removeSkills}
              setAddSkills={setAddSkills} setRemoveSkills={setRemoveSkills}
              onSimulate={handleSimulate} simLoading={simLoading}/>
          )}
          {tab==='roadmap' && <RoadmapTab skillGap={skillGap} selectedRole={selectedRole}/>}
          {tab==='advisors' && (
            <AdvisorsTab chats={chats} onSend={handleChatSend}
              onInputChange={handleChatInput} targetRole={selectedRole||topRole}/>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="cr-page">
      <div className="cr-shell" style={{animationName:'none'}}>
        <div style={{height:32,width:200,background:'#e2e8f0',borderRadius:8,marginBottom:16}}/>
        <div style={{height:48,width:340,background:'#e2e8f0',borderRadius:12,marginBottom:12}}/>
        <div style={{height:20,width:480,background:'#f1f5f9',borderRadius:8,marginBottom:32}}/>
        <div className="cr-grid-main">
          {[1,2].map(i=>(
            <div key={i} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{height:200,background:'#f1f5f9',borderRadius:16}}/>
              <div style={{height:160,background:'#f1f5f9',borderRadius:16}}/>
              <div style={{height:120,background:'#f1f5f9',borderRadius:16}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
