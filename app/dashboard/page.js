'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ── Utilitaires ──────────────────────────────────────────────────
const fmt = v => (!v || v === 'null' || v === 'nan') ? '—' : v;
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtSize = b => !b ? '—' : b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(1)+'MB';
const fileIcon = n => { const e=n?.split('.').pop()?.toLowerCase(); return e==='pdf'?'📄':['jpg','jpeg','png','gif'].includes(e)?'🖼️':['xlsx','xls','csv'].includes(e)?'📊':['docx','doc'].includes(e)?'📝':'📎'; };

const CAT_COLORS = { A1:'#1e40af',A2:'#0369a1',A3:'#0e7490',B:'#059669',C:'#d97706',D:'#dc2626','00':'#7c3aed' };
const ST = { 'En attente':{bg:'#fef9c3',color:'#92400e',icon:'⏳'},'Approuvé':{bg:'#d1fae5',color:'#065f46',icon:'✅'},'Rejeté':{bg:'#fee2e2',color:'#991b1b',icon:'❌'} };

const TABS = [
  { id:'accueil',  label:'Accueil',     icon:'🏠' },
  { id:'agents',   label:'Agents',      icon:'👥' },
  { id:'chat',     label:'Chat',        icon:'💬' },
  { id:'rh',       label:'Demandes RH', icon:'📋' },
  { id:'fichiers', label:'Fichiers',    icon:'📁' },
  { id:'users',    label:'Utilisateurs',icon:'⚙️' },
];

