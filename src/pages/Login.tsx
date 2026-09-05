import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, LockIcon, ShieldIcon } from 'lucide-react';
import { ApiError } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Backdrop } from '../components/Backdrop';
import { BACKGROUNDS } from '../data/seed';
import { Button, Card, Field, inputClass, Spinner } from '../components/ui';

type Mode = 'tourist' | 'admin' | 'register';

const SAMPLE = {
  tourist: { email: 'tourist@yatrashield.demo', password: 'Tourist@123' },
  admin: { email: 'admin@yatrashield.demo', password: 'Admin@123' }
};

export function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>('tourist');
  const [email, setEmail] = useState(SAMPLE.tourist.email);
  const [password, setPassword] = useState(SAMPLE.tourist.password);
  const [fullName, setFullName] = useState('');
  const [homeCity, setHomeCity] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  if (loading) return <Spinner label="Checking your session" />;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace />;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setFields({});
    if (next === 'tourist' || next === 'admin') {
      setEmail(SAMPLE[next].email);
      setPassword(SAMPLE[next].password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const account =
      mode === 'register' ?
      await register({ full_name: fullName, email, password, home_city: homeCity, phone }) :
      await login(email, password);
      const next = params.get('next');
      if (account.role === 'admin') navigate('/admin', { replace: true });else
      navigate(next === 'map' ? '/app/map' : '/app', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError('Sign-in is unavailable right now. Please try again in a moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-full w-full items-center justify-center px-4 py-10">
      <Backdrop image={BACKGROUNDS.sunset} intensity="medium" blur={14} />

      <div className="w-full max-w-md">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-clay-600">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-clay-500 p-1.5">
              <ShieldIcon className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="font-display text-lg text-ink">YatraShield</span>
          </div>
          <h1 className="mt-5 font-display text-2xl text-ink">
            {mode === 'register' ? 'Create a traveller account' : 'Sign in'}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            {mode === 'admin' ?
            'Authority accounts open the report queue, analytics and hotspot views.' :
            mode === 'register' ?
            'New accounts are always traveller accounts. Authority access is provisioned separately.' :
            'Traveller accounts can check services, browse the map and file reports.'}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-clay-50 p-1" role="tablist" aria-label="Access type">
            {(
            [
            ['tourist', 'Traveller'],
            ['admin', 'Authority'],
            ['register', 'Register']] as
            [Mode, string][]).
            map(([value, label]) =>
            <button
              key={value}
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 ease-out ${
              mode === value ? 'bg-surface text-clay-600 shadow-card' : 'text-ink-soft hover:text-clay-600'}`
              }>
              
                {label}
              </button>
            )}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {mode === 'register' ?
            <>
                <Field label="Full name" htmlFor="full_name" error={fields.full_name || fields['Full name']}>
                  <input
                  id="full_name"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required />
                
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Home city" htmlFor="home_city">
                    <input
                    id="home_city"
                    className={inputClass}
                    value={homeCity}
                    onChange={(e) => setHomeCity(e.target.value)}
                    placeholder="Pune" />
                  
                  </Field>
                  <Field label="Phone" htmlFor="phone">
                    <input
                    id="phone"
                    className={inputClass}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 …" />
                  
                  </Field>
                </div>
              </> :
            null}

            <Field label="Email" htmlFor="email" error={fields.email}>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required />
              
            </Field>

            <Field
              label="Password"
              htmlFor="password"
              error={fields.password}
              hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
              
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required />
              
            </Field>

            {error ?
            <p className="rounded-xl border border-alert/25 bg-alert/[0.06] px-3.5 py-2.5 text-sm font-medium text-alert" role="alert">
                {error}
              </p> :
            null}

            <Button type="submit" loading={busy} className="w-full" size="lg">
              {mode === 'register' ? 'Create account' : mode === 'admin' ? 'Sign in as authority' : 'Sign in as traveller'}
            </Button>
          </form>

          {mode !== 'register' ?
          <div className="mt-6 rounded-xl border border-line bg-canvas/70 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                <LockIcon className="h-3.5 w-3.5 text-clay-500" aria-hidden />
                Sample accounts
              </p>
              <dl className="mt-2 space-y-1 text-xs text-ink-muted">
                <div className="flex justify-between gap-3">
                  <dt>Traveller</dt>
                  <dd className="font-mono text-[11px] text-ink-soft">tourist@yatrashield.demo · Tourist@123</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Authority</dt>
                  <dd className="font-mono text-[11px] text-ink-soft">admin@yatrashield.demo · Admin@123</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                Passwords are stored only as salted, iterated hashes. Your role is decided by the account, not by the tab
                you pick — and it cannot be switched after sign-in.
              </p>
            </div> :
          null}
        </Card>
      </div>
    </div>);

}