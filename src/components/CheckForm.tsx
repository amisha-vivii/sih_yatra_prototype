import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchCheckIcon } from 'lucide-react';
import { api, ApiError } from '../api/client';
import { Button, Card, DataNote, Field, inputClass } from './ui';
import { SERVICE_TYPES } from '../types';
import type { ServiceType } from '../types';

interface ServiceOption {
  id: number;
  name: string;
  service_type: ServiceType;
  city: string;
  benchmark_price: number | null;
  unit: string;
}

export function CheckForm({ compact = false }: {compact?: boolean;}) {
  const navigate = useNavigate();
  const [cities, setCities] = useState<string[]>([]);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [serviceType, setServiceType] = useState<ServiceType>('Hotel');
  const [serviceName, setServiceName] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [quoted, setQuoted] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    api.
    get<{cities: {city: string;}[];}>('/api/meta/config').
    then((d) => setCities(d.cities.map((c) => c.city))).
    catch(() => setCities(['Jaipur', 'Agra', 'Goa', 'Varanasi', 'Delhi', 'Udaipur', 'Manali', 'Mumbai']));
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.
    get<{results: ServiceOption[];}>(`/api/services?city=${encodeURIComponent(city)}&type=${encodeURIComponent(serviceType)}`).
    then((d) => {
      if (!cancelled) setOptions(d.results);
    }).
    catch(() => {
      if (!cancelled) setOptions([]);
    });
    return () => {
      cancelled = true;
    };
  }, [city, serviceType]);

  const matched = options.find((o) => o.name.toLowerCase() === serviceName.trim().toLowerCase());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api.post<{assessment: {id: number;};}>('/api/risk/analyze', {
        service_id: matched?.id ?? null,
        service_name: serviceName,
        service_type: serviceType,
        location: city,
        quoted_price: quoted,
        text
      });
      navigate(`/app/result/${data.assessment.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError('Unable to analyze this service right now. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={compact ? 'p-5' : 'p-6'}>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Service type" htmlFor="service_type" error={fields['Service type']}>
            <select
              id="service_type"
              className={inputClass}
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}>
              
              {SERVICE_TYPES.map((t) =>
              <option key={t} value={t}>
                  {t}
                </option>
              )}
            </select>
          </Field>

          <Field label="Location" htmlFor="location" error={fields.location || fields.Location}>
            <select id="location" className={inputClass} value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) =>
              <option key={c} value={c}>
                  {c}
                </option>
              )}
            </select>
          </Field>

          <Field
            label="Service name"
            htmlFor="service_name"
            error={fields['Service name']}
            hint={
            matched ?
            `Matched in the registry · benchmark ${matched.benchmark_price ? `₹${matched.benchmark_price.toLocaleString('en-IN')} ${matched.unit}` : 'unavailable'}` :
            options.length ?
            'Pick a listed operator or type any name — unlisted names are scored on area signals.' :
            'Type the name exactly as quoted to you.'
            }>
            
            <input
              id="service_name"
              className={inputClass}
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              list="service-options"
              placeholder="e.g. Royal Heritage Stay"
              required />
            
            <datalist id="service-options">
              {options.map((o) =>
              <option key={o.id} value={o.name} />
              )}
            </datalist>
          </Field>

          <Field label="Quoted price (₹)" htmlFor="quoted_price" error={fields['Quoted price']}>
            <input
              id="quoted_price"
              inputMode="numeric"
              className={inputClass}
              value={quoted}
              onChange={(e) => setQuoted(e.target.value)}
              placeholder="6500"
              required />
            
          </Field>
        </div>

        <div className="mt-4">
          <Field
            label="Review or complaint text (optional)"
            htmlFor="text"
            hint="Paste what you were told or what went wrong. This is embedded and matched against past complaints.">
            
            <textarea
              id="text"
              className={`${inputClass} min-h-[92px] resize-y`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="They said the room rate changes after check-in…" />
            
          </Field>
        </div>

        {error ?
        <p className="mt-4 rounded-xl border border-alert/25 bg-alert/[0.06] px-3.5 py-2.5 text-sm font-medium text-alert" role="alert">
            {error}
          </p> :
        null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <DataNote>Scored against the seeded benchmark and complaint corpus for that city and service type.</DataNote>
          <Button type="submit" size="lg" loading={busy}>
            <SearchCheckIcon className="h-4 w-4" aria-hidden />
            Check trust &amp; risk
          </Button>
        </div>
      </form>
    </Card>);

}