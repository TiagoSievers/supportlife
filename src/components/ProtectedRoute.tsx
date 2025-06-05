import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute; 