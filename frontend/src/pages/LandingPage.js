import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { MapPin, Users, IndianRupee, Globe } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const [halls, setHalls] = useState([]);

  useEffect(() => {
    fetchHalls();
  }, []);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const handleHallSelect = (hallId) => {
    navigate(`/services/${hallId}`);
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-md fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <h1 className="playfair text-3xl font-bold maroon-text" data-testid="site-title">
              {t('Om & Shiv Lawns', 'ॐ आणि शिव लॉन्स')}
            </h1>
            <div className="flex gap-4 items-center">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#D4AF37] text-[#800000] hover:bg-[#D4AF37] hover:text-white transition-all"
                data-testid="language-toggle-btn"
              >
                <Globe size={20} />
                {language === 'en' ? 'मराठी' : 'English'}
              </button>
              <button
                onClick={() => navigate('/booking')}
                className="px-6 py-2 rounded-full bg-[#800000] text-white hover:bg-[#600000] transition-all"
                data-testid="check-dates-btn"
              >
                {t('Check Dates', 'तारीख तपासा')}
              </button>
              <button
                onClick={() => navigate('/admin/login')}
                className="px-6 py-2 rounded-full border-2 border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white transition-all"
                data-testid="admin-login-btn"
              >
                {t('Admin Login', 'प्रशासक लॉगिन')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-20">
        <section className="hero-gradient py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="playfair text-5xl md:text-6xl font-bold maroon-text mb-6" data-testid="hero-title">
              {t('Your Perfect Venue Awaits', 'तुमचं परफेक्ट व्हेन्यू येथे आहे')}
            </h2>
            <p className="text-xl text-gray-700 mb-12 max-w-3xl mx-auto">
              {t(
                'Create unforgettable memories at our premium banquet halls. Perfect for weddings, celebrations, and grand events.',
                'आमच्या प्रिमियम बॅन्क्वेट हॉलमध्ये अविस्मरणीय आठवणी तयार करा. विवाह, सण आणि भव्य कार्यक्रमांसाठी योग्य.'
              )}
            </p>
          </div>
        </section>

        <section className="py-16 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="playfair text-4xl font-bold text-center maroon-text mb-12" data-testid="halls-section-title">
              {t('Our Banquet Halls', 'आमचे बॅन्क्वेट हॉल')}
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              {halls.map((hall) => (
                <div
                  key={hall.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 card-hover cursor-pointer"
                  onClick={() => handleHallSelect(hall.id)}
                  data-testid={`hall-card-${hall.id}`}
                >
                  <div className="relative h-80">
                    <img
                      src={hall.image_url}
                      alt={language === 'en' ? hall.name : hall.name_mr}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="playfair text-3xl font-bold text-white mb-2">
                        {language === 'en' ? hall.name : hall.name_mr}
                      </h4>
                      <p className="text-white/90">
                        {language === 'en' ? hall.description : hall.description_mr}
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="text-[#800000]" size={24} />
                        <div>
                          <p className="text-sm text-gray-600">{t('Capacity', 'क्षमता')}</p>
                          <p className="font-bold text-[#800000]">{hall.capacity} {t('guests', 'पाहुणे')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="text-[#800000]" size={24} />
                        <div>
                          <p className="text-sm text-gray-600">{t('Starting from', 'पासून')}</p>
                          <p className="font-bold text-[#800000]">₹{hall.approx_rent.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <a
                      href={hall.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mt-4 text-[#D4AF37] hover:text-[#B8941F] transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MapPin size={20} />
                      <span>{t('View Location', 'स्थान पहा')}</span>
                    </a>
                    <button
                      className="w-full mt-6 py-3 rounded-full bg-[#800000] text-white hover:bg-[#600000] transition-all font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHallSelect(hall.id);
                      }}
                      data-testid={`explore-hall-btn-${hall.id}`}
                    >
                      {t('Explore Services', 'सेवा पहा')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-[#800000] text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-lg">
              {t(
                '© 2025 Om & Shiv Lawns Banquet Halls. All rights reserved.',
                '© २०२५ ॐ आणि शिव लॉन्स बॅन्क्वेट हॉल. सर्व हक्क राखीव.'
              )}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;