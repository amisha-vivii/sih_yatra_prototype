import React, { useEffect, useMemo, useState } from 'react';
import { PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import {
  Button,
  Card,
  ErrorState,
  Field,
  inputClass,
  inr,
  RiskBadge,
  SectionHeading,
  Spinner } from
'../../components/ui';
import { SERVICE_TYPES } from '../../types';
import type { RiskLevel, ServiceType } from '../../types';

interface AdminService {
  id: number;
  name: string;
  service_type: ServiceType;
  city: string;
  state: string;
  address: string;
  registered: boolean;
  years_active: number;
  benchmark_price: number | null;
  reports: number;
  complaints: number;
  trust_score: number;
  risk_score: number;
  risk_level: RiskLevel;
}

export function AdminServices() {
  const [rows, setRows] = useState<AdminService[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminService | null>(null);
  const [form, setForm] = useState({
    name: '',
    service_type: 'Hotel' as ServiceType,
    city: 'Jaipur',
    address: '',
    registered: true,
    years_active: 1
  });
  const [fields, setFields] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
    api.get<{results: AdminService[];}>('/api/admin/services'),
    api.get<{cities: {city: string;}[];}>('/api/meta/config')]
    ).
    then(([s, c]) => {
      setRows(s.results);
      setCities(c.cities.map((x) => x.city));
    }).
    catch(() => setError('The service registry could not be loaded. Please try again.')).
    finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(
    () =>
    rows.filter((r) =>
    `${r.name} ${r.city} ${r.service_type}`.toLowerCase().includes(q.toLowerCase().trim())
    ),
    [rows, q]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFlash('');
    setFields({});
    try {
      if (editing) {
        await api.patch(`/api/admin/services/${editing.id}`, form);
        setFlash(`${form.name} updated.`);
      } else {
        await api.post('/api/admin/services', form);
        setFlash(`${form.name} added to the registry.`);
      }
      setEditing(null);
      setForm({ name: '', service_type: 'Hotel', city: 'Jaipur', address: '', registered: true, years_active: 1 });
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        setFlash(err.message);
        setFields(err.fields ?? {});
      } else setFlash('That change could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: AdminService) => {
    setBusy(true);
    setFlash('');
    try {
      await api.del(`/api/admin/services/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setFlash(`${row.name} removed from the registry.`);
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : 'That service could not be removed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner label="Loading the registry" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Service registry</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Registry records drive benchmarks, map markers and scoring. Editing one re-scores it immediately.
        </p>
      </div>

      {flash ?
      <p className="rounded-xl border border-line bg-canvas/70 px-3.5 py-2.5 text-sm font-medium text-ink-soft" role="status">
          {flash}
        </p> :
      null}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input
                className={`${inputClass} pl-9`}
                placeholder="Search by name, city or type"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search registry" />
              
            </div>
          </Card>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface/95">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-canvas/70 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Benchmark</th>
                  <th className="px-4 py-3">Records</th>
                  <th className="px-4 py-3">Trust</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) =>
                <tr key={r.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-ink-muted">
                        {r.service_type} · {r.registered ? 'Registered' : 'Not registered'} · {r.years_active}y
                      </p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.city}</td>
                    <td className="px-4 py-3 text-ink-soft">{inr(r.benchmark_price)}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {r.reports} reports · {r.complaints} complaints
                    </td>
                    <td className="px-4 py-3 font-bold text-ink">{r.trust_score}</td>
                    <td className="px-4 py-3">
                      <RiskBadge level={r.risk_level} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditing(r);
                          setForm({
                            name: r.name,
                            service_type: r.service_type,
                            city: r.city,
                            address: r.address,
                            registered: r.registered,
                            years_active: r.years_active
                          });
                        }}>
                        
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(r)} disabled={busy} aria-label={`Remove ${r.name}`}>
                          <Trash2Icon className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <SectionHeading title={editing ? 'Edit service' : 'Add a service'} />
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-4" noValidate>
              <Field label="Name" htmlFor="svc_name" error={fields.Name}>
                <input
                  id="svc_name"
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required />
                
              </Field>
              <Field label="Service type" htmlFor="svc_type">
                <select
                  id="svc_type"
                  className={inputClass}
                  value={form.service_type}
                  onChange={(e) => setForm({ ...form, service_type: e.target.value as ServiceType })}>
                  
                  {SERVICE_TYPES.map((t) =>
                  <option key={t} value={t}>
                      {t}
                    </option>
                  )}
                </select>
              </Field>
              <Field label="City" htmlFor="svc_city" error={fields.city || fields.City}>
                <select
                  id="svc_city"
                  className={inputClass}
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  
                  {cities.map((c) =>
                  <option key={c} value={c}>
                      {c}
                    </option>
                  )}
                </select>
              </Field>
              <Field label="Address" htmlFor="svc_address" error={fields.Address}>
                <input
                  id="svc_address"
                  className={inputClass}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Area, city" />
                
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Years active" htmlFor="svc_years">
                  <input
                    id="svc_years"
                    type="number"
                    min={0}
                    max={60}
                    className={inputClass}
                    value={form.years_active}
                    onChange={(e) => setForm({ ...form, years_active: Number(e.target.value) })} />
                  
                </Field>
                <label className="flex items-end gap-2 pb-3">
                  <input
                    type="checkbox"
                    checked={form.registered}
                    onChange={(e) => setForm({ ...form, registered: e.target.checked })}
                    className="h-4 w-4 rounded border-line text-clay-500" />
                  
                  <span className="text-sm font-semibold text-ink-soft">Registered</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" loading={busy} className="flex-1">
                  {editing ? 'Save changes' :
                  <>
                      <PlusIcon className="h-4 w-4" aria-hidden />
                      Add service
                    </>
                  }
                </Button>
                {editing ?
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    setForm({ name: '', service_type: 'Hotel', city: 'Jaipur', address: '', registered: true, years_active: 1 });
                  }}>
                  
                    Cancel
                  </Button> :
                null}
              </div>
            </form>
          </Card>
        </div>
      </section>
    </div>);

}