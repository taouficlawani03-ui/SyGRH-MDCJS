'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ================================================================
// CONSTANTES
// ================================================================
const CAT_COLORS = {
  A1:'#1e40af', A2:'#0369a1', A3:'#0e7490',
  B:'#059669', C:'#d97706', D:'#dc2626', '00':'#7c3aed'
};
const STATUT_STYLE = {
  'En attente': { bg:'#fef9c3', color:'#92400e', icon:'⏳' },
  'Approuvé':   { bg:'#d1fae5', color:'#065f46', icon:'✅' },
  'Rejeté':     { bg:'#fee2e2', color:'#991b1b', icon:'❌' },
  'Annulé':     { bg:'#f1f5f9', color:'#475569', icon:'🚫' },
};

const TABS = [
  { id:'accueil',  label:'Accueil',   icon:'🏠' },
  { id:'agents',   label:'Agents',    icon:'👥' },
  { id:'chat',     label:'Chat',      icon:'💬' },
  { id:'rh',       label:'Demandes RH',icon:'📋' },
  { id:'fichiers', label:'Fichiers',   icon:'📁' },
  { id:'users',    label:'Utilisateurs',icon:'⚙️' },
];

const fmt = (v) => (!v || v === 'null' || v === 'undefined' || v === 'nan') ? '—' : v;
const initials = (nom, pre) => ((nom||'A').charAt(0) + (pre||'A').charAt(0)).toUpperCase();
const fmtSize = (b) => {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
};
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch(e) { return d; }
};
const fileIcon = (name) => {
  const e = (name||'a.txt').split('.').pop().toLowerCase();
  if (e==='pdf') return '📄';
  if (['xlsx','xls','csv'].includes(e)) return '📊';
  if (['docx','doc'].includes(e)) return '📝';
  if (['jpg','jpeg','png','gif'].includes(e)) return '🖼️';
  return '📎';
};

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function SyGRH() {
  const router   = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('accueil');
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agents,     setAgents]     = useState([]);
  const [directions, setDirections] = useState([]);
  const [stats,      setStats]      = useState({});
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/'); return; }
        setUser(session.user);
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        setProfile(prof);
        const [{ data: ag }, { data: dirs }] = await Promise.all([
          supabase.from('agents').select('*').order('nom'),
          supabase.from('directions').select('*').order('nom'),
        ]);
        const agData = ag || [];
        const dirData = dirs || [];
        setAgents(agData);
        setDirections(dirData);
        const catA = agData.filter(a => ['A1','A2','A3'].includes(a.categorie)).length;
        setStats({
          total:  agData.length,
          femmes: agData.filter(a => a.sexe === 'F').length,
          hommes: agData.filter(a => a.sexe === 'M').length,
          catA,
          dirs:   dirData.length,
          retraiteN1: agData.filter(a => a.retraite_n1 === true || a.retraite_n1 === 'OUI' || a.retraite_n1 === 'true').length,
        });
        // Compter les demandes en attente
        try {
          const { data: pending } = await supabase.from('conges').select('id', { count: 'exact' }).eq('statut', 'En attente');
          setNotifCount(pending?.length || 0);
        } catch(_) {}
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#fff' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🏛️</div>
          <div style={{ fontSize:16, fontWeight:600 }}>SyGRH — Chargement...</div>
          <div style={{ width:40, height:40, border:'4px solid rgba(255,255,255,0.2)', borderTop:'4px solid #38bdf8', borderRadius:'50%', margin:'16px auto 0', animation:'spin 1s linear infinite' }} />
          <style>{'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
        </div>
      </div>
    );
  }

  const role = profile?.role || 'agent';
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'users') return role === 'admin';
    if (t.id === 'fichiers') return ['admin','directeur'].includes(role);
    return true;
  });

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'Segoe UI, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#0f172a', padding:'0 24px', display:'flex', alignItems:'center', gap:12, height:58, position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize:22 }}>🏛️</div>
        <div>
          <div style={{ color:'#f8fafc', fontWeight:900, fontSize:15, letterSpacing:0.5 }}>SyGRH — MDCJS</div>
          <div style={{ color:'#94a3b8', fontSize:10 }}>Ministère des Sports & Loisirs</div>
        </div>
        <div style={{ flex:1 }} />
        {notifCount > 0 && (
          <button onClick={() => setActiveTab('rh')} style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            {notifCount} en attente
          </button>
        )}
        <div style={{ color:'#94a3b8', fontSize:12 }}>
          {profile?.nom_complet || user?.email?.split('@')[0] || 'Utilisateur'} · <span style={{ color:'#38bdf8' }}>{role}</span>
        </div>
        <button onClick={handleLogout} style={{ background:'transparent', border:'1px solid #475569', color:'#94a3b8', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12 }}>
          Déconnexion
        </button>
      </div>

      {/* Nav Tabs */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', padding:'0 20px', gap:2, overflowX:'auto' }}>
        {visibleTabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background:'transparent', border:'none', borderBottom: activeTab===t.id ? '3px solid #1e40af' : '3px solid transparent',
            padding:'14px 18px', cursor:'pointer', fontWeight: activeTab===t.id ? 800 : 600,
            fontSize:13, color: activeTab===t.id ? '#1e40af' : '#64748b', whiteSpace:'nowrap',
            display:'flex', alignItems:'center', gap:6, transition:'all .15s'
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:'24px 24px', maxWidth:1400, margin:'0 auto' }}>
        {activeTab==='accueil'  && <TabAccueil stats={stats} agents={agents} directions={directions} profile={profile} setActiveTab={setActiveTab} />}
        {activeTab==='agents'   && <TabAgents  agents={agents} directions={directions} profile={profile} />}
        {activeTab==='chat'     && <TabChat    supabase={supabase} profile={profile} directions={directions} agents={agents} />}
        {activeTab==='rh'       && <TabRH      supabase={supabase} profile={profile} agents={agents} directions={directions} />}
        {activeTab==='fichiers' && <TabFichiers supabase={supabase} profile={profile} />}
        {activeTab==='users'    && role==='admin' && <TabUsers supabase={supabase} directions={directions} profile={profile} />}
      </div>
    </div>
  );
}

