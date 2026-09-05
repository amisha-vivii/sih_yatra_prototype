import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react';
import { api } from '../../api/client';
import { RiskMap } from '../../components/RiskMap';
import type { HotspotMarker } from '../../components/RiskMap';
import { Card, DataNote, ErrorState, RiskBadge, SectionHeading, Spinner } from '../../components/ui';

interface Analytics {
  complaints_over_time: {week: string;complaints: number;}[];
  risk_distribution: {level: string;count: number;}[];
  service_categories: {
    type: string;
    services: number;
    reports: number;
    reports_30d: number;
    complaint_trend: 'up' | 'down' | 'flat';
    avg_trust: number;
    avg_risk: number;
    price_anomaly_ratio: number;
  }[];
  price_anomaly_trend: {month: string;avg_deviation: number;flagged: number;}[];
  complaint_categories: {category: string;count: number;}[];
  clusters: {label: string;count: number;}[];
}

const LEVEL_COLORS: Record<string, string> = { Low: '#3f7d55', Medium: '#c98a1b', High: '#b2382b' };

const TREND_ICON = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: ArrowRightIcon };
const TREND_TONE = { up: '#b2382b', down: '#3f7d55', flat: '#7d7167' };

export function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [spots, setSpots] = useState<HotspotMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
    api.get<Analytics>('/api/admin/analytics'),
    api.get<{results: HotspotMarker[];}>('/api/admin/hotspots')]
    ).
    then(([a, h]) => {
      setData(a);
      setSpots(h.results);
    }).
    catch(() => setError('Analytics could not be loaded right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner label="Computing analytics" />;
  if (error || !data) return <ErrorState message={error || 'Analytics unavailable.'} onRetry={load} />;

  const tooltipStyle = { borderRadius: 12, border: '1px solid #e6ddcf', fontSize: 12 };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Analytics &amp; insights</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Trends across the reference corpus and everything travellers have filed since. Business insights and authority
          hotspots share the same signal base.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <h2 className="font-display text-lg text-ink">Complaints over time</h2>
          <p className="text-xs text-ink-muted">Complaints and traveller reports per week.</p>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.complaints_over_time} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#eee5d8" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="complaints" stroke="#b4531f" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">Risk distribution</h2>
          <p className="text-xs text-ink-muted">Registry services by risk band.</p>
          <div className="mt-2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.risk_distribution} dataKey="count" nameKey="level" innerRadius={44} outerRadius={70} paddingAngle={3}>
                  {data.risk_distribution.map((d) =>
                  <Cell key={d.level} fill={LEVEL_COLORS[d.level]} />
                  )}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {data.risk_distribution.map((d) =>
            <li key={d.level} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-ink-soft">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LEVEL_COLORS[d.level] }} />
                  {d.level}
                </span>
                <span className="font-bold text-ink">{d.count}</span>
              </li>
            )}
          </ul>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">Price anomaly trend</h2>
          <p className="text-xs text-ink-muted">
            Average deviation from local benchmarks in filed reports, with the count flagged above +25%.
          </p>
          <div className="mt-4 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.price_anomaly_trend} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#eee5d8" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="avg_deviation" stroke="#b2382b" fill="#b2382b" fillOpacity={0.13} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">Complaint categories</h2>
          <p className="text-xs text-ink-muted">Across the full corpus.</p>
          <div className="mt-4 h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.complaint_categories} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 42 }}>
                <CartesianGrid stroke="#eee5d8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#7d7167' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#7d7167' }}
                  axisLine={false}
                  tickLine={false}
                  width={110} />
                
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#3b4a7a" radius={[0, 5, 5, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Business insights"
          hint="How each service category is trending — the view a tourism business would act on." />
        
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/95">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Reports (30d)</th>
                <th className="px-4 py-3">Complaint trend</th>
                <th className="px-4 py-3">Price anomaly</th>
                <th className="px-4 py-3">Avg trust</th>
                <th className="px-4 py-3">Avg risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.service_categories.map((c) => {
                const Icon = TREND_ICON[c.complaint_trend];
                return (
                  <tr key={c.type}>
                    <td className="px-4 py-3 font-semibold text-ink">{c.type}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.services}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {c.reports_30d} <span className="text-xs text-ink-muted">of {c.reports}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold" style={{ color: TREND_TONE[c.complaint_trend] }}>
                        <Icon className="h-4 w-4" aria-hidden />
                        {c.complaint_trend === 'up' ? 'Rising' : c.complaint_trend === 'down' ? 'Easing' : 'Flat'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{Math.round(c.price_anomaly_ratio * 100)}%</td>
                    <td className="px-4 py-3 font-bold text-ink">{c.avg_trust}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: c.avg_risk > 60 ? '#b2382b' : c.avg_risk > 30 ? '#c98a1b' : '#3f7d55' }}>
                      {c.avg_risk}
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <DataNote>
            Trend compares the last 30 days of reports against everything older for that category. Anomaly share is the
            proportion of services whose Isolation Forest score exceeds 0.58.
          </DataNote>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionHeading title="Tourism hotspots" hint="Emerging clusters on real coordinates." />
          <RiskMap hotspots={spots} center={[23.2, 78.5]} zoom={5} height={380} />
        </div>
        <div>
          <SectionHeading title="Recurring complaint clusters" hint="Grouped by embedding similarity, not keywords." />
          <Card className="divide-y divide-line">
            {data.clusters.map((c) =>
            <div key={c.label} className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm font-semibold text-ink">{c.label}</p>
                <span className="rounded-full bg-clay-50 px-2.5 py-1 text-xs font-bold text-clay-600">{c.count}</span>
              </div>
            )}
          </Card>

          <div className="mt-4 space-y-3">
            {spots.slice(0, 3).map((s) =>
            <Card key={s.location_id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base text-ink">{s.city}</p>
                  <p className="text-xs text-ink-muted">{s.note}</p>
                </div>
                <RiskBadge level={s.level} />
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>);

}