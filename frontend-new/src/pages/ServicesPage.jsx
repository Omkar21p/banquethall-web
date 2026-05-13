import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, IndianRupee, Globe } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
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
      <PageHeader
        title={language === 'en' ? hall.name : hall.name_mr}
        onBack={() => navigate(`/hall/${hallId}`)}
      />

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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