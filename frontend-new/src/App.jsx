import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import HallDashboardPage from './pages/HallDashboardPage';
import ServicesPage from './pages/ServicesPage';
import PackagesPage from './pages/PackagesPage';
import PhotoGalleryPage from './pages/PhotoGalleryPage';
import DateBookingPage from './pages/DateBookingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import HallSettings from './pages/admin/HallSettings';
import AdminServices from './pages/admin/AdminServices';
import AdminPackages from './pages/admin/AdminPackages';
import AdminCalendar from './pages/admin/AdminCalendar';
import BillGeneration from './pages/admin/BillGeneration';
import OlderBookings from './pages/admin/OlderBookings';
import AdminSettings from './pages/admin/AdminSettings';
import AdminUsers from './pages/admin/AdminUsers';
import EventManager from './pages/admin/EventManager';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';

import './App.css';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/hall/:hallId" element={<HallDashboardPage />} />
            <Route path="/services/:hallId" element={<ServicesPage />} />
            <Route path="/packages/:hallId" element={<PackagesPage />} />
            <Route path="/gallery/:hallId" element={<PhotoGalleryPage />} />
            <Route path="/booking" element={<DateBookingPage />} />
            <Route path="/booking/:hallId" element={<DateBookingPage />} />

            {/* Admin login - no protection needed */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Dashboard - all roles */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'booking_staff']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Super Admin Control Panel */}
            <Route path="/admin/super" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* Calendar - all roles (booking_staff primary function) */}
            <Route path="/admin/calendar" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin', 'booking_staff']}>
                <AdminCalendar />
              </ProtectedRoute>
            } />

            {/* Hall Settings - super_admin and admin only */}
            <Route path="/admin/halls" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <HallSettings />
              </ProtectedRoute>
            } />

            {/* Services - super_admin and admin only */}
            <Route path="/admin/services" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <AdminServices />
              </ProtectedRoute>
            } />

            {/* Packages - super_admin and admin only */}
            <Route path="/admin/packages" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <AdminPackages />
              </ProtectedRoute>
            } />

            {/* Bills - super_admin and admin only */}
            <Route path="/admin/bills/new" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <BillGeneration />
              </ProtectedRoute>
            } />
            <Route path="/admin/bills/edit/:billId" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <BillGeneration />
              </ProtectedRoute>
            } />
            <Route path="/admin/bills" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <OlderBookings />
              </ProtectedRoute>
            } />

            {/* Event Management - super_admin and admin only */}
            <Route path="/admin/events" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <EventManager />
              </ProtectedRoute>
            } />

            {/* Admin User Management - super_admin ONLY */}
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminUsers />
              </ProtectedRoute>
            } />

            {/* Settings - super_admin and admin only */}
            <Route path="/admin/settings" element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <AdminSettings />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;