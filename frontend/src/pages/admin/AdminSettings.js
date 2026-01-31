import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminSettings = () => {
  const { getAuthHeaders } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState({
    language: 'en',
    theme: 'light',
    signup_enabled: false
  });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
      setLanguage(response.data.language);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await axios.put(`${API}/settings`, settings, getAuthHeaders());
      setLanguage(settings.language);
      toast.success(t('Settings saved!', 'सेटिंग्ज जतन झाली!'));
    } catch (error) {
      toast.error(t('Error saving settings', 'सेटिंग्ज जतन करताना एरर'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('Passwords do not match', 'पासवर्ड जुळत नाहीत'));
      return;
    }

    try {
      await axios.post(
        `${API}/auth/change-password`,
        { old_password: oldPassword, new_password: newPassword },
        getAuthHeaders()
      );
      toast.success(t('Password changed!', 'पासवर्ड बदलला!'));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('Error changing password', 'पासवर्ड बदलताना एरर'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="playfair text-2xl font-bold maroon-text mb-6">
            {t('General Settings', 'सामान्य सेटिंग्ज')}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('Default Language', 'डीफॉल्ट भाषा')}
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
                data-testid="language-setting"
              >
                <option value="en">English</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('Theme', 'थीम')}
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                className="w-full px-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
                data-testid="theme-setting"
              >
                <option value="light">{t('Light', 'लाइट')}</option>
                <option value="dark">{t('Dark', 'डार्क')}</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="signup-enabled"
                checked={settings.signup_enabled}
                onChange={(e) => setSettings({ ...settings, signup_enabled: e.target.checked })}
                className="w-5 h-5 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                data-testid="signup-toggle"
              />
              <label htmlFor="signup-enabled" className="text-sm font-semibold">
                {t('Enable New Account Creation', 'नविन खाते निर्माण सक्षम करा')}
              </label>
            </div>

            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
              data-testid="save-settings-btn"
            >
              <Save size={20} />
              {t('Save Settings', 'सेटिंग्ज जतन करा')}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="playfair text-2xl font-bold maroon-text mb-6">
            {t('Change Password', 'पासवर्ड बदला')}
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('Old Password', 'जुना पासवर्ड')}
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                required
                data-testid="old-password-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('New Password', 'नवा पासवर्ड')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                required
                data-testid="new-password-input"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('Confirm New Password', 'नवा पासवर्ड पुन्हा टाका')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                required
                data-testid="confirm-password-input"
              />
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
              data-testid="change-password-btn"
            >
              <Save size={20} />
              {t('Change Password', 'पासवर्ड बदला')}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="playfair text-2xl font-bold maroon-text mb-4">
            {t('Admin Credentials', 'प्रशासक क्रेडेंशियल')}
          </h3>
          <div className="space-y-2 text-sm">
            <p><strong>Om Admin:</strong> om_admin / om123</p>
            <p><strong>Shiv Admin:</strong> shiv_admin / shiv123</p>
            <p className="text-gray-600 mt-4">
              {t(
                'Note: These are default credentials. Please change your password after first login for security.',
                'टीप: ही डीफॉल्ट क्रेडेंशियल आहेत. सुरक्षिततेसाठी पहिल्या लॉगिननंतर कृपया आपला पासवर्ड बदला.'
              )}
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;