// ================================================================
// SVG CHARTS
// ================================================================
function DonutChart({ data, size=160 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ textAlign:'center', color:'#94a3b8' }}>Aucune donnée</div>;
  let cumAngle = -90;
  const segments = data.map(d => {
    const angle = (d.value / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, startAngle: start, endAngle: start + angle };
  });
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const polarToCart = (cx, cy, r, angle) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  return (
    <svg width={size} height={size} style={{ display:'block', margin:'0 auto' }}>
      {segments.map((s, i) => {
        const largeArc = s.endAngle - s.startAngle > 180 ? 1 : 0;
        const p1 = polarToCart(cx, cy, r, s.startAngle);
        const p2 = polarToCart(cx, cy, r, s.endAngle);
        const ir = r - 30;
        const p3 = polarToCart(cx, cy, ir, s.endAngle);
        const p4 = polarToCart(cx, cy, ir, s.startAngle);
        const d = [
          `M ${p1.x} ${p1.y}`,
          `A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
          `L ${p3.x} ${p3.y}`,
          `A ${ir} ${ir} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
          'Z'
        ].join(' ');
        return <path key={i} d={d} fill={s.color} opacity={0.9} />;
      })}
      <text x={cx} y={cy+4} textAnchor="middle" fontSize="16" fontWeight="900" fill="#1e293b">{total}</text>
    </svg>
  );
}

function HBarChart({ data, max, colors, height=20 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:58, fontSize:11, fontWeight:700, color:colors?.[i] || '#64748b', textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
          <div style={{ flex:1, height, background:'#f1f5f9', borderRadius:height, overflow:'hidden' }}>
            <div style={{ width:`${Math.max(2, Math.round(d.value / max * 100))}%`, height:'100%', background: colors?.[i] || '#1e40af', borderRadius:height, transition:'width .4s', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:6 }}>
              {d.value > max/10 && <span style={{ color:'#fff', fontSize:10, fontWeight:800 }}>{d.value}</span>}
            </div>
          </div>
          {d.value <= max/10 && <span style={{ fontSize:11, fontWeight:700, color:'#64748b', width:24 }}>{d.value}</span>}
        </div>
      ))}
    </div>
  );
}

