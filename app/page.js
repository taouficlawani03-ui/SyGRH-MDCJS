'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.07) 0%, transparent 60%), #0B1829' }}>

      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,rgba(201,168,76,1) 40px,rgba(201,168,76,1) 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(201,168,76,1) 40px,rgba(201,168,76,1) 41px)'
      }}/>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="font-display text-4xl font-black mb-1 gold-shimmer">SyGRH</h1>
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#8A9BB5' }}>
            Ministère des Sports &amp; Loisirs
          </p>
          <div className="divider-gold mt-3 mx-auto w-20"/>
        </div>

        <div className="glass rounded-2xl p-8 animate-fade-up2">
          <h2 className="font-display text-xl mb-1">Connexion</h2>
          <p className="text-sm mb-6" style={{ color: '#8A9BB5' }}>Accédez à votre espace sécurisé</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#8A9BB5' }}>
                Adresse email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="agent@mdcjs.tg"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'rgba(11,24,41,0.8)', border: '1px solid rgba(201,168,76,0.2)', color: '#F5F0E8' }}
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: '#8A9BB5' }}>
                Mot de passe
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'rgba(11,24,41,0.8)', border: '1px solid rgba(201,168,76,0.2)', color: '#F5F0E8' }}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full py-3 rounded-xl text-sm tracking-wider">
              {loading ? 'Connexion en cours...' : 'SE CONNECTER'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-5 animate-fade-up3" style={{ color: '#4a5568' }}>
          SyGRH_MDCJS © 2026 — Plateforme sécurisée
        </p>
      </div>
    </div>
  )
}
