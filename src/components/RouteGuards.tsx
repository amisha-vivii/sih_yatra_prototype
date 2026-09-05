import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './ui';
import type { Role } from '../types';

/** Requires a valid session. Unauthenticated visitors go to sign-in. */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Restoring your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/**
 * Requires a specific role. A traveller hitting /admin is sent to their own
 * dashboard; the service layer independently returns 403 for those APIs, so
 * this guard is convenience, not the security boundary.
 */
export function RoleProtectedRoute({ role }: {role: Role;}) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Checking permissions" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/app'} replace state={{ denied: true }} />;
  }
  return <Outlet />;
}