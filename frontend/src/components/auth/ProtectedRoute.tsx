import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout';
import { SessionTimeoutModal } from './SessionTimeoutModal';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAppStore();
  const { isWarningOpen, remainingSeconds, extendSession, signOut } = useInactivityTimeout({
    timeoutMs: 30 * 60 * 1000, // 30 minutes
    warningMs: 60 * 1000,       // 60-second warning dialog
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
