import React from 'react';
import { AlertTriangleIcon, InboxIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react';
import type { RiskLevel } from '../types';

export function Card({
  children,
  className = '',
  as: Tag = 'section'




}: {children: React.ReactNode;className?: string;as?: any;}) {
  return (
    <Tag
      className={`rounded-2xl border border-line bg-surface/95 shadow-card backdrop-blur-sm ${className}`}>
      
      {children}
    </Tag>);

}

export function SectionHeading({
  title,
  hint,
  action




}: {title: string;hint?: string;action?: React.ReactNode;}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
      </div>
      {action}
    </div>);

}

const BTN_BASE =
'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-[1px]';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  ...rest




}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: 'primary' | 'secondary' | 'ghost' | 'danger';size?: 'sm' | 'md' | 'lg';loading?: boolean;}) {
  const variants: Record<string, string> = {
    primary: 'bg-clay-500 text-white hover:bg-clay-600 shadow-card',
    secondary: 'bg-surface text-ink border border-line hover:border-clay-300 hover:text-clay-600',
    ghost: 'text-ink-soft hover:bg-clay-50 hover:text-clay-600',
    danger: 'bg-alert text-white hover:bg-[#8f2c21]'
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-base'
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`${BTN_BASE} ${variants[variant]} ${sizes[size]} ${className}`}>
      
      {loading ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>);

}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children






}: {label: string;htmlFor: string;error?: string;hint?: string;children: React.ReactNode;}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      {children}
      {error ?
      <p className="mt-1.5 text-xs font-medium text-alert" role="alert">
          {error}
        </p> :
      hint ?
      <p className="mt-1.5 text-xs text-ink-muted">{hint}</p> :
      null}
    </div>);

}

export const inputClass =
'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 transition-colors duration-150 ease-out focus:border-clay-400 focus:outline-none';

export function RiskBadge({ level, className = '' }: {level: RiskLevel;className?: string;}) {
  const map: Record<RiskLevel, string> = {
    'LOW RISK': 'bg-leaf/12 text-leaf border-leaf/30',
    'MEDIUM RISK': 'bg-amberw/12 text-[#8a5c0d] border-amberw/35',
    'HIGH RISK': 'bg-alert/10 text-alert border-alert/30'
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${map[level]} ${className}`}>
      
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {level}
    </span>);

}

export function riskColor(level: RiskLevel): string {
  return level === 'HIGH RISK' ? '#b2382b' : level === 'MEDIUM RISK' ? '#c98a1b' : '#3f7d55';
}

export function ScoreDial({
  value,
  label,
  caption,
  tone,
  size = 132






}: {value: number;label: string;caption?: string;tone: string;size?: number;}) {
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label} ${value} out of 100`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eee5d8" strokeWidth="10" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 280ms cubic-bezier(0.23, 1, 0.32, 1)' }} />
          
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl leading-none text-ink">{value}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">/ 100</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
      {caption ? <p className="text-sm font-semibold" style={{ color: tone }}>{caption}</p> : null}
    </div>);

}

export function Spinner({ label = 'Loading' }: {label?: string;}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-ink-muted">
      <Loader2Icon className="h-6 w-6 animate-spin text-clay-500" aria-hidden />
      <p className="text-sm">{label}…</p>
    </div>);

}

export function ErrorState({ message, onRetry }: {message: string;onRetry?: () => void;}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-alert/25 bg-alert/[0.04] px-6 py-10 text-center">
      <AlertTriangleIcon className="h-6 w-6 text-alert" aria-hidden />
      <p className="max-w-md text-sm font-medium text-ink-soft">{message}</p>
      {onRetry ?
      <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button> :
      null}
    </div>);

}

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = InboxIcon





}: {title: string;body: string;action?: React.ReactNode;icon?: React.ElementType;}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface/70 px-6 py-12 text-center">
      <span className="rounded-full bg-clay-50 p-3">
        <Icon className="h-5 w-5 text-clay-500" aria-hidden />
      </span>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-muted">{body}</p>
      {action}
    </div>);

}

export function DataNote({ children }: {children: React.ReactNode;}) {
  return (
    <p className="inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-muted">
      <ShieldCheckIcon className="mt-px h-3.5 w-3.5 shrink-0 text-clay-400" aria-hidden />
      <span>{children}</span>
    </p>);

}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = '#b4531f',
  emphasis = false







}: {label: string;value: React.ReactNode;sub?: string;icon: React.ElementType;tone?: string;emphasis?: boolean;}) {
  return (
    <Card className={`flex h-full flex-col p-5 ${emphasis ? 'ring-1 ring-clay-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
        <span className="rounded-lg p-1.5" style={{ backgroundColor: `${tone}14` }}>
          <Icon className="h-4 w-4" style={{ color: tone }} aria-hidden />
        </span>
      </div>
      <p className={`mt-3 font-display ${emphasis ? 'text-4xl' : 'text-3xl'} leading-none text-ink`}>{value}</p>
      <p className="mt-auto pt-2 text-xs text-ink-muted">{sub ?? ''}</p>
    </Card>);

}

export const inr = (value: number | null | undefined) =>
value === null || value === undefined ? '—' : `₹${value.toLocaleString('en-IN')}`;