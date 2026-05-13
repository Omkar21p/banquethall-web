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

            {/* Dashboard */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredPermission="dashboard"><AdminDashboard /></ProtectedRoute>
            } />

            {/* Super Admin Control Panel */}
            <Route path="/admin/super" element={
              <ProtectedRoute allowedRoles={['super_admin']}><SuperAdminDashboard /></ProtectedRoute>
            } />

            {/* Calendar */}
            <Route path="/admin/calendar" element={
              <ProtectedRoute requiredPermission="calendar"><AdminCalendar /></ProtectedRoute>
            } />

            {/* Hall Settings */}
            <Route path="/admin/halls" element={
              <ProtectedRoute requiredPermission="hall_settings"><HallSettings /></ProtectedRoute>
            } />

            {/* Services */}
            <Route path="/admin/services" element={
              <ProtectedRoute requiredPermission="services"><AdminServices /></ProtectedRoute>
            } />

            {/* Packages */}
            <Route path="/admin/packages" element={
              <ProtectedRoute requiredPermission="packages"><AdminPackages /></ProtectedRoute>
            } />

            {/* Bills */}
            <Route path="/admin/bills/new" element={
              <ProtectedRoute requiredPermission="bills"><BillGeneration /></ProtectedRoute>
            } />
            <Route path="/admin/bills/edit/:billId" element={
              <ProtectedRoute requiredPermission="bills"><BillGeneration /></ProtectedRoute>
            } />
            <Route path="/admin/bills" element={
              <ProtectedRoute requiredPermission="records"><OlderBookings /></ProtectedRoute>
            } />

            {/* Event Management */}
            <Route path="/admin/events" element={
              <ProtectedRoute requiredPermission="events"><EventManager /></ProtectedRoute>
            } />

            {/* Admin User Management - legacy route */}
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['super_admin']}><AdminUsers /></ProtectedRoute>
            } />

            {/* Settings */}
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredPermission="settings"><AdminSettings /></ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;