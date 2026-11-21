import React, { useState } from 'react';
import { api, setAccessToken } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password, fullName, handle || undefined);
      setAccessToken(result.access_token);
      addToast(mode === 'login' ? 'Signed in successfully.' : 'Account created successfully.', 'success');
      window.location.replace('/');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Authentication failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-void">
      <form onSubmit={submit} className="card w-full max-w-md p-6 space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">BRANDVERSE AI</h1>
          <p className="text-sm text-secondary mt-1">
            {mode === 'login' ? 'Sign in to your workspace.' : 'Create your creator workspace.'}
          </p>
        </div>
        {mode === 'register' && (
          <>
            <input className="input w-full" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name" required />
            <input className="input w-full" value={handle} onChange={e => setHandle(e.target.value)} placeholder="@handle" />
          </>
        )}
        <input className="input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
        <input className="input w-full" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" minLength={6} required />
        <button className="btn-primary w-full justify-center" disabled={submitting}>
          {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="text-sm text-accent w-full" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
