import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BadgeIndianRupeeIcon,
  BotIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { Backdrop } from '../components/Backdrop';
import { BACKGROUNDS } from '../data/seed';
import { Button } from '../components/ui';

const PILLARS = [
  { icon: ShieldCheckIcon, title: 'Trust' },
  { icon: MapPinIcon, title: 'Location' },
  { icon: BadgeIndianRupeeIcon, title: 'Price' },
  { icon: BotIcon, title: 'AI Risk' },
];

const FLOW = [
  { step: 'Report', body: 'Share travel experiences and incidents.' },
  { step: 'Analyze', body: 'AI identifies patterns and potential risks.' },
  { step: 'Protect', body: 'Travellers make more informed decisions.' },
];

export function Landing() {
  return (
    <div className="relative min-h-full w-full overflow-hidden">
      <Backdrop image={BACKGROUNDS.varanasi} intensity="soft" blur={6} />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="leading-tight">
            <span className="block font-display text-lg text-ink">YatraShield</span>
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted sm:block">
              Tourism Trust &amp; Risk Intelligence
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold text-ink-soft sm:gap-7" aria-label="Public navigation">
          <a href="#about" className="hidden transition-colors hover:text-clay-600 sm:inline">About</a>
          <a href="#how-it-works" className="hidden transition-colors hover:text-clay-600 sm:inline">How It Works</a>
          <Link to="/login" className="transition-colors hover:text-clay-600">Login</Link>
          <Link to="/login"><Button size="sm">Register</Button></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 lg:px-8">
        <section className="flex py-8 sm:py-10 lg:py-12">
          <div className="max-w-xl">
            <h1
              className="font-display text-[48px] leading-[0.98] text-ink sm:text-7xl">
              Travel with confidence.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
              AI-powered intelligence for safer, smarter tourism.
            </p>
            <div className="mt-8">
              <Link to="/login">
                <Button size="lg" className="group">
                  Get Started <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Button>
              </Link>
            </div>
          </div>

        </section>

        <section id="about" aria-labelledby="pillars" className="border-y border-line py-8 sm:py-10">
          <div className="max-w-2xl">
            <h2 id="pillars" className="font-display text-3xl text-ink sm:text-4xl">Travel without hidden risks.</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">YatraShield brings trust, location, pricing and AI-powered risk intelligence together to create a safer tourism ecosystem.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-y-4 sm:grid-cols-4 sm:gap-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex items-center gap-3">
                <span className="rounded-xl bg-clay-50 p-2"><p.icon className="h-5 w-5 text-clay-500" aria-hidden /></span>
                <h3 className="font-display text-lg text-ink">{p.title}</h3>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how" className="py-10 sm:py-12">
          <h2 id="how" className="font-display text-3xl text-ink sm:text-4xl">How it works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3 md:gap-8">
            {FLOW.map((f, i) => (
              <li key={f.step} className="relative border-t border-line pt-4">
                <span className="text-xs font-bold tracking-[0.16em] text-clay-500">0{i + 1}</span>
                <h3 className="mt-3 font-display text-2xl text-ink">{f.step}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-[28px] bg-indigo-700 px-6 py-8 text-center shadow-lift sm:px-10 sm:py-10">
          <h2 className="font-display text-3xl text-white sm:text-4xl">Travel smarter. Travel safer.</h2>
          <p className="mt-3 text-sm text-white/70">Your journey deserves a safer beginning.</p>
          <Link to="/login" className="mt-5 inline-block">
            <Button variant="secondary" size="lg" className="group bg-surface hover:bg-white">
              Get Started <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-7 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <div><span className="font-display text-sm text-ink">YatraShield</span><span className="ml-2">Tourism Trust &amp; Risk Intelligence</span></div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Footer navigation">
            <a href="#about" className="hover:text-clay-600">About</a>
            <a href="#how-it-works" className="hover:text-clay-600">How It Works</a>
            <Link to="/login" className="hover:text-clay-600">Login</Link>
            <Link to="/login" className="hover:text-clay-600">Register</Link>
          </nav>
          <span>Copyright {new Date().getFullYear()} YatraShield</span>
        </div>
      </footer>
    </div>
  );
}