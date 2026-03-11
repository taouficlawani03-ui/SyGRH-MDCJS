'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const CAT_COLORS = {
  'A1': '#1e40af', 'A2': '#0369a1', 'A3': '#0e7490',
  'B': '#059669', 'C': '#d97706', 'D': '#dc2626', '00': '#7c3aed'
};

const SEXE_ICON = { 'M': '👨', 'F': '👩' };

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSexe, setFilterSexe] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'
  const [selected, setSelected] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      fetchData();
    };
    checkAuth();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: ag }, { data: dirs }] = await Promise.all([
      supabase.from('agents').select('*').order('nom'),
      supabase.from('directions').select('*').order('nom')
    ]);
    setAgents(ag || []);
    setDirections(dirs || []);
    setLoading(false);
  };

  const filtered = agents.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || 
      a.nom?.toLowerCase().includes(q) ||
      a.prenoms?.toLowerCase().includes(q) ||
      a.matricule?.toLowerCase().includes(q) ||
      a.fonction?.toLowerCase().includes(q) ||
      a.profil?.toLowerCase().includes(q);
    const matchDir = !filterDir || a.direction_code === filterDir;
    const matchCat = !filterCat || a.categorie === filterCat;
    const matchSexe = !filterSexe || a.sexe === filterSexe;
    return matchSearch && matchDir && matchCat && matchSexe;
  });

  const cats = [...new Set(agents.map(a => a.categorie).filter(Boolean))].sort();

  const dirName = (code) => directions.find(d => d.code === code)?.nom || code;

  const initials = (nom, prenoms) => {
    const n = (nom || '').charAt(0).toUpperCase();
    const p = (prenoms || '').charAt(0).toUpperCase();
    return n + p;
  };

  const fmt = (v) => (!v || v === 'null' || v === 'undefined' || v === 'nan') ? '—' : v;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #0d9488)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            ← Retour
          </button>
          <div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>👥 Agents du Ministère</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{filtered.length} agent(s) affiché(s) sur {agents.length} au total</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['table','cards'].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{ background: viewMode === m ? '#fff' : 'rgba(255,255,255,0.15)', color: viewMode === m ? '#1e3a8a' : '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
              {m === 'table' ? '☰ Tableau' : '⊞ Cartes'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI STRIP */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 28px', display: 'flex', gap: 24, overflowX: 'auto' }}>
        {[
          { label: 'Total agents', val: agents.length, color: '#1e40af' },
          { label: 'Femmes', val: agents.filter(a => a.sexe === 'F').length, color: '#db2777' },
          { label: 'Hommes', val: agents.filter(a => a.sexe === 'M').length, color: '#0369a1' },
          { label: 'Catégorie A', val: agents.filter(a => ['A1','A2','A3'].includes(a.categorie)).length, color: '#059669' },
          { label: 'Directions', val: directions.length, color: '#7c3aed' },
          { label: 'Contractuels', val: agents.filter(a => a.direction_code?.includes('Contractuel')).length, color: '#d97706' },
        ].map((k, i) => (
          <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 28px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher nom, matricule, fonction..."
          style={{ flex: 1, minWidth: 220, border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 14px', fontSize: 13, outline: 'none' }}
        />
        <select value={filterDir} onChange={e => setFilterDir(e.target.value)}
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
          <option value="">Toutes les directions</option>
          {directions.map(d => <option key={d.code} value={d.code}>{d.code} — {d.nom}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
          <option value="">Toutes catégories</option>
          {cats.map(c => <option key={c} value={c}>Catégorie {c}</option>)}
        </select>
        <select value={filterSexe} onChange={e => setFilterSexe(e.target.value)}
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '8px 12px', fontSize: 13, background: '#fff', outline: 'none' }}>
          <option value="">Tous</option>
          <option value="M">👨 Hommes</option>
          <option value="F">👩 Femmes</option>
        </select>
        {(search || filterDir || filterCat || filterSexe) && (
          <button onClick={() => { setSearch(''); setFilterDir(''); setFilterCat(''); setFilterSexe(''); }}
            style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
            ✕ Effacer filtres
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ padding: '20px 28px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#64748b', fontSize: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            Chargement des agents...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Aucun agent trouvé</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Essayez d'ajuster vos filtres</div>
          </div>
        ) : viewMode === 'cards' ? (
          // CARDS VIEW
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {filtered.map(a => (
              <div key={a.id} onClick={() => setSelected(a)}
                style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: 18, cursor: 'pointer', transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1e40af'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(30,64,175,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${CAT_COLORS[a.categorie] || '#94a3b8'}, #0d9488)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>
                    {initials(a.nom, a.prenoms)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{SEXE_ICON[a.sexe]} {a.nom} {a.prenoms}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmt(a.matricule)}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>📌 {fmt(a.fonction_detail || a.fonction)}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>🏢 {dirName(a.direction_code)}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: CAT_COLORS[a.categorie] + '20', color: CAT_COLORS[a.categorie] || '#475569', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>Cat. {fmt(a.categorie)}</span>
                  <span style={{ background: '#f0fdf4', color: '#059669', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{fmt(a.statut)}</span>
                  {a.anciennete && a.anciennete !== '0' && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 5, fontSize: 11 }}>{a.anciennete} ans</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // TABLE VIEW
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['#', 'Agent', 'Matricule', 'Direction', 'Catégorie', 'Fonction', 'Ancienneté', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={a.id} onClick={() => setSelected(a)}
                      style={{ cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${CAT_COLORS[a.categorie] || '#94a3b8'}, #0d9488)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                            {initials(a.nom, a.prenoms)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{SEXE_ICON[a.sexe]} {a.nom} {a.prenoms}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(a.profil)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', color: '#475569', fontFamily: 'monospace' }}>{fmt(a.matricule)}</td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: 11 }}>{a.direction_code}</span>
                      </td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ background: (CAT_COLORS[a.categorie] || '#94a3b8') + '20', color: CAT_COLORS[a.categorie] || '#475569', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: 11 }}>
                          {fmt(a.categorie)}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fmt(a.fonction_detail || a.fonction)}</td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', color: '#475569' }}>{a.anciennete && a.anciennete !== '0' ? `${a.anciennete} ans` : '—'}</td>
                      <td style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ background: '#f0fdf4', color: '#059669', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: 11 }}>{fmt(a.statut)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FICHE AGENT */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
            {/* Modal Header */}
            <div style={{ background: `linear-gradient(135deg, ${CAT_COLORS[selected.categorie] || '#1e3a8a'}, #0d9488)`, padding: '24px 24px 20px', borderRadius: '18px 18px 0 0', position: 'relative' }}>
              <button onClick={() => setSelected(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 24, border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                  {initials(selected.nom, selected.prenoms)}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{SEXE_ICON[selected.sexe]} {selected.nom} {selected.prenoms}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3 }}>{fmt(selected.fonction_detail || selected.fonction)}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>🏢 {dirName(selected.direction_code)}</div>
                </div>
              </div>
            </div>
            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Matricule', val: selected.matricule },
                  { label: 'Catégorie', val: selected.categorie },
                  { label: 'Grade', val: selected.grade },
                  { label: 'Indice', val: selected.indice },
                  { label: 'Statut', val: selected.statut },
                  { label: 'Localisation', val: selected.localisation },
                  { label: 'Date de naissance', val: selected.date_naissance },
                  { label: 'Date d\'engagement', val: selected.date_engagement },
                  { label: 'Dernier avancement', val: selected.date_dernier_avanc },
                  { label: 'Ancienneté', val: selected.anciennete ? selected.anciennete + ' ans' : null },
                  { label: 'Nbre d\'enfants', val: selected.nbre_enfants },
                  { label: 'Allocation unique', val: selected.allocation_unique },
                  { label: 'Profil', val: selected.profil, full: true },
                  { label: 'Retraite N+1', val: selected.retraite_n1 },
                  { label: 'Retraite N+2', val: selected.retraite_n2 },
                  { label: 'Retraite N+5', val: selected.retraite_n5 },
                ].map((row, i) => (
                  <div key={i} style={{ gridColumn: row.full ? '1/-1' : 'auto', background: '#f8fafc', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{fmt(row.val)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
