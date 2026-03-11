'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentDir, setCurrentDir] = useState('Ressources Humaines');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const DIRECTIONS = [
    { code: 'SG', label: 'Secrétariat Général', icon: '🏛️' },
    { code: 'CAB', label: 'Cabinet', icon: '👔' },
    { code: 'DAF', label: 'DAF', icon: '💰' },
    { code: 'DMSCD', label: 'DMSCD', icon: '🏥' },
    { code: 'DSEP', label: 'DSEP', icon: '⚽' },
    { code: 'DIESL', label: 'DIESL', icon: '🏗️' },
    { code: 'DL', label: 'Direction Loisirs', icon: '🎭' },
    { code: 'DISSU', label: 'DISSU', icon: '🎓' },
    { code: 'IPSL', label: 'IPSL', icon: '📋' },
    { code: 'DPSSE', label: 'DPSSE', icon: '📊' },
    { code: 'DNJ', label: 'Direction Jeunesse', icon: '🌟' },
    { code: 'RH', label: 'Ressources Humaines', icon: '👥' },
  ];

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      setUser(session.user);
      await Promise.all([fetchStats(), fetchFiles('Ressources Humaines')]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchStats = async () => {
    const [{ count: totalAgents }, { count: totalDirs }] = await Promise.all([
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('directions').select('*', { count: 'exact', head: true }),
    ]);
    const { count: femmes } = await supabase.from('agents').select('*', { count: 'exact', head: true }).eq('sexe', 'F');
    setStats({ totalAgents, totalDirs, femmes });
  };

  const fetchFiles = async (dir) => {
    const { data } = await supabase.storage.from('sygrh-files').list(dir, { sortBy: { column: 'created_at', order: 'desc' } });
    setFiles(data || []);
    setCurrentDir(dir);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const path = `${currentDir}/${Date.now()}_${file.name}`;
    await supabase.storage.from('sygrh-files').upload(path, file);
    await fetchFiles(currentDir);
    setUploading(false);
  };

  const handleDownload = async (fileName) => {
    const { data } = await supabase.storage.from('sygrh-files').createSignedUrl(`${currentDir}/${fileName}`, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (fileName) => {
    if (!confirm(`Supprimer "${fileName}" ?`)) return;
    await supabase.storage.from('sygrh-files').remove([`${currentDir}/${fileName}`]);
    await fetchFiles(currentDir);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const fileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return '📄';
    if (['xlsx','xls','csv'].includes(ext)) return '📊';
    if (['docx','doc'].includes(ext)) return '📝';
    if (['jpg','jpeg','png','gif'].includes(ext)) return '🖼️';
    return '📎';
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
        <div style={{ fontSize: 16, opacity: .7 }}>Chargement...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#f1f5f9' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: 230, background: '#1e3a8a', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #0d9488, #0ea5e9)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏛️</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>SyGRH</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>MDCJS · Togo</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ flex: 1, padding: 8, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 8px 4px' }}>Navigation</div>
          
          {/* Agents Link — NEW */}
          <button onClick={() => router.push('/agents')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: 'none', background: 'rgba(255,255,255,0.12)', textAlign: 'left', marginBottom: 2 }}>
            <span style={{ fontSize: 14 }}>👥</span> Agents
            {stats?.totalAgents && <span style={{ marginLeft: 'auto', background: '#0d9488', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 10 }}>{stats.totalAgents}</span>}
          </button>

          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, padding: '12px 8px 4px' }}>Fichiers par Direction</div>
          
          {DIRECTIONS.map(d => (
            <button key={d.code} onClick={() => fetchFiles(d.label || d.code)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', color: currentDir === (d.label || d.code) ? '#1e3a8a' : 'rgba(255,255,255,0.7)', cursor: 'pointer', borderRadius: 8, fontSize: 12, fontWeight: currentDir === (d.label || d.code) ? 700 : 500, border: 'none', background: currentDir === (d.label || d.code) ? '#fff' : 'none', textAlign: 'left', marginBottom: 1, transition: '.15s' }}>
              <span>{d.icon}</span> {d.label}
            </button>
          ))}
        </div>

        {/* User footer */}
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #1e40af)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Administrateur</div>
            </div>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14 }} title="Déconnexion">🚪</button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>📁 {currentDir}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {stats && (
              <div style={{ display: 'flex', gap: 16, marginRight: 12 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>👥 <strong>{stats.totalAgents}</strong> agents</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>🏢 <strong>{stats.totalDirs}</strong> directions</span>
              </div>
            )}
            <label style={{ background: '#1e40af', color: '#fff', borderRadius: 9, padding: '7px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {uploading ? '⏳ Envoi...' : '⬆️ Charger fichier'}
              <input type="file" hidden onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Files content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {files.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#94a3b8' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📁</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#64748b' }}>Dossier vide</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Chargez le premier fichier</div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Fichier', 'Taille', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#64748b', fontWeight: 700, borderBottom: '1.5px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.name} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{fileIcon(f.name)}</span>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{f.name.replace(/^\d+_/, '')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', color: '#64748b' }}>{formatSize(f.metadata?.size)}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc', color: '#64748b' }}>{f.created_at ? new Date(f.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                      <td style={{ padding: '10px 16px', borderBottom: '1px solid #f8fafc' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleDownload(f.name)} style={{ background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>⬇️ Télécharger</button>
                          <button onClick={() => handleDelete(f.name)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>🗑️ Supprimer</button>
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
