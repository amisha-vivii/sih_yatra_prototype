import React from 'react';
import { Link } from 'react-router-dom';
import { Backdrop } from '../components/Backdrop';
import { BACKGROUNDS } from '../data/seed';
import { Button, Card } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';

export function NotFound() {
  const { user } = useAuth();
  const home = user ? user.role === 'admin' ? '/admin' : '/app' : '/';
  return (
    <div className="relative flex min-h-full w-full items-center justify-center px-4 py-16">
      <Backdrop image={BACKGROUNDS.heritage} intensity="strong" blur={12} />
      <Card className="max-w-md p-8 text-center">
        <p className="font-display text-5xl text-clay-500">404</p>
        <h1 className="mt-3 font-display text-2xl text-ink">This page isn’t part of YatraShield</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The link may be outdated, or the area may require a different account type.
        </p>
        <Link to={home} className="mt-6 inline-block">
          <Button>Go back</Button>
        </Link>
      </Card>
    </div>);

}