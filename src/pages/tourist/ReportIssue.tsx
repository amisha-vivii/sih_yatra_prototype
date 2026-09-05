import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2Icon, PaperclipIcon } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { Button, Card, DataNote, Field, inputClass, SectionHeading } from '../../components/ui';
import { REPORT_CATEGORIES } from '../../types';
import type { ReportCategory } from '../../types';

export function ReportIssue() {
  const [params] = useSearchParams();
  const [cities, setCities] = useState<string[]>([]);
  const [serviceName, setServiceName] = useState(params.get('service') || '');
  const [city, setCity] = useState(params.get('city') || 'Jaipur');
  const [category, setCategory] = useState<ReportCategory>('Overcharging');
  const [description, setDescription] = useState('');
  const [paid, setPaid] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [evidence, setEvidence] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{id: number;cluster_label: string | null;} | null>(null);

  useEffect(() => {
    api.
    get<{cities: {city: string;}[];}>('/api/meta/config').
    then((d) => setCities(d.cities.map((c) => c.city))).
    catch(() => setCities(['Jaipur', 'Agra', 'Goa', 'Varanasi', 'Delhi', 'Udaipur', 'Manali', 'Mumbai']));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    try {
      const data = await api.post<{report: {id: number;cluster_label: string | null;};}>('/api/reports', {
        service_name: serviceName,
        location: city,
        category,
        description,
        paid_price: paid,
        incident_date: date,
        evidence_name: evidence
      });
      setDone(data.report);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fields ?? {});
      } else {
        setError('Your report could not be submitted right now. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-leaf/12">
            <CheckCircle2Icon className="h-6 w-6 text-leaf" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">Report submitted successfully.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Reference #{done.id}. It is queued for the tourism authority and has already been added to the complaint
            corpus, so the next traveller checking this service sees the signal.
          </p>
          {done.cluster_label ?
          <p className="mt-3 inline-block rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600">
              Clustered as: {done.cluster_label}
            </p> :
          null}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/app/reports">
              <Button>View my reports</Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setDone(null);
                setDescription('');
                setPaid('');
                setEvidence(null);
              }}>
              
              File another
            </Button>
          </div>
        </Card>
      </div>);

  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Report a problem</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          What you file becomes a signal. The text is embedded and clustered with similar complaints, and the amount you
          paid feeds the price anomaly model.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service" htmlFor="service" error={fields.Service}>
              <input
                id="service"
                className={inputClass}
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Amber Gate Guesthouse"
                required />
              
            </Field>
            <Field label="Location" htmlFor="city" error={fields.Location}>
              <select id="city" className={inputClass} value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) =>
                <option key={c} value={c}>
                    {c}
                  </option>
                )}
              </select>
            </Field>
            <Field label="Category" htmlFor="category" error={fields.Category}>
              <select
                id="category"
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}>
                
                {REPORT_CATEGORIES.map((c) =>
                <option key={c} value={c}>
                    {c}
                  </option>
                )}
              </select>
            </Field>
            <Field label="Amount quoted or paid (₹)" htmlFor="paid" error={fields['Amount paid']} hint="Optional, but it sharpens the anomaly signal.">
              <input
                id="paid"
                inputMode="numeric"
                className={inputClass}
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="7800" />
              
            </Field>
          </div>

          <Field label="What happened" htmlFor="description" error={fields.Description} hint="At least 20 characters. Be specific about amounts and timing.">
            <textarea
              id="description"
              className={`${inputClass} min-h-[130px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required />
            
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date it happened" htmlFor="date" error={fields.incident_date}>
              <input
                id="date"
                type="date"
                className={inputClass}
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                required />
              
            </Field>
            <Field label="Evidence (optional)" htmlFor="evidence" hint={evidence ? `Attached: ${evidence}` : 'Bill, receipt or screenshot.'}>
              <label
                htmlFor="evidence"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-white px-3.5 py-2.5 text-sm text-ink-muted transition-colors duration-150 ease-out hover:border-clay-300">
                
                <PaperclipIcon className="h-4 w-4" aria-hidden />
                {evidence ? 'Change file' : 'Attach a file'}
                <input
                  id="evidence"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setEvidence(e.target.files?.[0]?.name ?? null)} />
                
              </label>
            </Field>
          </div>

          {error ?
          <p className="rounded-xl border border-alert/25 bg-alert/[0.06] px-3.5 py-2.5 text-sm font-medium text-alert" role="alert">
              {error}
            </p> :
          null}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <DataNote>Only the file name is stored on the record; no file contents leave your device.</DataNote>
            <Button type="submit" size="lg" loading={busy}>
              Submit report
            </Button>
          </div>
        </form>
      </Card>

      <section>
        <SectionHeading title="What happens next" />
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
          'Your report enters the authority queue as Pending.',
          'The models re-train, so the service score updates immediately.',
          'You can track the status from My reports until it is resolved.'].
          map((step, i) =>
          <li key={step} className="rounded-2xl border border-line bg-surface/95 p-4">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-clay-500 text-[11px] font-bold text-white">
                {i + 1}
              </span>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step}</p>
            </li>
          )}
        </ol>
      </section>
    </div>);

}