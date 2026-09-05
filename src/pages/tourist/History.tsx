import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HistoryIcon } from 'lucide-react';
import { api } from '../../api/client';
import { Button, Card, EmptyState, ErrorState, inr, RiskBadge, Spinner } from '../../components/ui';
import type { RiskAssessmentRecord } from '../../types';

export function History() {
  const [rows, setRows] = useState<RiskAssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.
    get<{results: RiskAssessmentRecord[];}>('/api/risk/history').
    then((d) => setRows(d.results)).
    catch(() => setError('Your check history could not be loaded. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner label="Loading your checks" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Recent checks</h1>
        <p className="mt-2 text-sm text-ink-soft">Every assessment keeps its full contribution breakdown.</p>
      </div>

      {rows.length === 0 ?
      <EmptyState
        icon={HistoryIcon}
        title="No checks yet"
        body="Run a trust and risk check on a quote and it will appear here with its reasons."
        action={
        <Link to="/app/check">
              <Button>Check a service</Button>
            </Link>
        } /> :


      <div className="overflow-hidden rounded-2xl border border-line bg-surface/95">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Quoted</th>
                <th className="px-4 py-3">Benchmark</th>
                <th className="px-4 py-3">Trust</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) =>
            <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{r.service_name}</p>
                    <p className="text-xs text-ink-muted">{r.service_type}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.city}</td>
                  <td className="px-4 py-3 text-ink-soft">{inr(r.quoted_price)}</td>
                  <td className="px-4 py-3 text-ink-soft">{inr(r.benchmark_price)}</td>
                  <td className="px-4 py-3 font-bold text-ink">{r.trust_score}</td>
                  <td className="px-4 py-3">
                    <RiskBadge level={r.risk_level} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/result/${r.id}`}>
                      <Button variant="secondary" size="sm">
                        Open
                      </Button>
                    </Link>
                  </td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      }
    </div>);

}