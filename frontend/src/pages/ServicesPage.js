import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, IndianRupee, Globe } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServicesPage = () => {
  const { hallId } = useParams();
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const [hall, setHall] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchHall();
    fetchServices();
  }, [hallId]);

  const fetchHall = async () => {
    try {
      const response = await axios.get(`${API}/halls/${hallId}`);
      setHall(response.data);
    } catch (error) {
      console.error('Error fetching hall:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services?hall_id=${hallId}`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  if (!hall) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="bg-white shadow-md fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-[#800000] hover:text-[#600000]" data-testid="back-btn">
                <ArrowLeft size={24} />
              </button>
              <h1 className="playfair text-2xl font-bold maroon-text">
                {language === 'en' ? hall.name : hall.name_mr}
              </h1>
            </div>
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
                onClick={() => navigate(`/packages/${hallId}`)}
                className="px-6 py-2 rounded-full bg-[#800000] text-white hover:bg-[#600000] transition-all"
                data-testid="view-packages-btn"
              >
                {t('View Packages', 'पॅकेजेस पहा')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="playfair text-4xl font-bold maroon-text mb-8" data-testid="services-title">
            {t('Our Services', 'आमच्या सेवा')}
          </h2>

          {services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                {t('No services available yet.', 'सध्या कोणत्याही सेवा उपलब्ध नाहीत.')}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-[#D4AF37]/20"
                  data-testid={`service-card-${service.id}`}
                >
                  {service.image_url && (
                    <img
                      src={service.image_url}
                      alt={language === 'en' ? service.name : service.name_mr}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h3 className="text-xl font-bold maroon-text mb-2">
                    {language === 'en' ? service.name : service.name_mr}
                  </h3>
                  {service.price && (
                    <div className="flex items-center gap-1 text-[#D4AF37] font-bold mb-2">
                      <IndianRupee size={18} />
                      <span>{service.price.toLocaleString()}</span>
                    </div>
                  )}
                  {service.description && (
                    <p className="text-gray-600">
                      {language === 'en' ? service.description : service.description_mr}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;