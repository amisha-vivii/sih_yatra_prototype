import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookmarkIcon,
  FileWarningIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MapIcon,
  MenuIcon,
  SearchCheckIcon,
  ShieldIcon,
  UserIcon,
  XIcon } from
'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Backdrop } from './Backdrop';
import { BACKGROUNDS } from '../data/seed';

const NAV = [
{ to: '/app', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
{ to: '/app/check', label: 'Check a service', icon: SearchCheckIcon },
{ to: '/app/map', label: 'Risk map', icon: MapIcon },
{ to: '/app/history', label: 'Recent checks', icon: HistoryIcon },
{ to: '/app/saved', label: 'Saved services', icon: BookmarkIcon },
{ to: '/app/reports', label: 'My reports', icon: FileWarningIcon },
{ to: '/app/profile', label: 'Profile', icon: UserIcon }];


export function TouristLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const denied = (location.state as any)?.denied;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-full w-full">
      <Backdrop image={BACKGROUNDS.arch} intensity="strong" blur={10} />

      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
          <Link to="/app" className="flex items-center gap-2">
            <span className="rounded-xl bg-clay-500 p-1.5">
              <ShieldIcon className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="font-display text-lg leading-none text-ink">YatraShield</span>
          </Link>

          <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label="Traveller sections">
            {NAV.slice(0, 6).map((item) =>
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 ease-out ${
              isActive ? 'bg-clay-50 text-clay-600' : 'text-ink-soft hover:bg-clay-50/60 hover:text-clay-600'}`

              }>
              
                {item.label}
              </NavLink>
            )}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/app/profile"
              className="hidden items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-left sm:flex">
              
              <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                {user?.full_name?.[0] ?? 'T'}
              </span>
              <span className="leading-tight">
                <span className="block text-xs font-bold text-ink">{user?.full_name}</span>
                <span className="block text-[10px] uppercase tracking-wide text-ink-muted">Traveller</span>
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink-soft transition-colors duration-150 ease-out hover:border-alert/40 hover:text-alert">
              
              <LogOutIcon className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-xl border border-line p-2 text-ink-soft lg:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}>
              
              {open ? <XIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {open ?
        <nav className="border-t border-line bg-surface px-4 py-2 lg:hidden" aria-label="Traveller sections">
            {NAV.map((item) =>
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${
            isActive ? 'bg-clay-50 text-clay-600' : 'text-ink-soft'}`

            }>
            
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
          )}
          </nav> :
        null}
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-10">
        {denied ?
        <div className="mb-5 rounded-xl border border-amberw/40 bg-amberw/10 px-4 py-3 text-sm font-medium text-[#7a4f08]">
            That area is restricted to tourism authority accounts, so you were returned to your dashboard.
          </div> :
        null}
        <Outlet />
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-ink-muted lg:px-8">
        YatraShield · Tourism trust &amp; risk intelligence. Scores are advisory signals, not verdicts about any
        operator.
      </footer>
    </div>);

}