// ── Page principale ───────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('accueil');
  const [user,       setUser]       = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [agents,     setAgents]     = useState([]);
  const [directions, setDirections] = useState([]);
  const [stats,      setStats]      = useState({});
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      try {
        const { data:{ session } } = await supabase.auth.getSession();
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
        setStats({
          total:  agData.length,
          femmes: agData.filter(a=>a.sexe==='F').length,
          hommes: agData.filter(a=>a.sexe==='M').length,
          catA:   agData.filter(a=>['A1','A2','A3'].includes(a.categorie)).length,
          dirs:   dirData.length,
          retraite: agData.filter(a=>a.retraite_n1===true||a.retraite_n1==='OUI').length,
        });
        try {
          const { data: pending } = await supabase.from('conges').select('id').eq('statut','En attente');
          setNotifCount(pending?.length||0);
        } catch(_){}
      } catch(e){ console.error(e); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', color:'#fff' }}>
        <div style={{ fontSize:48 }}>🏛️</div>
        <div style={{ fontSize:16, fontWeight:700, marginTop:12 }}>SyGRH — Chargement...</div>
        <div style={{ width:40, height:40, border:'4px solid rgba(255,255,255,0.2)', borderTop:'4px solid #38bdf8', borderRadius:'50%', margin:'20px auto 0', animation:'spin 1s linear infinite' }} />
        <style>{'@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
      </div>
    </div>
  );

  const role = profile?.role || 'agent';
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'users')    return role === 'admin';
    if (t.id === 'fichiers') return ['admin','directeur'].includes(role);
    return true;
  });

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8' }}>

      {/* ── HEADER ── */}
      <div style={{ background:'#0f172a', padding:'0 24px', display:'flex', alignItems:'center', gap:12, height:60, position:'sticky', top:0, zIndex:200, boxShadow:'0 2px 12px rgba(0,0,0,0.4)' }}>
        <span style={{ fontSize:24 }}>🏛️</span>
        <div>
          <div style={{ color:'#f8fafc', fontWeight:900, fontSize:15 }}>SyGRH — MDCJS</div>
          <div style={{ color:'#64748b', fontSize:10 }}>Ministère des Sports & Loisirs du Togo</div>
        </div>
        <div style={{ flex:1 }} />
        {notifCount>0 && (
          <button onClick={()=>setActiveTab('rh')}
            style={{ background:'#dc2626', color:'#fff', border:'none', borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            🔔 {notifCount} en attente
          </button>
        )}
        <div style={{ color:'#94a3b8', fontSize:12 }}>
          {profile?.nom_complet||user?.email?.split('@')[0]} · <span style={{ color:'#38bdf8', fontWeight:700 }}>{role.toUpperCase()}</span>
        </div>
        <button onClick={handleLogout}
          style={{ background:'transparent', border:'1px solid #475569', color:'#94a3b8', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12 }}>
          Déconnexion
        </button>
      </div>

      {/* ── NAVIGATION ── */}
      <div style={{ background:'#1e3a8a', display:'flex', alignItems:'center', padding:'0 20px', gap:4, overflowX:'auto', position:'sticky', top:60, zIndex:100, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
        {visibleTabs.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{
              background: activeTab===t.id ? '#fff' : 'transparent',
              color:      activeTab===t.id ? '#1e3a8a' : '#bfdbfe',
              border:'none', borderRadius: activeTab===t.id ? '0 0 0 0' : '0',
              borderBottom: activeTab===t.id ? '3px solid #fff' : '3px solid transparent',
              padding:'16px 20px', cursor:'pointer', fontWeight:700,
              fontSize:13, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:8,
              transition:'all .15s',
            }}>
            <span style={{ fontSize:16 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENU ── */}
      <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
        {activeTab==='accueil'  && <TabAccueil  stats={stats} agents={agents} directions={directions} profile={profile} setActiveTab={setActiveTab} />}
        {activeTab==='agents'   && <TabAgents   agents={agents} directions={directions} profile={profile} />}
        {activeTab==='chat'     && <TabChat     supabase={supabase} profile={profile} directions={directions} agents={agents} />}
        {activeTab==='rh'       && <TabRH       supabase={supabase} profile={profile} agents={agents} />}
        {activeTab==='fichiers' && <TabFichiers supabase={supabase} profile={profile} directions={directions} />}
        {activeTab==='users'    && role==='admin' && <TabUsers supabase={supabase} directions={directions} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET ACCUEIL
// ═══════════════════════════════════════════════════════════════
function TabAccueil({ stats, agents, directions, profile, setActiveTab }) {
  const kpis = [
    { label:'Total agents', value:stats.total||0, icon:'👥', color:'#1e40af', bg:'#eff6ff' },
    { label:'Hommes',        value:stats.hommes||0, icon:'👨', color:'#0369a1', bg:'#e0f2fe' },
    { label:'Femmes',        value:stats.femmes||0, icon:'👩', color:'#7c3aed', bg:'#ede9fe' },
    { label:'Catégorie A',   value:stats.catA||0,  icon:'⭐', color:'#059669', bg:'#d1fae5' },
    { label:'Directions',    value:stats.dirs||0,  icon:'🏢', color:'#d97706', bg:'#fef3c7' },
    { label:'Retraite N+1',  value:stats.retraite||0, icon:'⏰', color:'#dc2626', bg:'#fee2e2' },
  ];

  // Graphique barres par catégorie
  const cats = ['A1','A2','A3','B','C','D','00'];
  const catCounts = cats.map(c => ({ label:c, count: agents.filter(a=>a.categorie===c).length, color: CAT_COLORS[c]||'#94a3b8' }));
  const maxCat = Math.max(...catCounts.map(c=>c.count), 1);

  // Top 6 directions par effectif
  const dirCounts = directions.slice(0,6).map(d => ({
    label: d.code||d.nom?.slice(0,8),
    count: agents.filter(a=>a.direction_code===d.code).length,
  }));
  const maxDir = Math.max(...dirCounts.map(d=>d.count), 1);

  const raccourcis = [
    { label:'Voir tous les agents',    tab:'agents',   icon:'👥', color:'#1e40af' },
    { label:'Demandes RH',             tab:'rh',       icon:'📋', color:'#dc2626' },
    { label:'Messagerie',              tab:'chat',     icon:'💬', color:'#059669' },
  ];

  return (
    <div>
      <h2 style={{ margin:'0 0 20px', fontSize:20, fontWeight:900, color:'#0f172a' }}>🏠 Tableau de bord</h2>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:28 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.color}22`, borderRadius:14, padding:'18px 20px' }}>
            <div style={{ fontSize:28 }}>{k.icon}</div>
            <div style={{ fontSize:28, fontWeight:900, color:k.color, marginTop:6 }}>{k.value}</div>
            <div style={{ fontSize:12, color:'#475569', marginTop:4, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:28 }}>

        {/* Catégories */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:16 }}>📊 Agents par catégorie</div>
          {catCounts.map(c => (
            <div key={c.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:32, fontSize:12, fontWeight:700, color:'#475569', textAlign:'right' }}>{c.label}</div>
              <div style={{ flex:1, background:'#f1f5f9', borderRadius:6, height:22, overflow:'hidden' }}>
                <div style={{ width:`${(c.count/maxCat)*100}%`, background:c.color, height:'100%', borderRadius:6, display:'flex', alignItems:'center', paddingLeft:6, minWidth:c.count>0?24:0 }}>
                  {c.count>0 && <span style={{ fontSize:11, color:'#fff', fontWeight:700 }}>{c.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Directions */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20 }}>
          <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:16 }}>🏢 Top directions</div>
          {dirCounts.map((d,i) => (
            <div key={d.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:60, fontSize:11, fontWeight:700, color:'#475569', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.label}</div>
              <div style={{ flex:1, background:'#f1f5f9', borderRadius:6, height:22, overflow:'hidden' }}>
                <div style={{ width:`${(d.count/maxDir)*100}%`, background:`hsl(${210+i*20},70%,45%)`, height:'100%', borderRadius:6, display:'flex', alignItems:'center', paddingLeft:6, minWidth:d.count>0?24:0 }}>
                  {d.count>0 && <span style={{ fontSize:11, color:'#fff', fontWeight:700 }}>{d.count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accès rapides */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:20 }}>
        <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:14 }}>⚡ Accès rapides</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {raccourcis.map(r => (
            <button key={r.tab} onClick={()=>setActiveTab(r.tab)}
              style={{ background:r.color, color:'#fff', border:'none', borderRadius:10, padding:'12px 20px', cursor:'pointer', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:18 }}>{r.icon}</span> {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET AGENTS
// ═══════════════════════════════════════════════════════════════
function TabAgents({ agents, directions, profile }) {
  const [search, setSearch]   = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [selected, setSelected]   = useState(null);

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    const match = !q || (a.nom+' '+a.prenom+' '+(a.matricule||'')).toLowerCase().includes(q);
    const dir = !filterDir || a.direction_code === filterDir;
    const cat = !filterCat || a.categorie === filterCat;
    return match && dir && cat;
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'#0f172a' }}>👥 Liste des agents ({filtered.length}/{agents.length})</h2>
      </div>

      {/* Filtres */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher nom, prénom, matricule..."
          style={{ flex:1, minWidth:220, padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13 }} />
        <select value={filterDir} onChange={e=>setFilterDir(e.target.value)}
          style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, minWidth:160 }}>
          <option value="">Toutes directions</option>
          {directions.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
        </select>
        <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
          style={{ padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13 }}>
          <option value="">Toutes catégories</option>
          {['A1','A2','A3','B','C','D','00'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search||filterDir||filterCat) && (
          <button onClick={()=>{setSearch('');setFilterDir('');setFilterCat('');}}
            style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:10, padding:'10px 14px', cursor:'pointer', fontSize:13 }}>✕ Réinitialiser</button>
        )}
      </div>

      {/* Tableau */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Matricule','Nom & Prénom','Direction','Catégorie','Poste','Sexe','Action'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={7} style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:14 }}>Aucun agent trouvé</td></tr>
              ) : filtered.map((a,i) => (
                <tr key={a.id||i} style={{ borderBottom:'1px solid #f1f5f9', background: i%2===0?'#fff':'#fafafa' }}>
                  <td style={{ padding:'10px 16px', fontSize:12, color:'#64748b', fontFamily:'monospace' }}>{fmt(a.matricule)}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background: CAT_COLORS[a.categorie]||'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12, flexShrink:0 }}>
                        {(a.nom?.charAt(0)||'?')+(a.prenom?.charAt(0)||'?')}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{fmt(a.nom)} {fmt(a.prenom)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'10px 16px', fontSize:12, color:'#475569', fontWeight:600 }}>{fmt(a.direction_code)}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <span style={{ background: (CAT_COLORS[a.categorie]||'#94a3b8')+'22', color: CAT_COLORS[a.categorie]||'#475569', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{fmt(a.categorie)}</span>
                  </td>
                  <td style={{ padding:'10px 16px', fontSize:12, color:'#64748b', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fmt(a.poste||a.fonction)}</td>
                  <td style={{ padding:'10px 16px', textAlign:'center', fontSize:16 }}>{a.sexe==='F'?'👩':'👨'}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <button onClick={()=>setSelected(a)}
                      style={{ background:'#eff6ff', color:'#1e40af', border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal fiche agent */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={()=>setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:20, padding:32, maxWidth:500, width:'100%', maxHeight:'80vh', overflowY:'auto' }}
            onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:56, height:56, borderRadius:'50%', background: CAT_COLORS[selected.categorie]||'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:20 }}>
                  {(selected.nom?.charAt(0)||'?')+(selected.prenom?.charAt(0)||'?')}
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:'#0f172a' }}>{selected.nom} {selected.prenom}</div>
                  <div style={{ fontSize:12, color:'#64748b' }}>Matricule : {fmt(selected.matricule)}</div>
                </div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'#f1f5f9', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:16 }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                ['Direction', selected.direction_code],
                ['Catégorie', selected.categorie],
                ['Poste', selected.poste||selected.fonction],
                ['Sexe', selected.sexe==='F'?'Féminin':'Masculin'],
                ['Date naissance', fmtDate(selected.date_naissance)],
                ['Date recrutement', fmtDate(selected.date_recrutement)],
                ['Téléphone', selected.telephone],
                ['Email', selected.email],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1e293b', marginTop:3 }}>{fmt(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET CHAT
// ═══════════════════════════════════════════════════════════════
function TabChat({ supabase, profile, directions, agents }) {
  const role = profile?.role || 'agent';
  const myDir = profile?.direction_code;
  const [room,     setRoom]     = useState('general');
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const [error,    setError]    = useState('');
  const bottomRef = useRef();

  const rooms = [
    { id:'general', label:'💬 Général' },
    ...(role==='agent'
      ? directions.filter(d=>d.code===myDir).map(d=>({ id:`dir_${d.code}`, label:`🏢 ${d.code}` }))
      : directions.map(d=>({ id:`dir_${d.code}`, label:`🏢 ${d.code}` }))
    )
  ];

  const loadMessages = useCallback(async () => {
    try {
      const { data, error: err } = await supabase.from('messages').select('*').eq('room_id', room).order('created_at', { ascending:true }).limit(50);
      if (err) { setError('Table messages non disponible'); return; }
      setMessages(data||[]);
    } catch(e) { setError('Erreur de chargement'); }
  }, [room]);

  useEffect(() => {
    setMessages([]); setError('');
    loadMessages();
    const sub = supabase.channel(`room_${room}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`room_id=eq.${room}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [room]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await supabase.from('messages').insert({ room_id:room, content:text.trim(), sender_name: profile?.nom_complet||profile?.email||'Anonyme', sender_id: profile?.id });
      setText('');
    } catch(e) { setError('Erreur envoi'); }
  };

  return (
    <div>
      <h2 style={{ margin:'0 0 16px', fontSize:20, fontWeight:900, color:'#0f172a' }}>💬 Messagerie interne</h2>
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16, height:'65vh' }}>

        {/* Canaux */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'auto' }}>
          <div style={{ padding:'12px 16px', fontSize:11, fontWeight:800, color:'#64748b', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase' }}>Canaux</div>
          {rooms.map(r => (
            <div key={r.id} onClick={()=>setRoom(r.id)}
              style={{ padding:'12px 16px', cursor:'pointer', fontSize:13, fontWeight:room===r.id?800:500, color:room===r.id?'#1e40af':'#475569', background:room===r.id?'#eff6ff':'#fff', borderLeft:room===r.id?'3px solid #1e40af':'3px solid transparent', borderBottom:'1px solid #f8fafc' }}>
              {r.label}
            </div>
          ))}
        </div>

        {/* Zone messages */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'12px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:13, color:'#1e293b', background:'#f8fafc' }}>
            {rooms.find(r=>r.id===room)?.label||room}
          </div>
          {error ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#dc2626', fontSize:13 }}>⚠️ {error} — Créez d'abord la table messages dans Supabase</div>
          ) : (
            <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              {messages.length===0 && <div style={{ textAlign:'center', color:'#94a3b8', fontSize:13, marginTop:40 }}>Aucun message. Soyez le premier ! 👋</div>}
              {messages.map((m,i) => {
                const isMe = m.sender_id===profile?.id;
                return (
                  <div key={m.id||i} style={{ display:'flex', justifyContent:isMe?'flex-end':'flex-start' }}>
                    <div style={{ maxWidth:'70%', background:isMe?'#1e40af':'#f1f5f9', color:isMe?'#fff':'#1e293b', borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px', padding:'10px 14px' }}>
                      {!isMe && <div style={{ fontSize:10, fontWeight:700, color:'#64748b', marginBottom:4 }}>{m.sender_name}</div>}
                      <div style={{ fontSize:14 }}>{m.content}</div>
                      <div style={{ fontSize:10, color:isMe?'#93c5fd':'#94a3b8', marginTop:4, textAlign:'right' }}>{fmtDate(m.created_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
          {!error && (
            <form onSubmit={sendMessage} style={{ padding:'12px 16px', borderTop:'1px solid #e2e8f0', display:'flex', gap:10 }}>
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Tapez votre message..."
                style={{ flex:1, padding:'10px 14px', border:'1px solid #cbd5e1', borderRadius:10, fontSize:13, outline:'none' }} />
              <button type="submit" style={{ background:'#1e40af', color:'#fff', border:'none', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:13 }}>Envoyer</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET DEMANDES RH
// ═══════════════════════════════════════════════════════════════
function TabRH({ supabase, profile, agents }) {
  const role = profile?.role||'agent';
  const [sub, setSub]     = useState('conge');
  const [conges, setConges] = useState([]);
  const [atts, setAtts]     = useState([]);
  const [form, setForm]     = useState({ date_debut:'', date_fin:'', motif:'' });
  const [attForm, setAttForm] = useState({ type_attestation:'travail', motif:'', urgence:false });
  const [msg, setMsg]       = useState('');

  const loadData = useCallback(async () => {
    try {
      let qc = supabase.from('conges').select('*').order('created_at',{ascending:false});
      let qa = supabase.from('attestations').select('*').order('created_at',{ascending:false});
      if (role==='agent') { qc=qc.eq('agent_id',profile?.id); qa=qa.eq('agent_id',profile?.id); }
      const [{ data:c },{ data:a }] = await Promise.all([qc, qa]);
      setConges(c||[]); setAtts(a||[]);
    } catch(e){}
  }, [role, profile?.id]);

  useEffect(()=>{ loadData(); },[loadData]);

  const submitConge = async (type) => {
    setMsg('');
    try {
      await supabase.from('conges').insert({ ...form, type, agent_id:profile?.id, demandeur_nom:profile?.nom_complet||profile?.email, statut:'En attente' });
      setForm({ date_debut:'', date_fin:'', motif:'' });
      setMsg('✅ Demande envoyée avec succès !');
      loadData();
    } catch(e){ setMsg('❌ Erreur : '+e.message); }
  };

  const submitAtt = async () => {
    setMsg('');
    try {
      await supabase.from('attestations').insert({ ...attForm, agent_id:profile?.id, demandeur_nom:profile?.nom_complet||profile?.email, statut:'En attente' });
      setAttForm({ type_attestation:'travail', motif:'', urgence:false });
      setMsg('✅ Demande d\'attestation envoyée !');
      loadData();
    } catch(e){ setMsg('❌ Erreur : '+e.message); }
  };

  const updateStatut = async (table, id, statut) => {
    await supabase.from(table).update({ statut }).eq('id', id);
    loadData();
  };

  const SUBS = [
    { id:'conge',       label:'🌴 Congés annuels' },
    { id:'permission',  label:'🕐 Permissions' },
    { id:'attestation', label:'📜 Attestations' },
    ...(role==='admin'||role==='directeur' ? [{ id:'admin', label:'🔐 Tableau admin' }] : []),
  ];

  return (
    <div>
      <h2 style={{ margin:'0 0 16px', fontSize:20, fontWeight:900, color:'#0f172a' }}>📋 Demandes RH</h2>

      {/* Sous-onglets */}
      <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom:'2px solid #e2e8f0', paddingBottom:0 }}>
        {SUBS.map(s => (
          <button key={s.id} onClick={()=>setSub(s.id)}
            style={{ background:'transparent', border:'none', borderBottom:sub===s.id?'3px solid #1e40af':'3px solid transparent', padding:'10px 18px', cursor:'pointer', fontWeight:sub===s.id?800:600, fontSize:13, color:sub===s.id?'#1e40af':'#64748b' }}>
            {s.label}
          </button>
        ))}
      </div>

      {msg && <div style={{ padding:'12px 16px', borderRadius:10, marginBottom:16, background:msg.startsWith('✅')?'#d1fae5':'#fee2e2', color:msg.startsWith('✅')?'#065f46':'#991b1b', fontSize:13, fontWeight:600 }}>{msg}</div>}

      {/* CONGÉS */}
      {(sub==='conge'||sub==='permission') && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:24 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:16, color:'#0f172a' }}>{sub==='conge'?'🌴 Nouvelle demande de congé':'🕐 Nouvelle demande de permission'}</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>DATE DÉBUT</label>
              <input type="date" value={form.date_debut} onChange={e=>setForm({...form,date_debut:e.target.value})}
                style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>DATE FIN</label>
              <input type="date" value={form.date_fin} onChange={e=>setForm({...form,date_fin:e.target.value})}
                style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>MOTIF</label>
              <textarea value={form.motif} onChange={e=>setForm({...form,motif:e.target.value})} rows={3}
                style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13, boxSizing:'border-box', resize:'vertical' }} />
            </div>
            <button onClick={()=>submitConge(sub)} style={{ background:'#1e40af', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', cursor:'pointer', fontWeight:700, fontSize:14, width:'100%' }}>
              Soumettre la demande
            </button>
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:24 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:16, color:'#0f172a' }}>Mes demandes</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:320, overflowY:'auto' }}>
              {conges.filter(c=>c.type===sub).length===0 ? <div style={{ color:'#94a3b8', fontSize:13 }}>Aucune demande</div>
                : conges.filter(c=>c.type===sub).map(c => {
                  const s = ST[c.statut]||ST['En attente'];
                  return (
                    <div key={c.id} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>{fmtDate(c.date_debut)} → {fmtDate(c.date_fin)}</span>
                        <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s.icon} {c.statut}</span>
                      </div>
                      {c.motif && <div style={{ fontSize:12, color:'#64748b' }}>{c.motif}</div>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ATTESTATIONS */}
      {sub==='attestation' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:24 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>📜 Nouvelle demande d'attestation</div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>TYPE</label>
              <select value={attForm.type_attestation} onChange={e=>setAttForm({...attForm,type_attestation:e.target.value})}
                style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13 }}>
                <option value="travail">Attestation de travail</option>
                <option value="salaire">Attestation de salaire</option>
                <option value="presence">Attestation de présence</option>
                <option value="scolarite">Attestation de scolarité (enfant)</option>
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>MOTIF</label>
              <textarea value={attForm.motif} onChange={e=>setAttForm({...attForm,motif:e.target.value})} rows={3}
                style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, cursor:'pointer', fontSize:13 }}>
              <input type="checkbox" checked={attForm.urgence} onChange={e=>setAttForm({...attForm,urgence:e.target.checked})} />
              <span style={{ fontWeight:600, color:'#dc2626' }}>🚨 Demande urgente</span>
            </label>
            <button onClick={submitAtt} style={{ background:'#1e40af', color:'#fff', border:'none', borderRadius:10, padding:'12px 24px', cursor:'pointer', fontWeight:700, fontSize:14, width:'100%' }}>
              Soumettre
            </button>
          </div>
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:24 }}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>Mes attestations</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:320, overflowY:'auto' }}>
              {atts.length===0 ? <div style={{ color:'#94a3b8', fontSize:13 }}>Aucune demande</div>
                : atts.map(a => {
                  const s = ST[a.statut]||ST['En attente'];
                  return (
                    <div key={a.id} style={{ border:'1px solid #e2e8f0', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:700 }}>{a.type_attestation}{a.urgence?' 🚨':''}</span>
                        <span style={{ background:s.bg, color:s.color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{s.icon} {a.statut}</span>
                      </div>
                      {a.motif && <div style={{ fontSize:12, color:'#64748b' }}>{a.motif}</div>}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN */}
      {sub==='admin' && (role==='admin'||role==='directeur') && (
        <div>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>🔐 Toutes les demandes en attente</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[...conges.filter(c=>c.statut==='En attente').map(c=>({...c,_table:'conges'})),
               ...atts.filter(a=>a.statut==='En attente').map(a=>({...a,_table:'attestations'}))].length===0
              ? <div style={{ background:'#fff', borderRadius:14, padding:32, textAlign:'center', color:'#94a3b8', border:'1px solid #e2e8f0' }}>Aucune demande en attente 🎉</div>
              : [...conges.filter(c=>c.statut==='En attente').map(c=>({...c,_table:'conges'})),
                 ...atts.filter(a=>a.statut==='En attente').map(a=>({...a,_table:'attestations'}))].map(d => (
                <div key={d.id} style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1e293b' }}>{d.demandeur_nom}</div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>
                      {d._table==='conges' ? `${d.type} : ${fmtDate(d.date_debut)} → ${fmtDate(d.date_fin)}` : `Attestation ${d.type_attestation}${d.urgence?' 🚨':''}`}
                    </div>
                    {d.motif && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{d.motif}</div>}
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    <button onClick={()=>updateStatut(d._table,d.id,'Approuvé')}
                      style={{ background:'#d1fae5', color:'#065f46', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontWeight:700, fontSize:12 }}>✅ Approuver</button>
                    <button onClick={()=>updateStatut(d._table,d.id,'Rejeté')}
                      style={{ background:'#fee2e2', color:'#991b1b', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontWeight:700, fontSize:12 }}>❌ Rejeter</button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET FICHIERS
// ═══════════════════════════════════════════════════════════════
function TabFichiers({ supabase, profile, directions }) {
  const role = profile?.role||'agent';
  const [files,     setFiles]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [folder,    setFolder]    = useState('general');
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  // Dossiers = généraux + par direction
  const FOLDERS = [
    { id:'general',    label:'📂 Général' },
    { id:'rh',         label:'📂 RH' },
    { id:'finances',   label:'📂 Finances' },
    { id:'rapports',   label:'📂 Rapports' },
    { id:'courriers',  label:'📂 Courriers' },
    ...directions.map(d => ({ id:`dir_${d.code}`, label:`🏢 ${d.code}` })),
  ];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error:err } = await supabase.storage.from('sygrh-files').list(folder, { sortBy:{column:'created_at',order:'desc'} });
      if (err) setError(err.message);
      else setFiles((data||[]).filter(f=>f.name!=='.emptyFolderPlaceholder'));
    } catch(e){ setError('Erreur de chargement'); }
    setLoading(false);
  }, [folder]);

  useEffect(()=>{ load(); },[load]);

  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError('');
    try {
      const { error:err } = await supabase.storage.from('sygrh-files').upload(`${folder}/${Date.now()}_${file.name}`, file);
      if (err) throw err; load();
    } catch(e){ setError('Erreur upload : '+(e.message||'')); }
    setUploading(false); e.target.value='';
  };

  const download = async (name) => {
    const { data } = await supabase.storage.from('sygrh-files').createSignedUrl(`${folder}/${name}`, 60);
    if (data?.signedUrl) window.open(data.signedUrl,'_blank');
  };

  const del = async (name) => {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    await supabase.storage.from('sygrh-files').remove([`${folder}/${name}`]);
    load();
  };

  return (
    <div>
      <h2 style={{ margin:'0 0 20px', fontSize:20, fontWeight:900, color:'#0f172a' }}>📁 Gestionnaire de fichiers</h2>

      {/* Sélecteur dossier */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>📂 Dossier :</span>
        <select value={folder} onChange={e=>setFolder(e.target.value)}
          style={{ padding:'8px 14px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13, fontWeight:600, background:'#f8fafc', minWidth:200 }}>
          {FOLDERS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <span style={{ fontSize:12, color:'#94a3b8' }}>{files.length} fichier{files.length!==1?'s':''}</span>
        <div style={{ flex:1 }} />
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={upload} />
        <button onClick={load} style={{ background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 14px', cursor:'pointer', fontSize:13 }}>🔄 Actualiser</button>
        <button onClick={()=>fileRef.current?.click()} disabled={uploading}
          style={{ background: uploading?'#94a3b8':'#1e40af', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
          {uploading?'Upload…':'⬆️ Charger fichier'}
        </button>
      </div>

      {/* Liste fichiers */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        {error && <div style={{ padding:14, background:'#fef2f2', color:'#dc2626', fontSize:13 }}>⚠️ {error}</div>}
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>Chargement…</div>
        ) : files.length===0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📁</div>
            <div style={{ color:'#94a3b8', fontSize:14, fontWeight:600 }}>Dossier vide</div>
            <div style={{ color:'#cbd5e1', fontSize:12, marginTop:6 }}>Cliquez sur "Charger fichier" pour ajouter des fichiers</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['Fichier','Taille','Date','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((f,i) => (
                <tr key={f.id||i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>{fileIcon(f.name)}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{f.name.replace(/^\d+_/,'').slice(0,60)}</span>
                  </td>
                  <td style={{ padding:'10px 16px', fontSize:12, color:'#64748b' }}>{fmtSize(f.metadata?.size)}</td>
                  <td style={{ padding:'10px 16px', fontSize:12, color:'#94a3b8' }}>{fmtDate(f.created_at)}</td>
                  <td style={{ padding:'10px 16px' }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>download(f.name)} style={{ background:'#dbeafe', color:'#1e40af', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>⬇️ Télécharger</button>
                      {['admin','directeur'].includes(role) && (
                        <button onClick={()=>del(f.name)} style={{ background:'#fee2e2', color:'#dc2626', border:'none', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:700 }}>🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONGLET UTILISATEURS (admin only)
// ═══════════════════════════════════════════════════════════════
function TabUsers({ supabase, directions }) {
  const [users, setUsers]       = useState([]);
  const [form,  setForm]        = useState({ email:'', password:'', nom_complet:'', role:'agent', direction_code:'' });
  const [msg,   setMsg]         = useState('');
  const [loading, setLoading]   = useState(false);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at',{ascending:false});
    setUsers(data||[]);
  }, []);

  useEffect(()=>{ loadUsers(); },[loadUsers]);

  const createUser = async () => {
    if (!form.email||!form.password||!form.nom_complet) { setMsg('❌ Remplissez tous les champs obligatoires'); return; }
    setLoading(true); setMsg('');
    try {
      const { data, error } = await supabase.auth.admin.createUser({ email:form.email, password:form.password, email_confirm:true });
      if (error) throw error;
      await supabase.from('profiles').upsert({ id:data.user.id, email:form.email, nom_complet:form.nom_complet, role:form.role, direction_code:form.direction_code });
      setMsg('✅ Utilisateur créé avec succès !');
      setForm({ email:'', password:'', nom_complet:'', role:'agent', direction_code:'' });
      loadUsers();
    } catch(e){ setMsg('❌ Erreur : '+(e.message||'')); }
    setLoading(false);
  };

  const changeRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id);
    loadUsers();
  };

  return (
    <div>
      <h2 style={{ margin:'0 0 20px', fontSize:20, fontWeight:900, color:'#0f172a' }}>⚙️ Gestion des utilisateurs</h2>
      <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:20 }}>
        {/* Formulaire création */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:24, alignSelf:'start' }}>
          <div style={{ fontWeight:800, fontSize:15, marginBottom:20 }}>➕ Créer un compte</div>
          {[
            { label:'NOM COMPLET *', key:'nom_complet', type:'text', placeholder:'Ex: Koffi Amavi' },
            { label:'EMAIL *', key:'email', type:'email', placeholder:'email@mdcjs.tg' },
            { label:'MOT DE PASSE *', key:'password', type:'password', placeholder:'Minimum 6 caractères' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} placeholder={f.placeholder}
                style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13, boxSizing:'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>RÔLE</label>
            <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}
              style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13 }}>
              <option value="agent">Agent</option>
              <option value="directeur">Directeur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:5 }}>DIRECTION</label>
            <select value={form.direction_code} onChange={e=>setForm({...form,direction_code:e.target.value})}
              style={{ width:'100%', padding:'10px', border:'1px solid #cbd5e1', borderRadius:8, fontSize:13 }}>
              <option value="">— Aucune —</option>
              {directions.map(d => <option key={d.code} value={d.code}>{d.code} — {d.nom?.slice(0,30)}</option>)}
            </select>
          </div>
          {msg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:14, background:msg.startsWith('✅')?'#d1fae5':'#fee2e2', color:msg.startsWith('✅')?'#065f46':'#991b1b', fontSize:13 }}>{msg}</div>}
          <button onClick={createUser} disabled={loading}
            style={{ width:'100%', padding:'12px', background:loading?'#94a3b8':'#1e40af', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14 }}>
            {loading?'Création…':'Créer le compte'}
          </button>
        </div>

        {/* Liste utilisateurs */}
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:800, fontSize:14 }}>Comptes existants ({users.length})</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Nom complet','Email','Rôle','Direction','Action'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', fontSize:11, fontWeight:700, color:'#64748b', textAlign:'left', textTransform:'uppercase', borderBottom:'2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i) => (
                  <tr key={u.id} style={{ borderBottom:'1px solid #f1f5f9', background:i%2===0?'#fff':'#fafafa' }}>
                    <td style={{ padding:'10px 16px', fontSize:13, fontWeight:600, color:'#1e293b' }}>{u.nom_complet||'—'}</td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'#64748b' }}>{u.email}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span style={{ background:u.role==='admin'?'#fee2e2':u.role==='directeur'?'#fef3c7':'#eff6ff', color:u.role==='admin'?'#dc2626':u.role==='directeur'?'#d97706':'#1e40af', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700 }}>
                        {u.role||'agent'}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:12, color:'#64748b' }}>{u.direction_code||'—'}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <select defaultValue={u.role||'agent'} onChange={e=>changeRole(u.id,e.target.value)}
                        style={{ padding:'5px 10px', border:'1px solid #e2e8f0', borderRadius:6, fontSize:12, cursor:'pointer' }}>
                        <option value="agent">agent</option>
                        <option value="directeur">directeur</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
