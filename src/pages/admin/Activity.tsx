import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Card, EmptyState, ErrorState, SectionHeading, Spinner } from '../../components/ui';

interface LogRow {
  id: number;
  actor: string;
  action: string;
  entity: string;
  entity_id: number | null;
  detail: string;
  created_at: string;
}

export function AdminActivity() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.
    get<{results: LogRow[];}>('/api/admin/audit').
    then((d) => setRows(d.results)).
    catch(() => setError('The activity log could not be loaded. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner label="Loading activity" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Activity log</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Every sign-in, analysis, report and registry change is written to the audit table.
        </p>
      </div>

      {rows.length === 0 ?
      <EmptyState title="No activity yet" body="Actions taken in the platform will be recorded here." /> :

      <>
          <SectionHeading title={`${rows.length} recent entries`} />
          <Card className="divide-y divide-line">
            {rows.map((r) =>
          <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] font-bold text-ink-soft">
                  {r.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{r.detail}</p>
                  <p className="text-xs text-ink-muted">
                    {r.actor} · {r.entity}
                    {r.entity_id ? ` #${r.entity_id}` : ''}
                  </p>
                </div>
                <span className="text-xs text-ink-muted">
                  {new Date(r.created_at).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
                </span>
              </div>
          )}
          </Card>
        </>
      }
    </div>);

}