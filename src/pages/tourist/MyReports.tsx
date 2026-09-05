import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileWarningIcon } from 'lucide-react';
import { api } from '../../api/client';
import { Button, Card, EmptyState, ErrorState, inr, Spinner } from '../../components/ui';
import type { ReportStatus, ServiceReportRecord } from '../../types';

const STATUS_TONE: Record<ReportStatus, string> = {
  Pending: 'bg-amberw/12 text-[#8a5c0d] border-amberw/35',
  'Under Review': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25',
  Resolved: 'bg-leaf/12 text-leaf border-leaf/30',
  Rejected: 'bg-ink/[0.06] text-ink-muted border-line'
};

export function MyReports() {
  const [rows, setRows] = useState<ServiceReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.
    get<{results: ServiceReportRecord[];}>('/api/reports').
    then((d) => setRows(d.results)).
    catch(() => setError('Your reports could not be loaded right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner label="Loading your reports" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">My reports</h1>
          <p className="mt-2 text-sm text-ink-soft">Status is updated by the reviewing authority.</p>
        </div>
        <Link to="/app/report">
          <Button>File a report</Button>
        </Link>
      </div>

      {rows.length === 0 ?
      <EmptyState
        icon={FileWarningIcon}
        title="No reports filed"
        body="If a service overcharged you or the listing was misleading, filing it protects the next traveller."
        action={
        <Link to="/app/report">
              <Button>Report a problem</Button>
            </Link>
        } /> :


      <div className="space-y-3">
          {rows.map((r) =>
        <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-snug text-ink">{r.service_name}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    #{r.id} · {r.category} · {r.city} ·{' '}
                    {new Date(r.incident_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_TONE[r.status]}`}>
              
                  {r.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{r.description}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
                <span>Amount: {inr(r.paid_price)}</span>
                {r.evidence_name ? <span>Evidence: {r.evidence_name}</span> : null}
                {r.cluster_label ? <span>Cluster: {r.cluster_label}</span> : null}
              </div>
              {r.admin_note ?
          <p className="mt-3 rounded-xl border border-line bg-canvas/70 px-3.5 py-2.5 text-sm text-ink-soft">
                  <span className="font-bold text-ink">Authority note: </span>
                  {r.admin_note}
                </p> :
          null}
            </Card>
        )}
        </div>
      }
    </div>);

}