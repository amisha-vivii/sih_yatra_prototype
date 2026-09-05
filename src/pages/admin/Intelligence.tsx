import React, { useEffect, useState } from 'react';
import { BrainCircuitIcon, CpuIcon, SlidersHorizontalIcon } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import {
  Button,
  Card,
  DataNote,
  ErrorState,
  Field,
  inputClass,
  RiskBadge,
  SectionHeading,
  Spinner } from
'../../components/ui';
import type { RiskAssessmentRecord, RiskConfig } from '../../types';

interface AiPayload {
  model: {
    embedding_model: string;
    embedding_dimensions: number;
    anomaly_model: string;
    anomaly_trees: number;
    anomaly_training_rows: number;
    anomaly_features: string[];
    fitted: boolean;
    error: string | null;
  };
  risk_config: RiskConfig;
  clusters: {label: string;count: number;}[];
  recent_assessments: RiskAssessmentRecord[];
}

export function AdminIntelligence() {
  const [data, setData] = useState<AiPayload | null>(null);
  const [low, setLow] = useState(30);
  const [medium, setMedium] = useState(60);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api.
    get<AiPayload>('/api/admin/ai').
    then((d) => {
      setData(d);
      setLow(d.risk_config.low_max);
      setMedium(d.risk_config.medium_max);
    }).
    catch(() => setError('Model information could not be loaded right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveThresholds = async () => {
    setBusy(true);
    setFlash('');
    try {
      await api.patch('/api/admin/config', { low_max: low, medium_max: medium });
      setFlash(`Thresholds saved: low ≤ ${low}, medium ≤ ${medium}, high above.`);
      load();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'Thresholds could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Reading model state" />;
  if (error || !data) return <ErrorState message={error || 'Unavailable.'} onRetry={load} />;

  const weights = Object.entries(data.risk_config.weights);
  const totalWeight = weights.reduce((s, [, v]) => s + (v as number), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Model intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          What is model-driven, what is rule-driven, and where the score thresholds sit. Everything here is inspectable
          so a score can always be defended.
        </p>
      </div>

      {data.model.error ?
      <p className="rounded-xl border border-alert/25 bg-alert/[0.06] px-3.5 py-2.5 text-sm font-medium text-alert" role="alert">
          The analysis models failed to initialise ({data.model.error}). Rule-based signals continue to score, and
          model-based signals fall back to neutral.
        </p> :
      null}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <span className="w-fit rounded-xl bg-indigo-500/10 p-2">
            <BrainCircuitIcon className="h-5 w-5 text-indigo-600" aria-hidden />
          </span>
          <h2 className="mt-4 font-display text-xl text-ink">Sentence embeddings</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Encoder</dt>
              <dd className="font-mono text-xs font-bold text-ink">{data.model.embedding_model}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Dimensions</dt>
              <dd className="font-bold text-ink">{data.model.embedding_dimensions}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Similarity</dt>
              <dd className="font-bold text-ink">Cosine</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Used for complaint similarity, recurring-complaint detection and near-duplicate review patterns. Vectors are
            IDF-weighted over the live corpus, so newly filed reports immediately shift similarity.
          </p>
        </Card>

        <Card className="p-6">
          <span className="w-fit rounded-xl bg-clay-50 p-2">
            <CpuIcon className="h-5 w-5 text-clay-500" aria-hidden />
          </span>
          <h2 className="mt-4 font-display text-xl text-ink">Isolation Forest</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Estimators</dt>
              <dd className="font-bold text-ink">{data.model.anomaly_trees}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Training rows</dt>
              <dd className="font-bold text-ink">{data.model.anomaly_training_rows}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">State</dt>
              <dd className="font-bold text-ink">{data.model.fitted ? 'Fitted' : 'Not fitted'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-muted">Features</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {data.model.anomaly_features.map((f) =>
            <li key={f} className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] text-ink-soft">
                {f}
              </li>
            )}
          </ul>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div>
          <SectionHeading title="Risk engine weights" hint="Maximum points each signal can contribute." />
          <Card className="p-5">
            <ul className="space-y-3">
              {weights.map(([key, value]) =>
              <li key={key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-soft">{key.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-ink">{value as number}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                    className="h-full rounded-full bg-clay-500"
                    style={{ width: `${(value as number) / totalWeight * 100}%` }} />
                  
                  </div>
                </li>
              )}
            </ul>
            <div className="mt-4">
              <DataNote>
                Model-driven signals: price anomaly, complaint similarity, review pattern. Rule-driven: complaint
                frequency, incident severity decay, location/season context, registration and tenure.
              </DataNote>
            </div>
          </Card>
        </div>

        <div>
          <SectionHeading title="Risk level thresholds" hint="Configurable, applied to every score immediately." />
          <Card className="p-5">
            <span className="w-fit rounded-xl bg-clay-50 p-2">
              <SlidersHorizontalIcon className="h-5 w-5 text-clay-500" aria-hidden />
            </span>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Low risk up to" htmlFor="low_max">
                <input
                  id="low_max"
                  type="number"
                  min={1}
                  max={98}
                  className={inputClass}
                  value={low}
                  onChange={(e) => setLow(Number(e.target.value))} />
                
              </Field>
              <Field label="Medium risk up to" htmlFor="medium_max">
                <input
                  id="medium_max"
                  type="number"
                  min={2}
                  max={99}
                  className={inputClass}
                  value={medium}
                  onChange={(e) => setMedium(Number(e.target.value))} />
                
              </Field>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Current bands: 0–{low} low, {low + 1}–{medium} medium, {medium + 1}–100 high.
            </p>
            <Button className="mt-4" loading={busy} onClick={saveThresholds}>
              Save thresholds
            </Button>
            {flash ?
            <p className="mt-3 text-sm font-medium text-ink-soft" role="status">
                {flash}
              </p> :
            null}
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div>
          <SectionHeading title="Semantic clusters" hint="Greedy clustering over complaint embeddings." />
          <Card className="divide-y divide-line">
            {data.clusters.map((c) =>
            <div key={c.label} className="flex items-center justify-between gap-4 p-4">
                <p className="text-sm font-semibold text-ink">{c.label}</p>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-600">{c.count}</span>
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHeading title="Latest assessments" hint="Runs from traveller accounts, with their feature values." />
          {data.recent_assessments.length === 0 ?
          <Card className="p-5">
              <p className="text-sm text-ink-muted">No assessments have been run yet on this deployment.</p>
            </Card> :

          <Card className="divide-y divide-line">
              {data.recent_assessments.map((a) =>
            <div key={a.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-base text-ink">{a.service_name}</p>
                    <RiskBadge level={a.risk_level} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {a.city} · anomaly {a.anomaly_score} · complaint cos {a.complaint_similarity} · review cos{' '}
                    {a.review_similarity}
                  </p>
                  <p className="mt-1.5 text-xs text-ink-soft">
                    Trust {a.trust_score}/100 · risk {a.risk_score}/100 · deviation {a.price_deviation_pct}%
                  </p>
                </div>
            )}
            </Card>
          }
        </div>
      </section>
    </div>);

}