'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError('Email ou mot de passe incorrect'); setLoading(false); return; }
      router.push('/dashboard');
    } catch (e) {
      setError('Erreur de connexion'); setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'40px 36px', width:'100%', maxWidth:400, boxShadow:'0 25px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48 }}>🏛️</div>
          <div style={{ fontSize:20, fontWeight:900, color:'#0f172a', marginTop:8 }}>SyGRH — MDCJS</div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>Ministère des Sports & Loisirs du Togo</div>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              placeholder="votre@email.com"
              style={{ width:'100%', padding:'12px 14px', border:'2px solid #e5e7eb', borderRadius:10, fontSize:14, boxSizing:'border-box', outline:'none' }} />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>MOT DE PASSE</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width:'100%', padding:'12px 14px', border:'2px solid #e5e7eb', borderRadius:10, fontSize:14, boxSizing:'border-box', outline:'none' }} />
          </div>
          {error && <div style={{ background:'#fef2f2', color:'#dc2626', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16, textAlign:'center' }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'14px', background: loading ? '#94a3b8' : '#1e3a8a', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
