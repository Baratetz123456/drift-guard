import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
