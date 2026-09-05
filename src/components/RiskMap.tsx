import React, { useEffect, useMemo } from 'react';
import { CircleMarker, LayerGroup, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { InfoIcon } from 'lucide-react';
import { inr, riskColor } from './ui';
import type { RiskLevel } from '../types';

/**
 * Live interactive map. Tiles come from a real tile provider configured through
 * environment variables (VITE_MAP_TILE_URL / VITE_MAP_API_KEY) — Mapbox or
 * Google raster tiles drop straight in. With no key configured it falls back to
 * OpenStreetMap tiles, which need no key, so the map never breaks.
 */

const env = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>;
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';

function resolveTiles(): {url: string;attribution: string;usingFallback: boolean;} {
  const configured = env.VITE_MAP_TILE_URL;
  const key = env.VITE_MAP_API_KEY;
  if (configured && (!configured.includes('{key}') || key)) {
    return {
      url: configured.replace('{key}', key ?? ''),
      attribution: env.VITE_MAP_ATTRIBUTION || 'Map tiles by the configured provider',
      usingFallback: false
    };
  }
  return { url: OSM_URL, attribution: OSM_ATTRIBUTION, usingFallback: Boolean(configured && !key) };
}

export interface MapMarker {
  id: number;
  name: string;
  service_type: string;
  city: string;
  lat: number;
  lng: number;
  trust_score: number;
  risk_score: number;
  risk_level: RiskLevel;
  benchmark_price?: number | null;
  unit?: string;
  address?: string;
  registered?: boolean;
}

export interface HotspotMarker {
  location_id: number;
  city: string;
  lat: number;
  lng: number;
  avg_risk: number;
  level: RiskLevel;
  high_risk_services: number;
  reports_total: number;
  note: string;
}

function Recenter({ center, zoom }: {center: [number, number];zoom: number;}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.35 });
  }, [center[0], center[1], zoom]);
  return null;
}

export function RiskMap({
  markers = [],
  hotspots = [],
  center = [23.2, 78.5],
  zoom = 5,
  height = 460,
  onSelect







}: {markers?: MapMarker[];hotspots?: HotspotMarker[];center?: [number, number];zoom?: number;height?: number | string;onSelect?: (marker: MapMarker) => void;}) {
  const tiles = useMemo(resolveTiles, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        aria-label="Tourism service risk map">
        
        <TileLayer url={tiles.url} attribution={tiles.attribution} />
        <Recenter center={center} zoom={zoom} />

        <LayerGroup>
          {hotspots.map((spot) =>
          <CircleMarker
            key={`hotspot-${spot.location_id}`}
            center={[spot.lat, spot.lng]}
            radius={Math.max(14, Math.min(34, spot.avg_risk * 0.55))}
            pathOptions={{
              color: riskColor(spot.level),
              weight: 1.5,
              fillColor: riskColor(spot.level),
              fillOpacity: 0.16
            }}>
            
              <Tooltip direction="top" offset={[0, -6]}>
                <span className="text-xs font-semibold">
                  {spot.city} · {spot.avg_risk}/100
                </span>
              </Tooltip>
              <Popup>
                <div className="min-w-[190px]">
                  <p className="font-display text-base text-ink">{spot.city}</p>
                  <p className="mt-0.5 text-xs font-semibold" style={{ color: riskColor(spot.level) }}>
                    {spot.note}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs text-ink-soft">
                    <div className="flex justify-between gap-4">
                      <dt>Average risk</dt>
                      <dd className="font-semibold">{spot.avg_risk}/100</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>High-risk services</dt>
                      <dd className="font-semibold">{spot.high_risk_services}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Reports on file</dt>
                      <dd className="font-semibold">{spot.reports_total}</dd>
                    </div>
                  </dl>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </LayerGroup>

        <LayerGroup>
          {markers.map((m) =>
          <CircleMarker
            key={`svc-${m.id}`}
            center={[m.lat, m.lng]}
            radius={8}
            pathOptions={{
              color: '#fffdf9',
              weight: 2,
              fillColor: riskColor(m.risk_level),
              fillOpacity: 1
            }}
            eventHandlers={onSelect ? { click: () => onSelect(m) } : undefined}>
            
              <Popup>
                <div className="min-w-[210px]">
                  <p className="font-display text-base leading-tight text-ink">{m.name}</p>
                  <p className="text-xs text-ink-muted">
                    {m.service_type} · {m.city}
                  </p>
                  <dl className="mt-2 space-y-1 text-xs text-ink-soft">
                    <div className="flex justify-between gap-4">
                      <dt>YatraTrust</dt>
                      <dd className="font-semibold">{m.trust_score}/100</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Risk</dt>
                      <dd className="font-semibold" style={{ color: riskColor(m.risk_level) }}>
                        {m.risk_score}/100 · {m.risk_level.replace(' RISK', '')}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Local benchmark</dt>
                      <dd className="font-semibold">
                        {inr(m.benchmark_price ?? null)} {m.unit ?? ''}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt>Coordinates</dt>
                      <dd className="font-semibold">
                        {m.lat.toFixed(3)}, {m.lng.toFixed(3)}
                      </dd>
                    </div>
                  </dl>
                  {m.address ? <p className="mt-2 text-[11px] text-ink-muted">{m.address}</p> : null}
                </div>
              </Popup>
            </CircleMarker>
          )}
        </LayerGroup>
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-2 rounded-xl bg-surface/95 px-3 py-2 text-[11px] font-semibold shadow-card">
        {(['LOW RISK', 'MEDIUM RISK', 'HIGH RISK'] as RiskLevel[]).map((level) =>
        <span key={level} className="inline-flex items-center gap-1.5 text-ink-soft">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: riskColor(level) }} />
            {level.replace(' RISK', '')}
          </span>
        )}
      </div>

      {tiles.usingFallback ?
      <div className="absolute right-3 top-3 z-[400] flex max-w-[240px] items-start gap-1.5 rounded-xl bg-surface/95 px-3 py-2 text-[11px] text-ink-soft shadow-card">
          <InfoIcon className="mt-px h-3.5 w-3.5 shrink-0 text-amberw" aria-hidden />
          <span>MAP_API_KEY is not set, so open tiles are being used. Coordinates and scoring are unaffected.</span>
        </div> :
      null}
    </div>);

}