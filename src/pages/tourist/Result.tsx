import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  BookmarkIcon,
  CheckIcon,
  FileWarningIcon,
  MapPinIcon,
  TriangleAlertIcon } from
'lucide-react';
import { api, ApiError } from '../../api/client';
import { RiskMap } from '../../components/RiskMap';
import {
  Button,
  Card,
  DataNote,
  ErrorState,
  inr,
  RiskBadge,
  riskColor,
  ScoreDial,
  SectionHeading,
  Spinner } from
'../../components/ui';
import type { RiskAssessmentRecord } from '../../types';

export function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<RiskAssessmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedState, setSavedState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const load = () => {
    setLoading(true);
    setError('');
    api.
    get<{assessment: RiskAssessmentRecord;}>(`/api/risk/${id}`).
    then((d) => setData(d.assessment)).
    catch((err) =>
    setError(err instanceof ApiError ? err.message : 'This result could not be loaded. Please run the check again.')
    ).
    finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <Spinner label="Loading the assessment" />;
  if (error || !data) return <ErrorState message={error || 'Result unavailable.'} onRetry={load} />;

  const tone = riskColor(data.risk_level);
  const trustTone = data.trust_score >= 75 ? '#3f7d55' : data.trust_score >= 50 ? '#c98a1b' : '#b2382b';
  const positives = data.contributions.filter((c) => c.points <= 2);
  const negatives = data.contributions.filter((c) => c.points > 2);

  const save = async () => {
    if (!data.service_id) return;
    setSavedState('saving');
    try {
      await api.post('/api/saved', { service_id: data.service_id });
      setSavedState('saved');
    } catch {
      setSavedState('idle');
    }
  };

  return (
    <div className="space-y-7">
      <button
        onClick={() => navigate('/app/check')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors duration-150 ease-out hover:text-clay-600">
        
        <ArrowLeftIcon className="h-4 w-4" aria-hidden />
        Run another check
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>
        
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_1fr] lg:p-8">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl leading-tight text-ink">{data.service_name}</h1>
                <RiskBadge level={data.risk_level} />
              </div>
              <p className="mt-1.5 text-sm text-ink-muted">
                {data.service_type} · {data.city} · {data.lat.toFixed(4)}, {data.lng.toFixed(4)}
              </p>

              <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Quoted price</dt>
                  <dd className="mt-1 font-display text-2xl text-ink">{inr(data.quoted_price)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Local benchmark</dt>
                  <dd className="mt-1 font-display text-2xl text-ink">{inr(data.benchmark_price)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Deviation</dt>
                  <dd
                    className="mt-1 font-display text-2xl"
                    style={{ color: data.price_deviation_pct > 20 ? '#b2382b' : data.price_deviation_pct > 8 ? '#c98a1b' : '#3f7d55' }}>
                    
                    {data.price_deviation_pct > 0 ? '+' : ''}
                    {data.price_deviation_pct}%
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                <Link to={`/app/map?focus=${data.service_id ?? ''}&city=${encodeURIComponent(data.city)}`}>
                  <Button variant="secondary" size="sm">
                    <MapPinIcon className="h-4 w-4" aria-hidden />
                    View on map
                  </Button>
                </Link>
                <Link to={`/app/report?service=${encodeURIComponent(data.service_name)}&city=${encodeURIComponent(data.city)}`}>
                  <Button variant="secondary" size="sm">
                    <FileWarningIcon className="h-4 w-4" aria-hidden />
                    Report an issue
                  </Button>
                </Link>
                {data.service_id ?
                <Button variant="secondary" size="sm" onClick={save} loading={savedState === 'saving'}>
                    {savedState === 'saved' ? <CheckIcon className="h-4 w-4" aria-hidden /> : <BookmarkIcon className="h-4 w-4" aria-hidden />}
                    {savedState === 'saved' ? 'Saved' : 'Save service'}
                  </Button> :
                null}
              </div>
            </div>

            <div className="flex items-center justify-around gap-4 rounded-2xl bg-canvas/70 p-5">
              <ScoreDial value={data.trust_score} label="YatraTrust" caption={data.trust_label} tone={trustTone} />
              <ScoreDial value={data.risk_score} label="Risk score" caption={data.risk_level} tone={tone} />
            </div>
          </div>
        </Card>
      </motion.div>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <SectionHeading title="Why this score" hint="Weighted contributions, highest first." />
          <Card className="divide-y divide-line">
            {data.contributions.map((c) =>
            <div key={c.key} className="flex gap-4 p-4">
                <span
                className="mt-0.5 h-fit rounded-lg px-2 py-1 font-mono text-xs font-bold"
                style={{
                  backgroundColor: c.points > 2 ? '#b2382b14' : '#3f7d5514',
                  color: c.points > 2 ? '#b2382b' : '#3f7d55'
                }}>
                
                  {c.points > 0 ? `+${c.points}` : '0'}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                    {c.points > 2 ?
                  <TriangleAlertIcon className="h-4 w-4 text-alert" aria-hidden /> :

                  <CheckIcon className="h-4 w-4 text-leaf" aria-hidden />
                  }
                    {c.label}
                    <span className="rounded-full border border-line px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                      {c.source === 'model' ? 'model' : 'rule'}
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{c.detail}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 bg-canvas/60 p-4">
              <p className="text-sm font-bold text-ink">Total risk score</p>
              <p className="font-display text-xl" style={{ color: tone }}>
                {data.risk_score}/100 · {data.risk_level}
              </p>
            </div>
          </Card>

          <div className="mt-3">
            <DataNote>
              {negatives.length} signal{negatives.length === 1 ? '' : 's'} raised the score and {positives.length} came back
              clean. Contributions are the weighted signal strengths, so they always add up to the score shown.
            </DataNote>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeading title="YatraTrust signals" hint="Longer-run service quality, independent of this quote." />
            <Card className="p-5">
              <ul className="space-y-2.5">
                {data.trust_signals.map((s) =>
                <li key={s} className="flex items-start gap-2 text-sm text-ink-soft">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
                    {s}
                  </li>
                )}
              </ul>
            </Card>
          </div>

          {data.similar_complaints.length ?
          <div>
              <SectionHeading title="Semantically similar complaints" hint="Retrieved by embedding cosine similarity." />
              <Card className="divide-y divide-line">
                {data.similar_complaints.map((c, i) =>
              <div key={i} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600">
                        cos {c.similarity.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">“{c.text}”</p>
                  </div>
              )}
              </Card>
            </div> :
          null}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Safer alternatives nearby"
          hint="Same service type within 60 km, ranked by YatraTrust." />
        
        {data.alternatives.length === 0 ?
        <Card className="p-5">
            <p className="text-sm text-ink-muted">
              No nearby operator of this type currently scores better than this one.
            </p>
          </Card> :

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.alternatives.map((a) =>
          <Card key={a.service_id} className="flex h-full flex-col p-5">
                <p className="font-display text-base leading-snug text-ink">{a.name}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {a.service_type} · {a.distance_km} km away
                </p>
                <dl className="mt-3 space-y-1 text-xs text-ink-soft">
                  <div className="flex justify-between">
                    <dt>YatraTrust</dt>
                    <dd className="font-bold text-ink">{a.trust_score}/100</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Risk</dt>
                    <dd className="font-bold">{a.risk_score}/100</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Benchmark</dt>
                    <dd className="font-bold">{inr(a.benchmark_price)}</dd>
                  </div>
                </dl>
                <div className="mt-auto pt-3">
                  <Link to={`/app/map?focus=${a.service_id}&city=${encodeURIComponent(data.city)}`}>
                    <Button variant="secondary" size="sm" className="w-full">
                      Locate
                    </Button>
                  </Link>
                </div>
              </Card>
          )}
          </div>
        }
      </section>

      <section>
        <SectionHeading title="Location" hint="Coordinates stored on the service record." />
        <RiskMap
          center={[data.lat, data.lng]}
          zoom={12}
          height={320}
          markers={[
          {
            id: data.service_id ?? 0,
            name: data.service_name,
            service_type: data.service_type,
            city: data.city,
            lat: data.lat,
            lng: data.lng,
            trust_score: data.trust_score,
            risk_score: data.risk_score,
            risk_level: data.risk_level,
            benchmark_price: data.benchmark_price
          }]
          } />
        
      </section>
    </div>);

}