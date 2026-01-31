import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

import LandingPage from './pages/LandingPage';
import ServicesPage from './pages/ServicesPage';
import PackagesPage from './pages/PackagesPage';
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

import './App.css';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/services/:hallId" element={<ServicesPage />} />
            <Route path="/packages/:hallId" element={<PackagesPage />} />
            <Route path="/booking" element={<DateBookingPage />} />
            
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/halls" element={<HallSettings />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/packages" element={<AdminPackages />} />
            <Route path="/admin/calendar" element={<AdminCalendar />} />
            <Route path="/admin/bills/new" element={<BillGeneration />} />
            <Route path="/admin/bills" element={<OlderBookings />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;