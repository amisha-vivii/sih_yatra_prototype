import React from 'react';
import { BadgeIndianRupeeIcon, BrainCircuitIcon, DatabaseIcon, SlidersHorizontalIcon } from 'lucide-react';
import { CheckForm } from '../../components/CheckForm';
import { Card, SectionHeading } from '../../components/ui';

const STAGES = [
{ icon: DatabaseIcon, title: 'Collection & preprocessing', body: 'Text is cleaned, prices normalised, the city resolved to a geo record and missing values handled.' },
{ icon: SlidersHorizontalIcon, title: 'Feature extraction', body: 'Price ratio and deviation, service type, coordinates, area risk index, season, tenure and registration.' },
{ icon: BrainCircuitIcon, title: 'AI analysis', body: 'Isolation Forest scores the price/service pattern; embeddings match your text against the complaint corpus.' },
{ icon: BadgeIndianRupeeIcon, title: 'Trust & risk engine', body: 'Weighted signals become a Risk Score and YatraTrust score, each with its own contribution breakdown.' }];


export function CheckService() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Check trust &amp; risk</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
          One quote in, one explained verdict out. Adding the review or complaint text you received makes the semantic
          matching considerably sharper.
        </p>
      </div>

      <CheckForm />

      <section>
        <SectionHeading title="What runs when you submit" hint="Four stages, in order, every time." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s, i) =>
          <Card key={s.title} className="flex h-full flex-col p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-clay-50 p-1.5">
                  <s.icon className="h-4 w-4 text-clay-500" aria-hidden />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Stage {i + 1}</span>
              </div>
              <h3 className="mt-3 font-display text-base leading-snug text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </Card>
          )}
        </div>
      </section>
    </div>);

}