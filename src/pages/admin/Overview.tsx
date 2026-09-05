import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingIcon,
  ClockIcon,
  FlameIcon,
  ShieldAlertIcon,
  TicketCheckIcon,
  TrendingUpIcon } from
'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';
import { RiskMap } from '../../components/RiskMap';
import type { HotspotMarker } from '../../components/RiskMap';
import {
  Button,
  Card,
  DataNote,
  ErrorState,
  RiskBadge,
  SectionHeading,
  Spinner,
  StatCard } from
'../../components/ui';
import type { ServiceReportRecord } from '../../types';

interface Stats {
  total_reports: number;
  pending_reports: number;
  under_review: number;
  resolved_reports: number;
  high_risk_services: number;
  tourism_businesses: number;
  risk_hotspots: number;
  covered_cities: number;
  avg_trust: number;
  assessments_run: number;
  corpus: {reviews: number;complaints: number;incidents: number;benchmarks: number;};
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [spots, setSpots] = useState<HotspotMarker[]>([]);
  const [reports, setReports] = useState<ServiceReportRecord[]>([]);
  const [timeline, setTimeline] = useState<{week: string;complaints: number;}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
    api.get<Stats>('/api/admin/stats'),
    api.get<{results: HotspotMarker[];}>('/api/admin/hotspots'),
    api.get<{results: ServiceReportRecord[];}>('/api/admin/reports'),
    api.get<{complaints_over_time: {week: string;complaints: number;}[];}>('/api/admin/analytics')]
    ).
    then(([s, h, r, a]) => {
      setStats(s);
      setSpots(h.results);
      setReports(r.results);
      setTimeline(a.complaints_over_time);
    }).
    catch(() => setError('The console could not load its data right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner label="Loading the console" />;
  if (error || !stats) return <ErrorState message={error || 'Console unavailable.'} onRetry={load} />;

  const pending = reports.filter((r) => r.status === 'Pending');

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-clay-600">YatraShield Admin</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Tourism trust operations</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            {stats.covered_cities} cities · {stats.tourism_businesses} registry services · average YatraTrust{' '}
            {stats.avg_trust}/100.
          </p>
        </div>
        <Link to="/admin/reports">
          <Button>
            <TicketCheckIcon className="h-4 w-4" aria-hidden />
            Open report queue
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total reports" value={stats.total_reports} sub={`${stats.resolved_reports} resolved`} icon={TicketCheckIcon} emphasis />
        <StatCard label="Pending reports" value={stats.pending_reports} sub={`${stats.under_review} under review`} icon={ClockIcon} tone="#c98a1b" />
        <StatCard label="High-risk services" value={stats.high_risk_services} sub="Scored above the high threshold" icon={ShieldAlertIcon} tone="#b2382b" />
        <StatCard label="Tourism businesses" value={stats.tourism_businesses} sub="In the service registry" icon={BuildingIcon} tone="#3b4a7a" />
        <StatCard label="Risk hotspots" value={stats.risk_hotspots} sub="Cities above low risk" icon={FlameIcon} tone="#b4531f" />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionHeading title="Tourism risk hotspots" hint="Ring size scales with the city's average risk score." />
          <RiskMap hotspots={spots} center={[23.2, 78.5]} zoom={5} height={420} />
        </div>
        <div>
          <SectionHeading title="Complaint volume" hint="Complaints and reports per week, last ten weeks." />
          <Card className="p-4">
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="#eee5d8" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e6ddcf', fontSize: 12 }}
                    labelStyle={{ fontWeight: 700 }} />
                  
                  <Bar dataKey="complaints" fill="#b4531f" radius={[5, 5, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="mt-4 p-5">
            <h3 className="font-display text-base text-ink">Reference corpus</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
              ['Reviews', stats.corpus.reviews],
              ['Complaints', stats.corpus.complaints],
              ['Incidents', stats.corpus.incidents],
              ['Price benchmarks', stats.corpus.benchmarks]].
              map(([label, value]) =>
              <div key={String(label)} className="flex justify-between rounded-xl border border-line px-3 py-2">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-bold text-ink">{value as number}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4">
              <DataNote>
                Registry names are fictional and the reviews, complaints and incidents are synthetic reference records
                authored for this platform.
              </DataNote>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Cities needing attention"
          hint="Ranked by average risk across their registry services."
          action={
          <Link to="/admin/analytics" className="text-sm font-semibold text-clay-600 hover:text-clay-700">
              Full analytics
            </Link>
          } />
        
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {spots.slice(0, 4).map((s) =>
          <Card key={s.location_id} className="flex h-full flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg text-ink">{s.city}</p>
                  <p className="text-xs text-ink-muted">{s.note}</p>
                </div>
                <TrendingUpIcon className="h-4 w-4 text-clay-500" aria-hidden />
              </div>
              <p className="mt-3 font-display text-3xl leading-none text-ink">{s.avg_risk}</p>
              <p className="text-xs text-ink-muted">average risk / 100</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-xs text-ink-muted">{s.reports_total} reports</span>
                <RiskBadge level={s.level} />
              </div>
            </Card>
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Newest pending reports"
          hint="Straight from travellers, oldest first once you open the queue." />
        
        {pending.length === 0 ?
        <Card className="p-5">
            <p className="text-sm text-ink-muted">Nothing pending — the queue is clear.</p>
          </Card> :

        <div className="space-y-3">
            {pending.slice(0, 4).map((r) =>
          <Card key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base text-ink">{r.service_name}</p>
                  <p className="text-xs text-ink-muted">
                    #{r.id} · {r.category} · {r.city}
                  </p>
                </div>
                <p className="max-w-md truncate text-sm text-ink-soft">{r.description}</p>
                <Link to="/admin/reports">
                  <Button variant="secondary" size="sm">
                    Review
                  </Button>
                </Link>
              </Card>
          )}
          </div>
        }
      </section>
    </div>);

}