import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsPage } from './pages/legal/TermsPage';
import { DashboardPage } from './pages/DashboardPage';
import { SetupPage } from './pages/SetupPage';
import { DeviceDetailPage } from './pages/DeviceDetailPage';
import { DeviceGroupDetailPage } from './pages/DeviceGroupDetailPage';
import { CommandSetDetailPage } from './pages/CommandSetDetailPage';
import { SnapshotDetailPage } from './pages/SnapshotDetailPage';
import { ComparisonDetailPage } from './pages/ComparisonDetailPage';
import { AuditLogDetailPage } from './pages/AuditLogDetailPage';
import { OperationsPage } from './pages/OperationsPage';
import { AnalysisPage } from './pages/AnalysisPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication and Legal routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Protected Dashboard & App routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            {/* 4 Primary Operational Phases */}
            <Route index element={<DashboardPage />} />
            <Route path="setup" element={<SetupPage />} />
            <Route path="setup/devices/:deviceId" element={<DeviceDetailPage />} />
            <Route path="setup/groups/:groupId" element={<DeviceGroupDetailPage />} />
            <Route path="setup/commands/:setId" element={<CommandSetDetailPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="operations/snapshots/:snapshotId" element={<SnapshotDetailPage />} />
            <Route path="operations/audit/:auditId" element={<AuditLogDetailPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="analysis/comparisons/:comparisonId" element={<ComparisonDetailPage />} />

            {/* Seamless Backward-Compatible Legacy Redirects */}
            <Route path="devices" element={<Navigate to="/setup?tab=devices" replace />} />
            <Route path="command-sets" element={<Navigate to="/setup?tab=commands" replace />} />
            <Route path="settings" element={<Navigate to="/setup?tab=settings" replace />} />
            <Route path="collect" element={<Navigate to="/operations?tab=capture" replace />} />
            <Route path="snapshots" element={<Navigate to="/operations?tab=snapshots" replace />} />
            <Route path="audit" element={<Navigate to="/operations?tab=audit" replace />} />
            <Route path="compare" element={<Navigate to="/analysis?tab=compare" replace />} />
            <Route path="history" element={<Navigate to="/analysis?tab=history" replace />} />
            <Route path="ai-analysis" element={<Navigate to="/analysis?tab=report" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