// ================================================================
// ONGLET ACCUEIL
// ================================================================
function TabAccueil({ stats, agents, directions, profile, setActiveTab }) {
  const catData = ['A1','A2','A3','B','C','D','00'].map(c => ({
    label: c, value: agents.filter(a => a.categorie === c).length, color: CAT_COLORS[c] || '#94a3b8'
  })).filter(d => d.value > 0);

  const dirData = [...directions]
    .map(d => ({ label: d.code || d.nom?.slice(0,10), value: agents.filter(a => a.direction_code === d.code).length }))
    .sort((a,b) => b.value - a.value).slice(0, 10);

  const maxDir = dirData[0]?.value || 1;
  const dirColors = dirData.map((_,i) => `hsl(${200 + i * 16}, 70%, ${45+i*2}%)`);

  const donutData = [
    { label:'Hommes', value: stats.hommes || 0, color:'#1e40af' },
    { label:'Femmes', value: stats.femmes || 0, color:'#db2777' },
  ];

  const kpis = [
    { label:'Total agents',  val: stats.total||0,     icon:'👥', color:'#1e40af', bg:'#dbeafe' },
    { label:'Femmes',        val: stats.femmes||0,    icon:'👩', color:'#db2777', bg:'#fce7f3' },
    { label:'Hommes',        val: stats.hommes||0,    icon:'👨', color:'#0369a1', bg:'#e0f2fe' },
    { label:'Catégorie A',   val: stats.catA||0,      icon:'⭐', color:'#059669', bg:'#d1fae5' },
    { label:'Directions',    val: stats.dirs||0,      icon:'🏢', color:'#7c3aed', bg:'#ede9fe' },
    { label:'Retraite N+1',  val: stats.retraiteN1||0,icon:'⏰', color:'#dc2626', bg:'#fee2e2' },
  ];

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:20, color:'#0f172a', marginBottom:20 }}>
        🏠 Tableau de bord — {new Date().toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(155px, 1fr))', gap:12, marginBottom:20 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, padding:'16px 14px', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, marginBottom:10 }}>{k.icon}</div>
            <div style={{ fontSize:30, fontWeight:900, color:k.color, lineHeight:1 }}>{k.val}</div>
            <div style={{ fontSize:11, color:'#64748b', fontWeight:600, marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 200px', gap:16, marginBottom:16 }}>
        {/* Catégories */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:16 }}>📊 Répartition par catégorie</div>
          <HBarChart data={catData} max={stats.total||1} colors={catData.map(c => c.color)} />
        </div>

        {/* Directions top 10 */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:16 }}>🏢 Effectifs par direction (top 10)</div>
          <HBarChart data={dirData} max={maxDir} colors={dirColors} />
        </div>

        {/* Donut genre */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20, textAlign:'center' }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:12 }}>⚧ Genre</div>
          <DonutChart data={donutData} size={140} />
          <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:10 }}>
            {donutData.map((d,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:d.color }} />
                <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{d.label} {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accès rapides */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20 }}>
        <div style={{ fontWeight:800, fontSize:14, color:'#1e293b', marginBottom:14 }}>⚡ Accès rapides</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { tab:'agents',   label:'Consulter les agents',     icon:'👥', color:'#1e40af', bg:'#dbeafe' },
            { tab:'chat',     label:'Messagerie interne',        icon:'💬', color:'#0891b2', bg:'#e0f2fe' },
            { tab:'rh',       label:'Demandes Congés/Attestations',icon:'📋', color:'#059669', bg:'#d1fae5' },
            { tab:'fichiers', label:'Gestionnaire de fichiers',  icon:'📁', color:'#7c3aed', bg:'#ede9fe' },
          ].map(a => (
            <button key={a.tab} onClick={() => setActiveTab(a.tab)}
              style={{ display:'flex', alignItems:'center', gap:8, background:a.bg, border:'none', borderRadius:10, padding:'10px 18px', cursor:'pointer', fontWeight:700, fontSize:13, color:a.color, transition:'opacity .15s' }}>
              <span style={{ fontSize:16 }}>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ONGLET AGENTS
// ================================================================
function TabAgents({ agents, directions, profile }) {
  const [search, setSearch]   = useState('');
  const [catF,   setCatF]     = useState('');
  const [dirF,   setDirF]     = useState('');
  const [sexeF,  setSexeF]    = useState('');
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState('liste');

  const cats = [...new Set(agents.map(a => a.categorie).filter(Boolean))].sort();
  const dirs = [...new Set(agents.map(a => a.direction_code).filter(Boolean))].sort();

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    const nameMatch = !q || `${a.nom} ${a.prenoms}`.toLowerCase().includes(q) || (a.matricule||'').toLowerCase().includes(q);
    const catMatch  = !catF  || a.categorie === catF;
    const dirMatch  = !dirF  || a.direction_code === dirF;
    const sexeMatch = !sexeF || a.sexe === sexeF;
    return nameMatch && catMatch && dirMatch && sexeMatch;
  });

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:'#0f172a', marginBottom:16 }}>👥 Gestion des agents · <span style={{ fontSize:14, color:'#64748b' }}>{filtered.length} / {agents.length}</span></div>

      {/* Filtres */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:16, marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher nom, prénom, matricule…" style={{ flex:1, minWidth:200, border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:13 }} />
        <select value={catF} onChange={e => setCatF(e.target.value)} style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, background:'#fff' }}>
          <option value="">Toutes catégories</option>
          {cats.map(c => <option key={c} value={c}>Cat. {c}</option>)}
        </select>
        <select value={dirF} onChange={e => setDirF(e.target.value)} style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, background:'#fff' }}>
          <option value="">Toutes directions</option>
          {dirs.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={sexeF} onChange={e => setSexeF(e.target.value)} style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px', fontSize:13, background:'#fff' }}>
          <option value="">Tous genres</option>
          <option value="M">Hommes</option>
          <option value="F">Femmes</option>
        </select>
        <div style={{ display:'flex', gap:4 }}>
          {['liste','grille'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{ border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 12px', background: viewMode===m ? '#1e40af' : '#fff', color: viewMode===m ? '#fff' : '#64748b', cursor:'pointer', fontSize:12 }}>
              {m === 'liste' ? '≡' : '⊞'}
            </button>
          ))}
        </div>
        {(search||catF||dirF||sexeF) && <button onClick={() => { setSearch(''); setCatF(''); setDirF(''); setSexeF(''); }} style={{ border:'none', background:'#fee2e2', color:'#dc2626', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:12 }}>✕ Réinitialiser</button>}
      </div>

      {/* Liste */}
      {viewMode === 'liste' ? (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  {['Agent','Matricule','Direction','Catégorie','Fonction','Sexe','Engagement','Indice'].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((a, i) => (
                  <tr key={a.id || i} onClick={() => setSelected(a)} style={{ borderBottom:'1px solid #f1f5f9', cursor:'pointer', background: i%2===0 ? '#fff' : '#fafbfc' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f0f7ff'}
                    onMouseLeave={e => e.currentTarget.style.background=i%2===0 ? '#fff' : '#fafbfc'}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background: CAT_COLORS[a.categorie] || '#94a3b8', color:'#fff', fontWeight:800, fontSize:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {initials(a.nom, a.prenoms)}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{fmt(a.nom)} {fmt(a.prenoms)}</div>
                          <div style={{ fontSize:11, color:'#64748b' }}>{a.sexe === 'F' ? '👩' : '👨'} {fmt(a.profil)?.slice(0,30)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#475569', fontFamily:'monospace' }}>{fmt(a.matricule)}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#475569' }}>{fmt(a.direction_code)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background: CAT_COLORS[a.categorie] + '22', color: CAT_COLORS[a.categorie] || '#64748b', padding:'3px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>{fmt(a.categorie)}</span>
                    </td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmt(a.fonction)}</td>
                    <td style={{ padding:'10px 14px', fontSize:13 }}>{a.sexe === 'F' ? '👩' : '👨'}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#475569' }}>{fmtDate(a.date_engagement)}</td>
                    <td style={{ padding:'10px 14px', fontSize:12, color:'#475569' }}>{fmt(a.indice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && <div style={{ padding:'12px 16px', fontSize:12, color:'#94a3b8', borderTop:'1px solid #f1f5f9' }}>Affichage limité à 200 résultats sur {filtered.length}</div>}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12 }}>
          {filtered.slice(0, 120).map((a, i) => (
            <div key={a.id || i} onClick={() => setSelected(a)} style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:16, cursor:'pointer', transition:'box-shadow .15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(30,64,175,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background: CAT_COLORS[a.categorie] || '#94a3b8', color:'#fff', fontWeight:900, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {initials(a.nom, a.prenoms)}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>{fmt(a.nom)}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{fmt(a.prenoms)}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <span style={{ background: CAT_COLORS[a.categorie]+'22', color: CAT_COLORS[a.categorie]||'#64748b', padding:'2px 7px', borderRadius:6, fontSize:10, fontWeight:700 }}>{a.categorie}</span>
                <span style={{ background:'#f1f5f9', color:'#475569', padding:'2px 7px', borderRadius:6, fontSize:10 }}>{a.direction_code}</span>
                {a.sexe === 'F' && <span style={{ background:'#fce7f3', color:'#db2777', padding:'2px 7px', borderRadius:6, fontSize:10 }}>F</span>}
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:8 }}>{fmt(a.fonction)?.slice(0,40)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Fiche détail */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={e => e.target===e.currentTarget && setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:18, padding:28, width:'100%', maxWidth:540, maxHeight:'85vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:20 }}>
              <div style={{ width:60, height:60, borderRadius:'50%', background: CAT_COLORS[selected.categorie]||'#94a3b8', color:'#fff', fontWeight:900, fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {initials(selected.nom, selected.prenoms)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:900, fontSize:18, color:'#1e293b' }}>{fmt(selected.nom)} {fmt(selected.prenoms)}</div>
                <div style={{ fontSize:13, color:'#64748b' }}>{fmt(selected.fonction)}</div>
                <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                  <span style={{ background: CAT_COLORS[selected.categorie]+'22', color: CAT_COLORS[selected.categorie]||'#64748b', padding:'3px 9px', borderRadius:8, fontSize:12, fontWeight:700 }}>Cat. {selected.categorie}</span>
                  <span style={{ background:'#f1f5f9', color:'#475569', padding:'3px 9px', borderRadius:8, fontSize:12 }}>{selected.direction_code}</span>
                  <span style={{ background:'#d1fae5', color:'#065f46', padding:'3px 9px', borderRadius:8, fontSize:12 }}>{selected.statut || 'En activité'}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:16, color:'#64748b' }}>✕</button>
            </div>
            {[
              ['Matricule',       fmt(selected.matricule)],
              ['Sexe',           selected.sexe === 'F' ? '👩 Féminin' : '👨 Masculin'],
              ['Date de naissance', fmtDate(selected.date_naissance)],
              ['Date d\'engagement', fmtDate(selected.date_engagement)],
              ['Dernier avancement', fmtDate(selected.date_dernier_avanc)],
              ['Indice',          fmt(selected.indice)],
              ['Ancienneté',      fmt(selected.anciennete) !== '—' ? `${selected.anciennete} ans` : '—'],
              ['Enfants',         fmt(selected.nbre_enfants)],
              ['Profil',          fmt(selected.profil)],
              ['Localisation',    fmt(selected.localisation)],
              ['Retraite N+1',    selected.retraite_n1 === 'OUI' ? '⚠️ Oui' : 'Non'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9' }}>
                <span style={{ fontSize:12, color:'#64748b', fontWeight:600 }}>{k}</span>
                <span style={{ fontSize:13, color:'#1e293b', fontWeight:700, textAlign:'right', maxWidth:280 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ONGLET CHAT
// ================================================================
function TabChat({ supabase, profile, directions, agents }) {
  const role = profile?.role || 'agent';
  const userDirCode = profile?.direction_code || '';

  const rooms = (() => {
    const base = [{ id:'general', name:'💬 Canal Général', type:'public' }];
    if (['admin','directeur'].includes(role)) {
      directions.slice(0, 20).forEach(d => {
        base.push({ id:`dir_${d.code}`, name:`🏢 ${d.code} — ${d.nom?.slice(0,20) || d.code}`, type:'direction', code: d.code });
      });
    } else {
      if (userDirCode) {
        const dir = directions.find(d => d.code === userDirCode);
        base.push({ id:`dir_${userDirCode}`, name:`🏢 ${userDirCode} — ${dir?.nom?.slice(0,20) || userDirCode}`, type:'direction', code: userDirCode });
      }
    }
    return base;
  })();

  const [activeRoom, setActiveRoom]   = useState(rooms[0]?.id || 'general');
  const [messages,   setMessages]     = useState([]);
  const [newMsg,     setNewMsg]       = useState('');
  const [loading,    setLoading]      = useState(false);
  const [sending,    setSending]      = useState(false);
  const [error,      setError]        = useState('');
  const messagesEndRef = useRef(null);

  const senderName = profile?.nom_complet || profile?.email?.split('@')[0] || 'Utilisateur';

  useEffect(() => {
    if (!activeRoom) return;
    setMessages([]);
    setLoading(true);
    setError('');
    let sub;

    const loadAndSubscribe = async () => {
      try {
        const { data, error: err } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', activeRoom)
          .order('created_at', { ascending: true })
          .limit(100);

        if (err) {
          if (err.code === '42P01') {
            setError('La table "messages" n\'existe pas encore. Exécutez le SQL fourni pour l\'activer.');
          } else {
            setError('Erreur de chargement : ' + err.message);
          }
        } else {
          setMessages(data || []);
        }
      } catch(e) {
        setError('Erreur réseau');
      } finally {
        setLoading(false);
      }

      try {
        sub = supabase.channel(`chat:${activeRoom}`)
          .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`room_id=eq.${activeRoom}` }, (payload) => {
            setMessages(prev => [...prev, payload.new]);
          })
          .subscribe();
      } catch(_) {}
    };

    loadAndSubscribe();
    return () => { if (sub) supabase.removeChannel(sub); };
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending || error) return;
    setSending(true);
    try {
      const { error: err } = await supabase.from('messages').insert({
        room_id:     activeRoom,
        sender_id:   profile?.id || null,
        sender_name: senderName,
        content:     newMsg.trim(),
      });
      if (err) throw err;
      setNewMsg('');
    } catch(e) {
      setError('Envoi impossible : ' + (e.message || 'Erreur'));
    } finally {
      setSending(false);
    }
  };

  const activeRoomObj = rooms.find(r => r.id === activeRoom);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'240px 1fr', gap:16, height:'calc(100vh - 160px)', minHeight:500 }}>
      {/* Sidebar */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'14px 16px', fontWeight:800, fontSize:13, color:'#1e293b', borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>
          💬 Messagerie interne
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {rooms.map(r => (
            <div key={r.id} onClick={() => setActiveRoom(r.id)}
              style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid #f8fafc', background: activeRoom===r.id ? '#eff6ff' : '#fff', borderRight: activeRoom===r.id ? '3px solid #1e40af' : 'none' }}>
              <div style={{ fontSize:12, fontWeight:700, color: activeRoom===r.id ? '#1e40af' : '#1e293b' }}>{r.name}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:'10px 14px', fontSize:10, color:'#94a3b8', borderTop:'1px solid #e2e8f0', background:'#f8fafc' }}>
          {role === 'admin' ? 'Accès : tous les canaux' : role === 'directeur' ? 'Accès : toutes directions' : 'Accès : canal direction'}
        </div>
      </div>

      {/* Zone messages */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', fontWeight:800, fontSize:14, color:'#1e293b', borderBottom:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', alignItems:'center', gap:8 }}>
          {activeRoomObj?.name || 'Chat'} <span style={{ fontWeight:400, color:'#94a3b8', fontSize:12 }}>· {messages.length} message{messages.length>1?'s':''}</span>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
          {loading && <div style={{ textAlign:'center', color:'#94a3b8', padding:24 }}>Chargement…</div>}
          {error && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:16, color:'#dc2626', fontSize:13 }}>
              ⚠️ {error}
              {error.includes('SQL') && (
                <div style={{ marginTop:10, fontSize:11, color:'#64748b' }}>
                  Exécutez le fichier <code>TABLES_CHAT_ATTESTATIONS.sql</code> dans Supabase pour activer la messagerie.
                </div>
              )}
            </div>
          )}
          {!loading && !error && messages.length === 0 && (
            <div style={{ textAlign:'center', color:'#94a3b8', padding:32, fontSize:13 }}>
              🔇 Aucun message dans ce canal.<br/>Soyez le premier à écrire !
            </div>
          )}
          {messages.map((m, i) => {
            const isMe = m.sender_id === profile?.id || m.sender_name === senderName;
            return (
              <div key={m.id || i} style={{ display:'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems:'flex-end', gap:8 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background: isMe ? '#1e40af' : '#64748b', color:'#fff', fontSize:12, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {(m.sender_name||'?').charAt(0).toUpperCase()}
                </div>
                <div style={{ maxWidth:'70%' }}>
                  {!isMe && <div style={{ fontSize:10, color:'#64748b', marginBottom:2, paddingLeft:4 }}>{m.sender_name}</div>}
                  <div style={{ background: isMe ? '#1e40af' : '#f1f5f9', color: isMe ? '#fff' : '#1e293b', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding:'10px 14px', fontSize:13, wordBreak:'break-word' }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize:9, color:'#94a3b8', marginTop:2, textAlign: isMe ? 'right' : 'left', paddingLeft:4, paddingRight:4 }}>
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : ''}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10, alignItems:'center' }}>
          <input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
            placeholder={error ? 'Chat non disponible' : 'Tapez un message… (Entrée pour envoyer)'}
            disabled={!!error}
            style={{ flex:1, border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 14px', fontSize:13, outline:'none', background: error ? '#f8fafc' : '#fff' }}
          />
          <button onClick={sendMessage} disabled={!newMsg.trim() || sending || !!error}
            style={{ background: (!newMsg.trim() || sending || !!error) ? '#e2e8f0' : '#1e40af', color: (!newMsg.trim() || sending || !!error) ? '#94a3b8' : '#fff', border:'none', borderRadius:10, padding:'10px 18px', cursor: (!newMsg.trim() || sending || !!error) ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:13, transition:'all .15s' }}>
            {sending ? '…' : 'Envoyer ➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ONGLET RH — CONGÉS + PERMISSIONS + ATTESTATIONS
// ================================================================
function TabRH({ supabase, profile, agents, directions }) {
  const role    = profile?.role || 'agent';
  const [subTab, setSubTab] = useState('conges');

  const subTabs = [
    { id:'conges',       label:'Congés annuels',   icon:'🌴' },
    { id:'permissions',  label:'Permissions',       icon:'⏱️' },
    { id:'attestations', label:'Attestations',      icon:'📜' },
    ...(role === 'admin' ? [{ id:'admin', label:'Tableau admin', icon:'🔐' }] : []),
  ];

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:'#0f172a', marginBottom:16 }}>📋 Gestion des demandes RH</div>
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', marginBottom:16, display:'flex', overflow:'hidden' }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} style={{
            flex:1, background:'transparent', border:'none', borderBottom: subTab===t.id ? '3px solid #1e40af' : '3px solid transparent',
            padding:'14px 12px', cursor:'pointer', fontWeight: subTab===t.id ? 800 : 600, fontSize:13,
            color: subTab===t.id ? '#1e40af' : '#64748b', display:'flex', alignItems:'center', justifyContent:'center', gap:6
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {subTab === 'conges'       && <CongesSection      supabase={supabase} profile={profile} type="conge" label="Congé" />}
      {subTab === 'permissions'  && <CongesSection      supabase={supabase} profile={profile} type="permission" label="Permission" />}
      {subTab === 'attestations' && <AttestationsSection supabase={supabase} profile={profile} />}
      {subTab === 'admin' && role === 'admin' && <AdminRHSection supabase={supabase} profile={profile} agents={agents} />}
    </div>
  );
}

function CongesSection({ supabase, profile, type, label }) {
  const role = profile?.role || 'agent';
  const [demandes,  setDemandes]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ date_debut:'', date_fin:'', motif:'' });
  const [submitting, setSubmitting] = useState(false);
  const [success,   setSuccess]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let query = supabase.from('conges').select('*').eq('type', type).order('created_at', { ascending: false }).limit(50);
      if (role === 'agent') query = query.eq('agent_id', profile?.id);
      const { data, error: err } = await query;
      if (err) {
        if (err.code === '42P01') setError('Table congés non configurée. Exécutez le SQL de migration.');
        else setError(err.message);
      } else {
        setDemandes(data || []);
      }
    } catch(e) { setError('Erreur réseau'); }
    setLoading(false);
  }, [type, role, profile?.id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.date_debut || !form.date_fin) return;
    setSubmitting(true); setError('');
    try {
      const { error: err } = await supabase.from('conges').insert({
        agent_id:   profile?.id,
        type,
        date_debut: form.date_debut,
        date_fin:   form.date_fin,
        motif:      form.motif,
        statut:     'En attente',
        demandeur_nom: profile?.nom_complet || profile?.email,
      });
      if (err) throw err;
      setShowForm(false); setForm({ date_debut:'', date_fin:'', motif:'' });
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
      load();
    } catch(e) { setError(e.message || 'Erreur d\'envoi'); }
    setSubmitting(false);
  };

  const updateStatut = async (id, statut) => {
    try {
      await supabase.from('conges').update({ statut, updated_at: new Date().toISOString() }).eq('id', id);
      load();
    } catch(e) {}
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>
          {type === 'conge' ? '🌴' : '⏱️'} Demandes de {label.toLowerCase()}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background:'#1e40af', color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
          {showForm ? '✕ Fermer' : `+ Nouvelle demande de ${label.toLowerCase()}`}
        </button>
      </div>

      {success && <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:10, padding:12, color:'#065f46', marginBottom:14, fontWeight:600 }}>✅ Demande envoyée avec succès !</div>}

      {showForm && (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#1e293b', marginBottom:14 }}>📝 Nouvelle demande de {label.toLowerCase()}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Date de début *</label>
              <input type="date" value={form.date_debut} onChange={e => setForm(f => ({...f, date_debut: e.target.value}))}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Date de fin *</label>
              <input type="date" value={form.date_fin} onChange={e => setForm(f => ({...f, date_fin: e.target.value}))}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Motif / Justification</label>
            <textarea value={form.motif} onChange={e => setForm(f => ({...f, motif: e.target.value}))} rows={3}
              placeholder={`Motif de la demande de ${label.toLowerCase()}…`}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 12px', fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
          </div>
          {error && <div style={{ background:'#fee2e2', color:'#dc2626', borderRadius:8, padding:10, fontSize:12, marginBottom:12 }}>⚠️ {error}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={submit} disabled={submitting || !form.date_debut || !form.date_fin}
              style={{ background: (submitting||!form.date_debut||!form.date_fin) ? '#e2e8f0' : '#059669', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
              {submitting ? 'Envoi…' : '✅ Soumettre'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontSize:13 }}>Annuler</button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign:'center', color:'#94a3b8', padding:24 }}>Chargement…</div>}
      {!loading && error && !showForm && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:14, color:'#dc2626', fontSize:13 }}>⚠️ {error}</div>}
      {!loading && !error && demandes.length === 0 && <div style={{ textAlign:'center', color:'#94a3b8', padding:32, fontSize:13 }}>Aucune demande trouvée.</div>}
      {!loading && !error && demandes.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {demandes.map((d, i) => {
            const s = STATUT_STYLE[d.statut] || STATUT_STYLE['En attente'];
            const days = d.date_debut && d.date_fin ? Math.round((new Date(d.date_fin) - new Date(d.date_debut)) / 86400000) + 1 : '—';
            return (
              <div key={d.id || i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{label} · {fmtDate(d.date_debut)} → {fmtDate(d.date_fin)}</span>
                    <span style={{ background:s.bg, color:s.color, padding:'2px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>{s.icon} {d.statut}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748b' }}>
                    {days !== '—' ? `${days} jour${days > 1 ? 's' : ''}` : ''}{d.motif ? ` · ${d.motif.slice(0,60)}` : ''}
                  </div>
                  {d.demandeur_nom && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>Par : {d.demandeur_nom}</div>}
                </div>
                {['admin','directeur'].includes(role) && d.statut === 'En attente' && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => updateStatut(d.id, 'Approuvé')} style={{ background:'#d1fae5', color:'#065f46', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700, fontSize:12 }}>✅ Approuver</button>
                    <button onClick={() => updateStatut(d.id, 'Rejeté')} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700, fontSize:12 }}>❌ Rejeter</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AttestationsSection({ supabase, profile }) {
  const role = profile?.role || 'agent';
  const [demandes,   setDemandes]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ type_attestation:'travail', motif:'', urgence: false });
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);

  const TYPES = [
    { value:'travail',  label:'Attestation de travail',  icon:'💼' },
    { value:'salaire',  label:'Attestation de salaire',  icon:'💰' },
    { value:'presence', label:'Attestation de présence', icon:'✅' },
    { value:'scolarite',label:'Attestation de scolarité', icon:'🎓' },
  ];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let query = supabase.from('attestations').select('*').order('created_at', { ascending: false }).limit(50);
      if (role === 'agent') query = query.eq('agent_id', profile?.id);
      const { data, error: err } = await query;
      if (err) {
        if (err.code === '42P01') setError('Table attestations non configurée. Exécutez le SQL de migration.');
        else setError(err.message);
      } else {
        setDemandes(data || []);
      }
    } catch(e) { setError('Erreur réseau'); }
    setLoading(false);
  }, [role, profile?.id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const { error: err } = await supabase.from('attestations').insert({
        agent_id:         profile?.id,
        type_attestation: form.type_attestation,
        motif:            form.motif,
        urgence:          form.urgence,
        statut:           'En attente',
        demandeur_nom:    profile?.nom_complet || profile?.email,
      });
      if (err) throw err;
      setShowForm(false); setForm({ type_attestation:'travail', motif:'', urgence: false });
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
      load();
    } catch(e) { setError(e.message || 'Erreur'); }
    setSubmitting(false);
  };

  const updateStatut = async (id, statut) => {
    try {
      await supabase.from('attestations').update({ statut, updated_at: new Date().toISOString() }).eq('id', id);
      load();
    } catch(e) {}
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>📜 Demandes d'attestations</div>
        <button onClick={() => setShowForm(!showForm)} style={{ background:'#7c3aed', color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
          {showForm ? '✕ Fermer' : '+ Nouvelle attestation'}
        </button>
      </div>

      {success && <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:10, padding:12, color:'#065f46', marginBottom:14, fontWeight:600 }}>✅ Demande envoyée avec succès !</div>}

      {showForm && (
        <div style={{ background:'#faf5ff', border:'1px solid #e9d5ff', borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#6d28d9', marginBottom:14 }}>📜 Demande d'attestation</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:6 }}>Type d'attestation *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
              {TYPES.map(t => (
                <div key={t.value} onClick={() => setForm(f => ({...f, type_attestation: t.value}))}
                  style={{ border:`2px solid ${form.type_attestation===t.value ? '#7c3aed' : '#e2e8f0'}`, borderRadius:10, padding:'10px 14px', cursor:'pointer', background: form.type_attestation===t.value ? '#ede9fe' : '#fff', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:18 }}>{t.icon}</span>
                  <span style={{ fontSize:12, fontWeight:700, color: form.type_attestation===t.value ? '#7c3aed' : '#1e293b' }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Motif / Destination</label>
            <textarea value={form.motif} onChange={e => setForm(f => ({...f, motif: e.target.value}))} rows={2}
              placeholder="Ex : Demande de visa, dossier bancaire, inscription université…"
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 12px', fontSize:13, resize:'vertical', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <input type="checkbox" id="urgence" checked={form.urgence} onChange={e => setForm(f => ({...f, urgence: e.target.checked}))} style={{ width:16, height:16, cursor:'pointer' }} />
            <label htmlFor="urgence" style={{ fontSize:13, color:'#dc2626', fontWeight:600, cursor:'pointer' }}>🔴 Demande urgente</label>
          </div>
          {error && <div style={{ background:'#fee2e2', color:'#dc2626', borderRadius:8, padding:10, fontSize:12, marginBottom:12 }}>⚠️ {error}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={submit} disabled={submitting}
              style={{ background: submitting ? '#e2e8f0' : '#7c3aed', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
              {submitting ? 'Envoi…' : '✅ Soumettre'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background:'#f1f5f9', color:'#64748b', border:'none', borderRadius:8, padding:'9px 16px', cursor:'pointer', fontSize:13 }}>Annuler</button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign:'center', color:'#94a3b8', padding:24 }}>Chargement…</div>}
      {!loading && error && !showForm && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:14, color:'#dc2626', fontSize:13 }}>⚠️ {error}</div>}
      {!loading && !error && demandes.length === 0 && <div style={{ textAlign:'center', color:'#94a3b8', padding:32, fontSize:13 }}>Aucune demande d'attestation.</div>}
      {!loading && !error && demandes.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {demandes.map((d, i) => {
            const s = STATUT_STYLE[d.statut] || STATUT_STYLE['En attente'];
            const typeObj = TYPES.find(t => t.value === d.type_attestation) || { icon:'📜', label: d.type_attestation };
            return (
              <div key={d.id || i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:44, height:44, borderRadius:10, background:'#ede9fe', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{typeObj.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{typeObj.label}</span>
                    <span style={{ background:s.bg, color:s.color, padding:'2px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>{s.icon} {d.statut}</span>
                    {d.urgence && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:8, fontSize:10, fontWeight:700 }}>🔴 URGENT</span>}
                  </div>
                  {d.motif && <div style={{ fontSize:12, color:'#64748b' }}>{d.motif.slice(0,80)}</div>}
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                    {fmtDate(d.created_at)}{d.demandeur_nom ? ` · ${d.demandeur_nom}` : ''}
                  </div>
                </div>
                {['admin','directeur'].includes(role) && d.statut === 'En attente' && (
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => updateStatut(d.id, 'Approuvé')} style={{ background:'#d1fae5', color:'#065f46', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700, fontSize:12 }}>✅</button>
                    <button onClick={() => updateStatut(d.id, 'Rejeté')} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:700, fontSize:12 }}>❌</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminRHSection({ supabase, profile, agents }) {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: c }, { data: a }] = await Promise.all([
          supabase.from('conges').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('attestations').select('*').order('created_at', { ascending: false }).limit(100),
        ]);
        const conges = (c||[]).map(x => ({...x, _type:'conge'}));
        const atts   = (a||[]).map(x => ({...x, _type:'attestation'}));
        const merged = [...conges, ...atts].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        setAll(merged);
      } catch(e) {}
      setLoading(false);
    };
    load();
  }, []);

  const pending = all.filter(x => x.statut === 'En attente');
  const approved = all.filter(x => x.statut === 'Approuvé');

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'Total demandes', val:all.length,     icon:'📋', color:'#1e40af', bg:'#dbeafe' },
          { label:'En attente',     val:pending.length,  icon:'⏳', color:'#d97706', bg:'#fef3c7' },
          { label:'Approuvées',     val:approved.length, icon:'✅', color:'#059669', bg:'#d1fae5' },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:24, fontWeight:900, color:k.color }}>{k.val}</div>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      {loading ? <div style={{ textAlign:'center', color:'#94a3b8', padding:24 }}>Chargement…</div> : (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', fontWeight:700, fontSize:13, borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>🔐 Toutes les demandes</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  {['Type','Détail','Demandeur','Date','Statut'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {all.map((d,i) => {
                  const s = STATUT_STYLE[d.statut] || STATUT_STYLE['En attente'];
                  return (
                    <tr key={d.id||i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{d._type === 'conge' ? '🌴 '+d.type : '📜 '+d.type_attestation}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>
                        {d._type === 'conge' ? `${fmtDate(d.date_debut)} → ${fmtDate(d.date_fin)}` : (d.motif||'—').slice(0,40)}
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12 }}>{d.demandeur_nom||'—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#94a3b8' }}>{fmtDate(d.created_at)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background:s.bg, color:s.color, padding:'3px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>{s.icon} {d.statut}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ONGLET FICHIERS
// ================================================================
function TabFichiers({ supabase, profile }) {
  const role = profile?.role || 'agent';
  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [folder,   setFolder]   = useState('general');
  const [uploading,setUploading]= useState(false);
  const [error,    setError]    = useState('');
  const fileRef = useRef();

  const FOLDERS = ['general','conges','rh','finances','rapports','courriers'];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase.storage.from('sygrh-files').list(folder, { sortBy: { column:'created_at', order:'desc' } });
      if (err) setError(err.message);
      else setFiles((data||[]).filter(f => f.name !== '.emptyFolderPlaceholder'));
    } catch(e) { setError('Erreur de chargement'); }
    setLoading(false);
  }, [folder]);

  useEffect(() => { load(); }, [load]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError('');
    try {
      const path = `${folder}/${Date.now()}_${file.name}`;
      const { error: err } = await supabase.storage.from('sygrh-files').upload(path, file);
      if (err) throw err;
      load();
    } catch(e) { setError('Erreur upload : ' + (e.message||'')); }
    setUploading(false);
    e.target.value = '';
  };

  const download = async (name) => {
    try {
      const { data } = await supabase.storage.from('sygrh-files').createSignedUrl(`${folder}/${name}`, 60);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch(e) {}
  };

  const del = async (name) => {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    try {
      await supabase.storage.from('sygrh-files').remove([`${folder}/${name}`]);
      load();
    } catch(e) {}
  };

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:'#0f172a', marginBottom:16 }}>📁 Gestionnaire de fichiers</div>
      <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:16 }}>
        {/* Dossiers */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', fontSize:12, fontWeight:800, color:'#64748b', borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>DOSSIERS</div>
          {FOLDERS.map(f => (
            <div key={f} onClick={() => setFolder(f)}
              style={{ padding:'11px 14px', cursor:'pointer', fontSize:12, fontWeight: folder===f ? 800 : 600, color: folder===f ? '#1e40af' : '#475569', background: folder===f ? '#eff6ff' : '#fff', borderRight: folder===f ? '3px solid #1e40af' : 'none', borderBottom:'1px solid #f8fafc' }}>
              📂 {f}
            </div>
          ))}
        </div>

        {/* Fichiers */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e2e8f0', background:'#f8fafc' }}>
            <span style={{ fontWeight:800, fontSize:13, color:'#1e293b' }}>📂 /{folder} · {files.length} fichier{files.length>1?'s':''}</span>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={load} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12 }}>🔄</button>
              <input ref={fileRef} type="file" style={{ display:'none' }} onChange={upload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ background: uploading ? '#e2e8f0' : '#1e40af', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:700, fontSize:12 }}>
                {uploading ? 'Upload…' : '⬆️ Uploader'}
              </button>
            </div>
          </div>
          {error && <div style={{ padding:14, background:'#fef2f2', color:'#dc2626', fontSize:12 }}>⚠️ {error}</div>}
          {loading ? <div style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>Chargement…</div> :
           files.length === 0 ? <div style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>Aucun fichier dans ce dossier.</div> : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                    {['Fichier','Taille','Date','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {files.map((f,i) => (
                    <tr key={f.id||i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:18 }}>{fileIcon(f.name)}</span>
                          <span style={{ fontSize:13, color:'#1e293b', fontWeight:600 }}>{f.name.replace(/^\d+_/, '').slice(0,50)}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{fmtSize(f.metadata?.size)}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#94a3b8' }}>{fmtDate(f.created_at)}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => download(f.name)} style={{ background:'#dbeafe', color:'#1e40af', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>⬇️</button>
                          {['admin','directeur'].includes(role) && <button onClick={() => del(f.name)} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:12 }}>🗑️</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ONGLET UTILISATEURS (admin only)
// ================================================================
function TabUsers({ supabase, directions, profile }) {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ email:'', password:'', nom_complet:'', role:'agent', direction_code:'' });
  const [creating,  setCreating]  = useState(false);
  const [success,   setSuccess]   = useState('');

  const ROLES = [
    { value:'admin',     label:'Administrateur', color:'#7c3aed', bg:'#ede9fe' },
    { value:'directeur', label:'Directeur',      color:'#1e40af', bg:'#dbeafe' },
    { value:'agent',     label:'Agent',           color:'#059669', bg:'#d1fae5' },
  ];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (err) setError(err.message);
      else setUsers(data || []);
    } catch(e) { setError('Erreur réseau'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createUser = async () => {
    if (!form.email || !form.password) return;
    setCreating(true); setError(''); setSuccess('');
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({ email: form.email, password: form.password });
      if (signUpErr) throw signUpErr;
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id:             data.user.id,
          email:          form.email,
          nom_complet:    form.nom_complet,
          role:           form.role,
          direction_code: form.direction_code,
          actif:          true,
        });
      }
      setSuccess('Utilisateur créé. Il doit confirmer son email.');
      setShowForm(false); setForm({ email:'', password:'', nom_complet:'', role:'agent', direction_code:'' });
      load();
    } catch(e) { setError(e.message || 'Erreur'); }
    setCreating(false);
  };

  const updateRole = async (id, role) => {
    try {
      await supabase.from('profiles').update({ role }).eq('id', id);
      load();
    } catch(e) {}
  };

  return (
    <div>
      <div style={{ fontWeight:900, fontSize:18, color:'#0f172a', marginBottom:16 }}>⚙️ Gestion des utilisateurs</div>
      {success && <div style={{ background:'#d1fae5', border:'1px solid #6ee7b7', borderRadius:10, padding:12, color:'#065f46', marginBottom:14, fontWeight:600 }}>✅ {success}</div>}
      {error && <div style={{ background:'#fee2e2', border:'1px solid #fecaca', borderRadius:10, padding:12, color:'#dc2626', marginBottom:14 }}>⚠️ {error}</div>}

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
        <button onClick={() => setShowForm(!showForm)} style={{ background:'#1e40af', color:'#fff', border:'none', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
          {showForm ? '✕ Fermer' : '+ Nouvel utilisateur'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:14, padding:20, marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#1e293b', marginBottom:14 }}>👤 Créer un compte utilisateur</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            {[
              { key:'email',       label:'Email *',       type:'email',    placeholder:'agent@mdcjs.tg' },
              { key:'password',    label:'Mot de passe *', type:'password', placeholder:'Min. 8 caractères' },
              { key:'nom_complet', label:'Nom complet',   type:'text',     placeholder:'AGANO Kodzo…' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                  placeholder={f.placeholder}
                  style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 12px', fontSize:13, boxSizing:'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:4 }}>Direction</label>
              <select value={form.direction_code} onChange={e => setForm(p => ({...p, direction_code: e.target.value}))}
                style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 10px', fontSize:13, background:'#fff', boxSizing:'border-box' }}>
                <option value="">— Aucune —</option>
                {directions.map(d => <option key={d.code} value={d.code}>{d.code} — {d.nom?.slice(0,30)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#64748b', display:'block', marginBottom:6 }}>Rôle</label>
            <div style={{ display:'flex', gap:8 }}>
              {ROLES.map(r => (
                <div key={r.value} onClick={() => setForm(p => ({...p, role: r.value}))}
                  style={{ border:`2px solid ${form.role===r.value ? r.color : '#e2e8f0'}`, borderRadius:10, padding:'8px 16px', cursor:'pointer', background: form.role===r.value ? r.bg : '#fff', fontWeight:700, fontSize:13, color: form.role===r.value ? r.color : '#64748b' }}>
                  {r.label}
                </div>
              ))}
            </div>
          </div>
          <button onClick={createUser} disabled={creating || !form.email || !form.password}
            style={{ background: (creating||!form.email||!form.password) ? '#e2e8f0' : '#1e40af', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            {creating ? 'Création…' : '✅ Créer le compte'}
          </button>
        </div>
      )}

      {loading ? <div style={{ textAlign:'center', padding:32, color:'#94a3b8' }}>Chargement…</div> : (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                  {['Utilisateur','Email','Direction','Rôle','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 14px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i) => {
                  const r = ROLES.find(x => x.value === u.role) || ROLES[2];
                  return (
                    <tr key={u.id||i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background: r.bg, color: r.color, fontWeight:800, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {(u.nom_complet || u.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight:700, fontSize:13, color:'#1e293b' }}>{u.nom_complet || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{u.email}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{u.direction_code || '—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background: r.bg, color: r.color, padding:'3px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>{r.label}</span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background: u.actif ? '#d1fae5' : '#fee2e2', color: u.actif ? '#065f46' : '#dc2626', padding:'3px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>
                          {u.actif ? '✅ Actif' : '⛔ Inactif'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        {u.id !== profile?.id && (
                          <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                            style={{ border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 8px', fontSize:12, background:'#fff', cursor:'pointer' }}>
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
