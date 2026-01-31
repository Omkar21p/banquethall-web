import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Calendar, FileText, Users, IndianRupee, FolderOpen } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { getAuthHeaders } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalBills: 0,
    upcomingEvents: 0,
    revenue: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [bookingsRes, billsRes] = await Promise.all([
        axios.get(`${API}/bookings`, getAuthHeaders()),
        axios.get(`${API}/bills`, getAuthHeaders())
      ]);

      const today = new Date();
      const upcomingEvents = bookingsRes.data.filter(
        b => new Date(b.date) >= today
      ).length;

      const revenue = billsRes.data.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);

      setStats({
        totalBookings: bookingsRes.data.length,
        totalBills: billsRes.data.length,
        upcomingEvents,
        revenue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    {
      icon: Calendar,
      label: t('Total Bookings', 'कुल बुकिंग'),
      value: stats.totalBookings,
      color: 'bg-[#D4AF37]'
    },
    {
      icon: FileText,
      label: t('Total Bills', 'कुल बिल'),
      value: stats.totalBills,
      color: 'bg-[#800000]'
    },
    {
      icon: Users,
      label: t('Upcoming Events', 'आगामी कार्यक्रम'),
      value: stats.upcomingEvents,
      color: 'bg-blue-600'
    },
    {
      icon: IndianRupee,
      label: t('Total Revenue', 'कुल उत्पन्न'),
      value: `₹${stats.revenue.toLocaleString()}`,
      color: 'bg-green-600'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-xl shadow-md border border-[#D4AF37]/20"
                data-testid={`stat-card-${idx}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon size={24} className="text-white" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold maroon-text">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md">
          <h3 className="playfair text-2xl font-bold maroon-text mb-4">
            {t('Quick Actions', 'छोटी क्रिया')}
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <a
              href="/admin/bills/new"
              className="p-4 border-2 border-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-white transition-all text-center"
              data-testid="quick-new-bill-btn"
            >
              <FileText size={32} className="mx-auto mb-2" />
              <p className="font-semibold">{t('Generate New Bill', 'नवीन बिल तयार करा')}</p>
            </a>
            <a
              href="/admin/calendar"
              className="p-4 border-2 border-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-white transition-all text-center"
              data-testid="quick-calendar-btn"
            >
              <Calendar size={32} className="mx-auto mb-2" />
              <p className="font-semibold">{t('Manage Calendar', 'कॅलेंडर व्यवस्थापित करा')}</p>
            </a>
            <a
              href="/admin/bills"
              className="p-4 border-2 border-[#D4AF37] rounded-lg hover:bg-[#D4AF37] hover:text-white transition-all text-center"
              data-testid="quick-older-bookings-btn"
            >
              <FolderOpen size={32} className="mx-auto mb-2" />
              <p className="font-semibold">{t('View Older Bookings', 'जुनी बुकिंग पहा')}</p>
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;