import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ActivityIcon,
  BrainCircuitIcon,
  BuildingIcon,
  ChartNoAxesCombinedIcon,
  GaugeIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  TicketCheckIcon,
  XIcon } from
'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV = [
{ to: '/admin', label: 'Overview', icon: GaugeIcon, end: true },
{ to: '/admin/reports', label: 'Report queue', icon: TicketCheckIcon },
{ to: '/admin/analytics', label: 'Analytics & insights', icon: ChartNoAxesCombinedIcon },
{ to: '/admin/services', label: 'Service registry', icon: BuildingIcon },
{ to: '/admin/intelligence', label: 'Model intelligence', icon: BrainCircuitIcon },
{ to: '/admin/activity', label: 'Activity log', icon: ActivityIcon }];


export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const nav =
  <nav className="flex flex-col gap-1" aria-label="Authority sections">
      {NAV.map((item) =>
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
      `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ease-out ${
      isActive ?
      'bg-white/12 text-white' :
      'text-white/62 hover:bg-white/[0.07] hover:text-white'}`

      }>
      
          <item.icon className="h-4 w-4" aria-hidden />
          {item.label}
        </NavLink>
    )}
    </nav>;


  return (
    <div className="flex min-h-full w-full bg-canvas">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-indigo-700 px-4 py-6 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="rounded-xl bg-clay-500 p-1.5">
            <ShieldIcon className="h-4 w-4 text-white" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="font-display text-base text-white">YatraShield</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">Authority console</p>
          </div>
        </div>

        <div className="mt-7 flex-1">{nav}</div>

        <div className="rounded-xl bg-white/[0.07] p-3">
          <p className="text-xs font-bold text-white">{user?.full_name}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/55">Tourism authority</p>
          <button
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors duration-150 ease-out hover:bg-white/20">
            
            <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <span className="rounded-xl bg-clay-500 p-1.5">
            <ShieldIcon className="h-4 w-4 text-white" aria-hidden />
          </span>
          <span className="font-display text-base text-ink">Authority console</span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto rounded-xl border border-line p-2 text-ink-soft"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}>
            
            {open ? <XIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
          </button>
        </header>

        {open ?
        <div className="bg-indigo-700 px-4 py-3 lg:hidden">
            {nav}
            <button
            onClick={handleLogout}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white">
            
              <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
              Log out
            </button>
          </div> :
        null}

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>);

}