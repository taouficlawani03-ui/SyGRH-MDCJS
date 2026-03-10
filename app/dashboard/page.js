'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const DEPTS = [
  { id: 'SG', label: 'Secrétariat Général', icon: '🏛️' },
  { id: 'CAB', label: 'Cabinet', icon: '📋' },
  { id: 'DAF', label: 'DAF', icon: '💰' },
  { id: 'DMSCD', label: 'DMSCD', icon: '🏃' },
  { id: 'DSEP', label: 'DSEP', icon: '📚' },
  { id: 'DIESL', label: 'DIESL', icon: '⚡' },
  { id: 'DL', label: 'Direction Législative', icon: '⚖️' },
  { id: 'DISSU', label: 'DISSU', icon: '🔒' },
  { id: 'IPSL', label: 'IPSL', icon: '🎓' },
  { id: 'DPSSE', label: 'DPSSE', icon: '🏅' },
  { id: 'RH', label: 'Ressources Humaines', icon: '👥' },
  { id: 'PREVISION', label: 'Prévisions Budget', icon: '📊' },
]

function FileIcon({ name }) {
  const ext = name.split('.').pop()?.toLowerCase()
  const m = { pdf:'📄', xlsx:'📊', xls:'📊', doc:'📝', docx:'📝', ppt:'📎', pptx:'📎', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', zip:'📦', csv:'📋' }
  return <span>{m[ext] || '📁'}</span>
}

function fmt(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/1048576).toFixed(1) + ' MB'
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dept, setDept] = useState('SG')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [sidebar, setSidebar] = useState(true)
  const [notif, setNotif] = useState(null)
  const fileRef = useRef()

  useEffect(() => { checkUser() }, [])
  useEffect(() => { if (user) loadFiles() }, [dept, user])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
  }

  async function loadFiles() {
    const { data, error } = await supabase.storage
      .from('sygrh-files')
      .list(dept + '/', { sortBy: { column: 'created_at', order: 'desc' } })
    if (!error && data) setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
    else setFiles([])
  }

  async function upload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const { error } = await supabase.storage.from('sygrh-files').upload(`${dept}/${Date.now()}_${file.name}`, file)
    if (error) notify('Erreur lors du chargement', 'error')
    else { notify(`"${file.name}" chargé avec succès`, 'ok'); loadFiles() }
    setUploading(false)
    e.target.value = ''
  }

  async function download(name) {
    const { data } = await supabase.storage.from('sygrh-files').createSignedUrl(`${dept}/${name}`, 3600)
    if (data?.signedUrl) { const a = document.createElement('a'); a.href = data.signedUrl; a.download = name; a.click() }
  }

  async function del(name) {
    if (!confirm(`Supprimer "${name}" ?`)) return
    const { error } = await supabase.storage.from('sygrh-files').remove([`${dept}/${name}`])
    if (!error) { notify('Fichier supprimé', 'ok'); loadFiles() }
  }

  function notify(msg, type) {
    setNotif({ msg, type })
    setTimeout(() => setNotif(null), 3500)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  const cur = DEPTS.find(d => d.id === dept)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B1829' }}>

      {notif && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium animate-fade-up"
          style={{
            background: notif.type === 'ok' ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)',
            border: `1px solid ${notif.type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(220,38,38,0.4)'}`,
            color: notif.type === 'ok' ? '#86efac' : '#fca5a5',
            backdropFilter: 'blur(12px)',
          }}>
          {notif.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${sidebar ? 'w-60' : 'w-14'} flex flex-col flex-shrink-0 transition-all duration-300`}
        style={{ background: '#142240', borderRight: '1px solid rgba(201,168,76,0.15)' }}>

        <div className="flex items-center gap-3 px-3 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          {sidebar && <div><p className="font-display font-bold text-sm gold-shimmer">SyGRH</p><p className="text-xs" style={{ color: '#8A9BB5' }}>MDCJS</p></div>}
          <button onClick={() => setSidebar(!sidebar)} className="ml-auto opacity-40 hover:opacity-100 transition-opacity p-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={sidebar ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}/>
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-1">
          {sidebar && <p className="text-xs tracking-widest uppercase px-2 mb-2 mt-1" style={{ color: '#4a5568' }}>Directions</p>}
          {DEPTS.map(d => (
            <button key={d.id} onClick={() => setDept(d.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg mb-0.5 text-left transition-all ${dept === d.id ? '' : 'opacity-50 hover:opacity-80'}`}
              style={dept === d.id ? { background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#E8C96A' } : {}}>
              <span className="text-base flex-shrink-0">{d.icon}</span>
              {sidebar && <span className="text-xs font-medium truncate">{d.label}</span>}
              {sidebar && dept === d.id && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#C9A84C' }}/>}
            </button>
          ))}
        </nav>

        <div className="px-2 py-3" style={{ borderTop: '1px solid rgba(201,168,76,0.15)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            {sidebar && <div className="flex-1 min-w-0"><p className="text-xs truncate">{user?.email}</p></div>}
            <button onClick={logout} title="Déconnexion" className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', background: 'rgba(20,34,64,0.5)', backdropFilter: 'blur(8px)' }}>
          <div>
            <h1 className="font-display text-lg font-bold">{cur?.icon} {cur?.label}</h1>
            <p className="text-xs" style={{ color: '#8A9BB5' }}>{files.length} fichier(s)</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none w-44"
                style={{ background: 'rgba(11,24,41,0.8)', border: '1px solid rgba(201,168,76,0.2)', color: '#F5F0E8' }}/>
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={upload}/>
            <button onClick={() => fileRef.current.click()} disabled={uploading}
              className="btn-gold flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              {uploading ? 'Chargement...' : 'Charger fichier'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <div className="text-5xl mb-3">📂</div>
              <p className="font-display text-lg">Dossier vide</p>
              <p className="text-sm mt-1" style={{ color: '#8A9BB5' }}>Chargez le premier fichier</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 px-4 py-1.5 text-xs tracking-widest uppercase" style={{ color: '#4a5568' }}>
                <div className="col-span-6">Nom</div>
                <div className="col-span-2">Taille</div>
                <div className="col-span-3">Date</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              <div className="divider-gold"/>
              {filtered.map((f, i) => (
                <div key={f.name} className="glass glass-hover grid grid-cols-12 items-center px-4 py-3 rounded-xl animate-fade-up"
                  style={{ animationDelay: `${i*0.04}s` }}>
                  <div className="col-span-6 flex items-center gap-3 min-w-0">
                    <FileIcon name={f.name}/>
                    <span className="text-sm font-medium truncate">{f.name.replace(/^\d+_/, '')}</span>
                  </div>
                  <div className="col-span-2 text-xs" style={{ color: '#8A9BB5' }}>{fmt(f.metadata?.size)}</div>
                  <div className="col-span-3 text-xs" style={{ color: '#8A9BB5' }}>{fmtDate(f.created_at)}</div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <button onClick={() => download(f.name)} title="Télécharger"
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{ color: '#C9A84C', background: 'rgba(201,168,76,0.1)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    </button>
                    <button onClick={() => del(f.name)} title="Supprimer"
                      className="p-1.5 rounded-lg transition-all hover:scale-110"
                      style={{ color: '#fca5a5', background: 'rgba(220,38,38,0.1)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
