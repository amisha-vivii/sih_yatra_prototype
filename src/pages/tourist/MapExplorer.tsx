import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { BackdropPanel } from '../../components/Backdrop';
import { RiskMap } from '../../components/RiskMap';
import type { HotspotMarker, MapMarker } from '../../components/RiskMap';
import {
  Card,
  ErrorState,
  inputClass,
  inr,
  RiskBadge,
  SectionHeading,
  Spinner } from
'../../components/ui';
import { SERVICE_TYPES } from '../../types';
import { BACKGROUNDS } from '../../data/seed';

export function MapExplorer() {
  const [params] = useSearchParams();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [spots, setSpots] = useState<HotspotMarker[]>([]);
  const [cities, setCities] = useState<{city: string;lat: number;lng: number;}[]>([]);
  const [city, setCity] = useState(params.get('city') || 'All cities');
  const [type, setType] = useState('');
  const [level, setLevel] = useState('');
  const [showHotspots, setShowHotspots] = useState(true);
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
    api.get<{results: MapMarker[];}>('/api/map/services'),
    api.get<{results: HotspotMarker[];}>('/api/map/hotspots'),
    api.get<{cities: {city: string;lat: number;lng: number;}[];}>('/api/meta/config')]
    ).
    then(([m, h, c]) => {
      setMarkers(m.results);
      setSpots(h.results);
      setCities(c.cities);
      const focus = Number(params.get('focus'));
      if (focus) {
        const hit = m.results.find((x) => x.id === focus);
        if (hit) {
          setSelected(hit);
          setCity(hit.city);
        }
      }
    }).
    catch(() => setError('The map data could not be loaded right now. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () =>
    markers.filter(
      (m) =>
      (city === 'All cities' || m.city === city) && (
      !type || m.service_type === type) && (
      !level || m.risk_level === level)
    ),
    [markers, city, type, level]
  );

  const center = useMemo<[number, number]>(() => {
    if (selected) return [selected.lat, selected.lng];
    const match = cities.find((c) => c.city === city);
    return match ? [match.lat, match.lng] : [23.2, 78.5];
  }, [selected, city, cities]);

  if (loading) return <Spinner label="Loading the map" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <BackdropPanel image={BACKGROUNDS.india} blur={10} overlay="bg-indigo-700/75" className="rounded-2xl">
        <div className="p-6">
          <h1 className="font-display text-3xl text-white">Risk map</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
            Every marker is a registry service with live trust and risk scores. The soft rings are area-level hotspots
            aggregated from the services and reports inside each city.
          </p>
        </div>
      </BackdropPanel>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted">City</span>
          <select className={inputClass} value={city} onChange={(e) => {setCity(e.target.value);setSelected(null);}}>
            <option>All cities</option>
            {cities.map((c) =>
            <option key={c.city} value={c.city}>
                {c.city}
              </option>
            )}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted">Service type</span>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {SERVICE_TYPES.map((t) =>
            <option key={t} value={t}>
                {t}
              </option>
            )}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted">Risk level</span>
          <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            <option value="LOW RISK">Low</option>
            <option value="MEDIUM RISK">Medium</option>
            <option value="HIGH RISK">High</option>
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(e) => setShowHotspots(e.target.checked)}
            className="h-4 w-4 rounded border-line text-clay-500 focus:ring-clay-400" />
          
          <span className="text-sm font-semibold text-ink-soft">Show city hotspots</span>
        </label>
      </Card>

      <RiskMap
        markers={filtered}
        hotspots={showHotspots ? spots : []}
        center={center}
        zoom={selected ? 13 : city === 'All cities' ? 5 : 11}
        height={520}
        onSelect={setSelected} />
      

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div>
          <SectionHeading title={`${filtered.length} services in view`} hint="Sorted by risk, highest first." />
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 ys-scroll">
            {filtered.
            slice().
            sort((a, b) => b.risk_score - a.risk_score).
            map((m) =>
            <Card
              key={m.id}
              as="div"
              className={`transition-colors duration-150 ease-out hover:border-clay-300 ${
              selected?.id === m.id ? 'border-clay-400' : ''}`
              }>
              
                  <button type="button" className="w-full p-4 text-left" onClick={() => setSelected(m)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-base text-ink">{m.name}</p>
                      <RiskBadge level={m.risk_level} />
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {m.service_type} · {m.city} · benchmark {inr(m.benchmark_price ?? null)} {m.unit ?? ''}
                    </p>
                    <div className="mt-2 flex gap-5 text-xs text-ink-soft">
                      <span>
                        Trust <span className="font-bold text-ink">{m.trust_score}</span>
                      </span>
                      <span>
                        Risk <span className="font-bold text-ink">{m.risk_score}</span>
                      </span>
                      <span>{m.registered ? 'Registered' : 'Not registered'}</span>
                    </div>
                  </button>
                </Card>
            )}
          </div>
        </div>

        <div>
          <SectionHeading title="City hotspots" hint="Aggregated risk per covered city." />
          <div className="space-y-3">
            {spots.map((s) =>
            <Card key={s.location_id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base text-ink">{s.city}</p>
                  <p className="text-xs text-ink-muted">{s.note}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-ink-muted">Avg risk</p>
                  <p className="font-display text-lg leading-none text-ink">{s.avg_risk}/100</p>
                </div>
                <RiskBadge level={s.level} />
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>);

}