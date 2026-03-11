'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    // 1. Connexion Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // 2. Chercher le profil
    let { data: profile } = await supabase
      .from('profiles')
      .select('role, nom, prenoms, actif, direction_code')
      .eq('id', userId)
      .single();

    // 3. Si profil inexistant → le créer automatiquement
    if (!profile) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId, email: data.user.email, role: 'agent', actif: true })
        .select()
        .single();
      profile = newProfile;
    }

    // 4. Compte désactivé
    if (!profile || profile.actif === false) {
      await supabase.auth.signOut();
      setError('Compte désactivé. Contactez l\'administrateur.');
      setLoading(false);
      return;
    }

    // 5. Redirection selon le rôle
    if (profile.role === 'agent') {
      router.push('/workspace');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0d9488 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      <div style={{ display: 'flex', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', width: 820, maxWidth: '95vw' }}>

        {/* BRAND */}
        <div style={{ background: 'linear-gradient(160deg, #1e3a8a, #0d9488)', padding: '48px 40px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#fff' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🏛️</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', margin: 0 }}>SyGRH · MDCJS</h1>
          <p style={{ opacity: .7, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Système de Gestion des Ressources Humaines<br />
            Ministère des Sports &amp; Loisirs — Togo
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 32 }}>
            {[{ val: '281', lbl: 'Agents' }, { val: '24', lbl: 'Directions' }, { val: '3', lbl: 'Rôles' }].map(s => (
              <div key={s.lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{s.val}</div>
                <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', letterSpacing: .5 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 20 }}>
            <div style={{ fontSize: 10, opacity: .5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Niveaux d'accès</div>
            {[
              { role: 'Admin',     icon: '🔐', desc: 'Accès complet' },
              { role: 'Directeur', icon: '👔', desc: 'Sa direction' },
              { role: 'Agent',     icon: '👤', desc: 'Son espace' },
            ].map(r => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{r.role}</div>
                  <div style={{ fontSize: 11, opacity: .6 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FORM */}
        <div style={{ background: '#fff', padding: '48px 40px', width: 380, flexShrink: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>Connexion</h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 28px' }}>Entrez vos identifiants pour accéder</p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
              Adresse email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="votre.email@mdcjs.tg"
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', background: '#fafafa', color: '#1e293b', boxSizing: 'border-box', marginBottom: 16 }}
            />

            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 5 }}>
              Mot de passe
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, outline: 'none', background: '#fafafa', color: '#1e293b', boxSizing: 'border-box', marginBottom: 24 }}
            />

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1e40af, #0d9488)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '⏳ Connexion...' : '🔐 SE CONNECTER'}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: '14px', background: '#f8fafc', borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>ℹ️ Accès</div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
              Votre compte est créé par l'administrateur.<br />
              Pour toute demande : contactez la DRH.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
