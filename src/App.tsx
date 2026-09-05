import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, RoleProtectedRoute } from './components/RouteGuards';
import { TouristLayout } from './components/TouristLayout';
import { AdminLayout } from './components/AdminLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { TouristDashboard } from './pages/tourist/Dashboard';
import { CheckService } from './pages/tourist/CheckService';
import { Result } from './pages/tourist/Result';
import { MapExplorer } from './pages/tourist/MapExplorer';
import { History } from './pages/tourist/History';
import { Saved } from './pages/tourist/Saved';
import { ReportIssue } from './pages/tourist/ReportIssue';
import { MyReports } from './pages/tourist/MyReports';
import { Profile } from './pages/tourist/Profile';
import { AdminOverview } from './pages/admin/Overview';
import { AdminReports } from './pages/admin/Reports';
import { AdminAnalytics } from './pages/admin/Analytics';
import { AdminServices } from './pages/admin/Services';
import { AdminIntelligence } from './pages/admin/Intelligence';
import { AdminActivity } from './pages/admin/Activity';
import { bootPipeline } from './ml/pipeline';

export function App() {
  useEffect(() => {
    // fit the IDF corpus and train the Isolation Forest once, at start-up
    bootPipeline();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<RoleProtectedRoute role="tourist" />}>
              <Route path="/app" element={<TouristLayout />}>
                <Route index element={<TouristDashboard />} />
                <Route path="check" element={<CheckService />} />
                <Route path="result/:id" element={<Result />} />
                <Route path="map" element={<MapExplorer />} />
                <Route path="history" element={<History />} />
                <Route path="saved" element={<Saved />} />
                <Route path="report" element={<ReportIssue />} />
                <Route path="reports" element={<MyReports />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>

            <Route element={<RoleProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="intelligence" element={<AdminIntelligence />} />
                <Route path="activity" element={<AdminActivity />} />
              </Route>
            </Route>
          </Route>

          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>);

}