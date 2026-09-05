import React, { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  inputClass,
  inr,
  RiskBadge,
  SectionHeading,
  Spinner } from
'../../components/ui';
import { REPORT_CATEGORIES, REPORT_STATUSES } from '../../types';
import type { ReportStatus, RiskLevel, ServiceReportRecord } from '../../types';

interface AdminReport extends ServiceReportRecord {
  reporter: string;
  service_profile: {risk_score: number;risk_level: RiskLevel;trust_score: number;} | null;
}

const STATUS_TONE: Record<ReportStatus, string> = {
  Pending: 'bg-amberw/12 text-[#8a5c0d] border-amberw/35',
  'Under Review': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25',
  Resolved: 'bg-leaf/12 text-leaf border-leaf/30',
  Rejected: 'bg-ink/[0.06] text-ink-muted border-line'
};

export function AdminReports() {
  const [rows, setRows] = useState<AdminReport[]>([]);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AdminReport | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (category) query.set('category', category);
    if (q) query.set('q', q);
    api.
    get<{results: AdminReport[];}>(`/api/admin/reports?${query.toString()}`).
    then((d) => {
      setRows(d.results);
      setSelected((prev) => prev ? d.results.find((r) => r.id === prev.id) ?? null : null);
    }).
    catch((err) =>
    setError(err instanceof ApiError ? err.message : 'The report queue could not be loaded. Please try again.')
    ).
    finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, q ? 260 : 0);
    return () => clearTimeout(t);
  }, [status, category, q]);

  useEffect(() => {
    setNote(selected?.admin_note ?? '');
  }, [selected?.id]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    REPORT_STATUSES.forEach((s) => map[s] = rows.filter((r) => r.status === s).length);
    return map;
  }, [rows]);

  const update = async (report: AdminReport, next: Partial<{status: ReportStatus;admin_note: string;}>) => {
    setSaving(true);
    setFlash('');
    try {
      const data = await api.patch<{report: AdminReport;}>(`/api/admin/reports/${report.id}`, next);
      setRows((prev) => prev.map((r) => r.id === report.id ? { ...r, ...data.report } : r));
      setSelected((prev) => prev && prev.id === report.id ? { ...prev, ...data.report } : prev);
      setFlash(`Report #${report.id} updated.`);
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'That change could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0) return <Spinner label="Loading the report queue" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Report queue</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Triage traveller reports, add an authority note, and move each case through its lifecycle.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {REPORT_STATUSES.map((s) =>
        <button
          key={s}
          onClick={() => setStatus(status === s ? '' : s)}
          className={`rounded-2xl border p-4 text-left transition-colors duration-150 ease-out ${
          status === s ? 'border-clay-400 bg-clay-50' : 'border-line bg-surface/95 hover:border-clay-200'}`
          }>
          
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{s}</p>
            <p className="mt-1 font-display text-2xl text-ink">{counts[s] ?? 0}</p>
          </button>
        )}
      </div>

      <Card className="flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            className={`${inputClass} pl-9`}
            placeholder="Search service, city or description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search reports" />
          
        </div>
        <select className={`${inputClass} sm:w-56`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {REPORT_CATEGORIES.map((c) =>
          <option key={c} value={c}>
              {c}
            </option>
          )}
        </select>
        <select className={`${inputClass} sm:w-48`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {REPORT_STATUSES.map((s) =>
          <option key={s} value={s}>
              {s}
            </option>
          )}
        </select>
      </Card>

      {flash ?
      <p className="rounded-xl border border-leaf/30 bg-leaf/[0.07] px-3.5 py-2.5 text-sm font-medium text-leaf" role="status">
          {flash}
        </p> :
      null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div>
          <SectionHeading title={`${rows.length} reports`} hint="Newest first." />
          {rows.length === 0 ?
          <EmptyState title="No reports match" body="Clear the filters to see the full queue." /> :

          <div className="space-y-3">
              {rows.map((r) =>
            <Card
              key={r.id}
              as="div"
              className={`transition-colors duration-150 ease-out ${selected?.id === r.id ? 'border-clay-400' : 'hover:border-clay-200'}`}>
              
                  <button type="button" onClick={() => setSelected(r)} className="w-full p-4 text-left">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-base text-ink">{r.service_name}</p>
                        <p className="text-xs text-ink-muted">
                          #{r.id} · {r.category} · {r.city} · {r.reporter}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_TONE[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{r.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-muted">
                      <span>Amount {inr(r.paid_price)}</span>
                      <span>{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      {r.cluster_label ? <span>Cluster: {r.cluster_label}</span> : null}
                      {r.service_profile ? <RiskBadge level={r.service_profile.risk_level} /> : null}
                    </div>
                  </button>
                </Card>
            )}
            </div>
          }
        </div>

        <div>
          <SectionHeading title="Case detail" hint="Changes are written straight to the report record." />
          {!selected ?
          <EmptyState title="Select a report" body="Pick a case from the queue to review it and set its status." /> :

          <Card className="p-5">
              <p className="font-display text-xl text-ink">{selected.service_name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                #{selected.id} · filed {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} by{' '}
                {selected.reporter}
              </p>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Category</dt>
                  <dd className="font-semibold text-ink">{selected.category}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">City</dt>
                  <dd className="font-semibold text-ink">{selected.city}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Amount</dt>
                  <dd className="font-semibold text-ink">{inr(selected.paid_price)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Incident date</dt>
                  <dd className="font-semibold text-ink">{selected.incident_date}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">Evidence</dt>
                  <dd className="font-semibold text-ink">{selected.evidence_name ?? '—'}</dd>
                </div>
                {selected.service_profile ?
              <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Service risk</dt>
                      <dd className="font-semibold text-ink">{selected.service_profile.risk_score}/100</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Service trust</dt>
                      <dd className="font-semibold text-ink">{selected.service_profile.trust_score}/100</dd>
                    </div>
                  </> :
              null}
              </dl>

              <p className="mt-4 rounded-xl border border-line bg-canvas/60 p-3.5 text-sm leading-relaxed text-ink-soft">
                {selected.description}
              </p>

              <div className="mt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">Set status</p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_STATUSES.map((s) =>
                <Button
                  key={s}
                  size="sm"
                  variant={selected.status === s ? 'primary' : 'secondary'}
                  disabled={saving}
                  onClick={() => update(selected, { status: s })}>
                  
                      {s}
                    </Button>
                )}
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="admin_note" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Authority note
                </label>
                <textarea
                id="admin_note"
                className={`${inputClass} min-h-[84px] resize-y`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was verified, and what action was taken." />
              
                <Button
                className="mt-3"
                size="sm"
                loading={saving}
                onClick={() => update(selected, { admin_note: note })}>
                
                  Save note
                </Button>
              </div>
            </Card>
          }
        </div>
      </section>
    </div>);

}