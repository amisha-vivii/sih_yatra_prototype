import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookmarkIcon,
  FileWarningIcon,
  HistoryIcon,
  MapIcon,
  ShieldCheckIcon,
  TrendingUpIcon } from
'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { CheckForm } from '../../components/CheckForm';
import { BackdropPanel } from '../../components/Backdrop';
import { BACKGROUNDS } from '../../data/seed';
import { RiskMap } from '../../components/RiskMap';
import type { MapMarker } from '../../components/RiskMap';
import { Button, Card, ErrorState, inr, RiskBadge, SectionHeading, Spinner, StatCard } from '../../components/ui';
import type { RiskAssessmentRecord, ServiceReportRecord } from '../../types';

export function TouristDashboard() {
  const { user } = useAuth();
  const [history, setHistory] = useState<RiskAssessmentRecord[]>([]);
  const [reports, setReports] = useState<ServiceReportRecord[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
    api.get<{results: RiskAssessmentRecord[];}>('/api/risk/history'),
    api.get<{results: ServiceReportRecord[];}>('/api/reports'),
    api.get<{results: any[];}>('/api/saved'),
    api.get<{results: MapMarker[];}>('/api/map/services')]
    ).
    then(([h, r, s, m]) => {
      setHistory(h.results);
      setReports(r.results);
      setSaved(s.results);
      setMarkers(m.results);
    }).
    catch(() => setError('We could not load your dashboard right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) return <Spinner label="Loading your dashboard" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const highRiskNearby = markers.filter((m) => m.risk_level === 'HIGH RISK').length;

  return (
    <div className="space-y-8">
      <BackdropPanel image={BACKGROUNDS.rajasthan} blur={3} overlay="bg-indigo-700/70">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between lg:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">Welcome to YatraShield</p>
            <h1 className="mt-2 font-display text-3xl leading-tight text-white sm:text-4xl">
              {user?.full_name?.split(' ')[0]}, check before you pay.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
              Enter what you were quoted. YatraShield compares it against the local benchmark, matches your text to past
              complaints and returns an explained risk verdict.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/app/map">
              <Button variant="secondary" size="sm">
                <MapIcon className="h-4 w-4" aria-hidden />
                Risk map
              </Button>
            </Link>
            <Link to="/app/report">
              <Button size="sm">Report an issue</Button>
            </Link>
          </div>
        </div>
      </BackdropPanel>

      <section>
        <SectionHeading
          title="Check a tourism service"
          hint="Hotel, agency, tour operator, guide, transport or a local activity." />
        
        <CheckForm />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Checks run" value={history.length} sub="Assessments on this account" icon={HistoryIcon} />
        <StatCard label="Reports filed" value={reports.length} sub={`${reports.filter((r) => r.status === 'Pending').length} awaiting review`} icon={FileWarningIcon} tone="#3b4a7a" />
        <StatCard label="Saved services" value={saved.length} sub="Watch-listed operators" icon={BookmarkIcon} tone="#3f7d55" />
        <StatCard label="High-risk listings" value={highRiskNearby} sub="Across covered cities" icon={TrendingUpIcon} tone="#b2382b" />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div>
          <SectionHeading
            title="Recent checks"
            hint="Every assessment keeps its reasons, so you can revisit the verdict."
            action={
            history.length ?
            <Link to="/app/history" className="text-sm font-semibold text-clay-600 hover:text-clay-700">
                  View all
                </Link> :
            null
            } />
          
          {history.length === 0 ?
          <Card className="p-6">
              <p className="text-sm text-ink-muted">
                No checks yet. Run your first one above — try a hotel in Jaipur quoted at ₹6,500 to see the anomaly path.
              </p>
            </Card> :

          <div className="space-y-3">
              {history.slice(0, 4).map((h) =>
            <Card key={h.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base text-ink">{h.service_name}</p>
                    <p className="text-xs text-ink-muted">
                      {h.service_type} · {h.city} · quoted {inr(h.quoted_price)} vs {inr(h.benchmark_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Trust {h.trust_score}</p>
                    <p className="font-display text-lg leading-none text-ink">{h.risk_score}/100</p>
                  </div>
                  <RiskBadge level={h.risk_level} />
                  <Link to={`/app/result/${h.id}`}>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </Link>
                </Card>
            )}
            </div>
          }
        </div>

        <div>
          <SectionHeading title="Around you" hint="Markers carry live trust and risk scores." />
          <RiskMap markers={markers} center={[26.9124, 75.7873]} zoom={5} height={360} />
          <Card className="mt-3 flex items-start gap-2.5 p-4">
            <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-clay-500" aria-hidden />
            <p className="text-xs leading-relaxed text-ink-muted">
              A high-risk marker means the signals warrant caution before paying — not that an operator is fraudulent.
            </p>
          </Card>
        </div>
      </section>
    </div>);

}