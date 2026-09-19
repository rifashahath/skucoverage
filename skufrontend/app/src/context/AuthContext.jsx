import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (nextSession?.user) {
        const { data } = await supabase.from('users').select('*').eq('id', nextSession.user.id).maybeSingle()
        if (mounted) setProfile(data || null)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    loading,
    signIn: (email, password) => supabase?.auth.signInWithPassword({ email, password }) || Promise.resolve({ error: { message: 'Supabase is not configured.' } }),
    signUp: (email, password, name) => supabase?.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/app/` } }) || Promise.resolve({ error: { message: 'Supabase is not configured.' } }),
    resendConfirmation: (email) => supabase?.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/app/` } }) || Promise.resolve({ error: { message: 'Supabase is not configured.' } }),
    signInWithGoogle: () => supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/app/` } }) || Promise.resolve({ error: { message: 'Supabase is not configured.' } }),
    signOut: () => supabase?.auth.signOut() || Promise.resolve({ error: null })
  }), [loading, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
