import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRoundIcon, LogOutIcon, ShieldAlertIcon } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, DataNote, ErrorState, SectionHeading, Spinner } from '../../components/ui';

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<{reports: number;checks: number;saved: number;} | null>(null);
  const [adminProbe, setAdminProbe] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
    api.get<{count: number;}>('/api/reports'),
    api.get<{count: number;}>('/api/risk/history'),
    api.get<{count: number;}>('/api/saved')]
    ).
    then(([r, c, s]) => setCounts({ reports: r.count, checks: c.count, saved: s.count })).
    catch(() => setError('Your profile could not be loaded right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  const probeAdmin = async () => {
    setAdminProbe('checking');
    try {
      await api.get('/api/admin/reports');
      setAdminProbe('Unexpected: the request was allowed.');
    } catch (err) {
      setAdminProbe(err instanceof ApiError ? `${err.status} · ${err.message}` : 'Request blocked.');
    }
  };

  if (loading) return <Spinner label="Loading your profile" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Profile</h1>
        <p className="mt-2 text-sm text-ink-soft">Your account and what it is allowed to do.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 font-display text-xl text-white">
            {user?.full_name?.[0]}
          </span>
          <div>
            <p className="font-display text-xl text-ink">{user?.full_name}</p>
            <p className="text-sm text-ink-muted">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Role</dt>
            <dd className="mt-1 font-display text-lg text-ink">Traveller</dd>
          </div>
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Home city</dt>
            <dd className="mt-1 font-display text-lg text-ink">{user?.home_city || '—'}</dd>
          </div>
          <div className="rounded-xl border border-line bg-canvas/60 p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Phone</dt>
            <dd className="mt-1 font-display text-lg text-ink">{user?.phone || '—'}</dd>
          </div>
        </dl>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Checks run</dt>
            <dd className="mt-1 font-display text-2xl text-ink">{counts?.checks ?? 0}</dd>
          </div>
          <div className="rounded-xl border border-line p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Reports filed</dt>
            <dd className="mt-1 font-display text-2xl text-ink">{counts?.reports ?? 0}</dd>
          </div>
          <div className="rounded-xl border border-line p-4">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Saved services</dt>
            <dd className="mt-1 font-display text-2xl text-ink">{counts?.saved ?? 0}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <SectionHeading title="Access & security" hint="Authorization is enforced by the service, not the interface." />
        <Card className="p-6">
          <ul className="space-y-3 text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <KeyRoundIcon className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" aria-hidden />
              Your password is stored only as a salted, iterated hash. Sessions use a signed token that is revoked on
              log out.
            </li>
            <li className="flex items-start gap-2">
              <ShieldAlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" aria-hidden />
              Authority endpoints reject this account with 403 even if the request is issued directly.
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={probeAdmin} loading={adminProbe === 'checking'}>
              Test authority endpoint
            </Button>
            {adminProbe && adminProbe !== 'checking' ?
            <span className="rounded-full border border-alert/30 bg-alert/[0.06] px-3 py-1 font-mono text-xs font-bold text-alert">
                {adminProbe}
              </span> :
            null}
          </div>
          <div className="mt-4">
            <DataNote>Try navigating to /admin directly — the role guard returns you here with a notice.</DataNote>
          </div>
        </Card>
      </section>

      <Button
        variant="danger"
        onClick={async () => {
          await logout();
          navigate('/login', { replace: true });
        }}>
        
        <LogOutIcon className="h-4 w-4" aria-hidden />
        Log out
      </Button>
    </div>);

}