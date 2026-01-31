import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LogIn, Globe } from 'lucide-react';
import { toast } from 'sonner';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      toast.success(t('Login successful!', 'लॉगिन यशस्वी!'));
      navigate('/admin/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#800000] to-[#600000] flex items-center justify-center p-4">
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#800000] hover:bg-gray-100 transition-all"
        data-testid="language-toggle-btn"
      >
        <Globe size={20} />
        {language === 'en' ? 'मराठी' : 'English'}
      </button>

      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#D4AF37] rounded-full mb-4">
            <LogIn size={32} className="text-white" />
          </div>
          <h1 className="playfair text-3xl font-bold maroon-text" data-testid="admin-login-title">
            {t('Admin Login', 'प्रशासक लॉगिन')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('Om & Shiv Lawns Management', 'ॐ आणि शिव लॉन्स व्यवस्थापन')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold maroon-text mb-2">
              {t('Username', 'वापरकर्ता नाव')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#800000] focus:outline-none transition-colors"
              placeholder={t('Enter username', 'वापरकर्ता नाव टाका')}
              required
              data-testid="username-input"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold maroon-text mb-2">
              {t('Password', 'पासवर्ड')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#800000] focus:outline-none transition-colors"
              placeholder={t('Enter password', 'पासवर्ड टाका')}
              required
              data-testid="password-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#800000] text-white rounded-full font-semibold hover:bg-[#600000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="login-btn"
          >
            {loading ? t('Logging in...', 'लॉगिन होत आहे...') : t('Login', 'लॉगिन')}
          </button>
        </form>

        <div className="mt-6 p-4 bg-[#FDFBF7] rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>{t('Default Credentials:', 'डीफॉल्ट क्रेडेंशियल:')}</strong>
          </p>
          <p className="text-sm text-gray-600 mt-1">Om Admin: om_admin / om123</p>
          <p className="text-sm text-gray-600">Shiv Admin: shiv_admin / shiv123</p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full mt-4 text-[#800000] hover:text-[#600000] font-semibold"
          data-testid="back-to-home-btn"
        >
          {t('← Back to Home', '← मुखपृष्ठावर जा')}
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;