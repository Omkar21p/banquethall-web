import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute - Wraps admin pages with role-based access control.
 * 
 * @param {React.ReactNode} children - The page component to render
 * @param {string[]} allowedRoles - Roles that can access this page (e.g., ['super_admin', 'admin'])
 */
const ProtectedRoute = ({ children, allowedRoles = ['super_admin', 'admin', 'booking_staff'] }) => {
  const { admin } = useAuth();

  // Not logged in → redirect to login
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Logged in but wrong role → redirect to dashboard
  const role = admin.role || 'admin';
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
