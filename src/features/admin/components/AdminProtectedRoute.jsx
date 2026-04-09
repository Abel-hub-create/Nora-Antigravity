import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export default function AdminProtectedRoute({ children }) {
  const { adminUser, isAdminLoading } = useAdminAuth();
  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!adminUser) return <Navigate to="/admin/login" replace />;
  return children;
}
