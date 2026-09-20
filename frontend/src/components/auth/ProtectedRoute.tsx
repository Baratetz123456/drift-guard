import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout';
import { SessionTimeoutModal } from './SessionTimeoutModal';
import { isJwtValid } from '../../utils/jwt';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user, logout } = useAppStore();
  const location = useLocation();

  const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;
  const isTokenValid = Boolean(token && isJwtValid(token));

  const { isWarningOpen, remainingSeconds, extendSession, signOut } = useInactivityTimeout({
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    warningMs: 60 * 1000,       // 60-second warning dialog
  });

  if (!isAuthenticated || !user || !isTokenValid) {
    if (isAuthenticated || token) {
      logout();
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      <Outlet />
      <SessionTimeoutModal
        isOpen={isWarningOpen}
        remainingSeconds={remainingSeconds}
        onExtend={extendSession}
        onSignOut={signOut}
      />
    </>
  );
};
