import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute - Wraps admin pages with role + permission-based access control.
 * 
 * @param {React.ReactNode} children - The page component to render
 * @param {string[]} allowedRoles - Roles that can access (for backward compat)
 * @param {string} requiredPermission - Permission key needed (e.g., 'bills', 'calendar')
 */
const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { admin } = useAuth();

  // Not logged in → redirect to login
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Super admin always has full access
  if (admin.role === 'super_admin') {
    return children;
  }

  // Check permission-based access
  const perms = admin.permissions || [];
  const hasAllPerms = perms.includes('*');

  if (requiredPermission) {
    if (!hasAllPerms && !perms.includes(requiredPermission)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  // Legacy role check (if allowedRoles is provided)
  if (allowedRoles) {
    const role = admin.role || 'admin';
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
