import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkIcon, Trash2Icon } from 'lucide-react';
import { api } from '../../api/client';
import { Button, Card, EmptyState, ErrorState, inr, RiskBadge, Spinner } from '../../components/ui';
import type { RiskLevel, ServiceType } from '../../types';

interface SavedRow {
  saved_id: number;
  id: number;
  name: string;
  service_type: ServiceType;
  city: string;
  benchmark_price: number | null;
  unit: string;
  trust_score: number;
  risk_score: number;
  risk_level: RiskLevel;
}

export function Saved() {
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    api.
    get<{results: SavedRow[];}>('/api/saved').
    then((d) => setRows(d.results)).
    catch(() => setError('Your saved services could not be loaded. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (serviceId: number) => {
    setRemoving(serviceId);
    try {
      await api.del(`/api/saved/${serviceId}`);
      setRows((prev) => prev.filter((r) => r.id !== serviceId));
    } catch {
      setError('That service could not be removed right now.');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return <Spinner label="Loading saved services" />;
  if (error && rows.length === 0) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Saved services</h1>
        <p className="mt-2 text-sm text-ink-soft">Operators you are watching, with their current scores.</p>
      </div>

      {rows.length === 0 ?
      <EmptyState
        icon={BookmarkIcon}
        title="Nothing saved yet"
        body="Save a service from any result page to keep an eye on how its scores move."
        action={
        <Link to="/app/check">
              <Button>Check a service</Button>
            </Link>
        } /> :


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) =>
        <Card key={r.id} className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-snug text-ink">{r.name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {r.service_type} · {r.city}
                  </p>
                </div>
                <RiskBadge level={r.risk_level} />
              </div>
              <dl className="mt-4 space-y-1 text-sm text-ink-soft">
                <div className="flex justify-between">
                  <dt>YatraTrust</dt>
                  <dd className="font-bold text-ink">{r.trust_score}/100</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Risk score</dt>
                  <dd className="font-bold text-ink">{r.risk_score}/100</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Local benchmark</dt>
                  <dd className="font-bold text-ink">
                    {inr(r.benchmark_price)} <span className="text-xs font-normal text-ink-muted">{r.unit}</span>
                  </dd>
                </div>
              </dl>
              <div className="mt-auto flex gap-2 pt-4">
                <Link to={`/app/map?focus=${r.id}&city=${encodeURIComponent(r.city)}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    Locate
                  </Button>
                </Link>
                <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(r.id)}
              loading={removing === r.id}
              aria-label={`Remove ${r.name}`}>
              
                  <Trash2Icon className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </Card>
        )}
        </div>
      }
    </div>);

}