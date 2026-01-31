import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, IndianRupee, Globe } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PackagesPage = () => {
  const { hallId } = useParams();
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const [hall, setHall] = useState(null);
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    fetchHall();
    fetchPackages();
  }, [hallId]);

  const fetchHall = async () => {
    try {
      const response = await axios.get(`${API}/halls/${hallId}`);
      setHall(response.data);
    } catch (error) {
      console.error('Error fetching hall:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages?hall_id=${hallId}`);
      setPackages(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  if (!hall) return null;

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="bg-white shadow-md fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(`/services/${hallId}`)} className="text-[#800000] hover:text-[#600000]" data-testid="back-btn">
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
                onClick={() => navigate('/booking')}
                className="px-6 py-2 rounded-full bg-[#800000] text-white hover:bg-[#600000] transition-all"
                data-testid="check-dates-btn"
              >
                {t('Check Dates', 'तारीख तपासा')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="playfair text-4xl font-bold maroon-text mb-8" data-testid="packages-title">
            {t('Our Packages', 'आमचे पॅकेजेस')}
          </h2>

          {packages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                {t('No packages available yet.', 'सध्या कोणतेही पॅकेजेस उपलब्ध नाहीत.')}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-white p-8 rounded-2xl shadow-lg border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all"
                  data-testid={`package-card-${pkg.id}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="playfair text-2xl font-bold maroon-text">
                      {language === 'en' ? pkg.name : pkg.name_mr}
                    </h3>
                    <span className="px-3 py-1 bg-[#D4AF37] text-white rounded-full text-sm">
                      {pkg.package_type === 'thali' ? t('Thali System', 'थाळी सिस्टम') : t('Normal Rent', 'नॉर्मल भाडे')}
                    </span>
                  </div>

                  {pkg.description && (
                    <p className="text-gray-600 mb-4">
                      {language === 'en' ? pkg.description : pkg.description_mr}
                    </p>
                  )}

                  {pkg.rent && (
                    <div className="flex items-center gap-2 mb-2">
                      <IndianRupee className="text-[#800000]" size={20} />
                      <span className="font-bold">{t('Rent:', 'भाडे:')} ₹{pkg.rent.toLocaleString()}</span>
                    </div>
                  )}

                  {pkg.custom_charges && pkg.custom_charges.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {pkg.custom_charges.map((charge, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <IndianRupee className="text-[#800000]" size={20} />
                          <span className="font-bold">
                            {language === 'en' ? charge.label : charge.label_mr}: ₹{charge.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {pkg.items && pkg.items.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-bold maroon-text mb-2">{t('Included Items:', 'समाविष्ट आयटम:')}</h4>
                      <ul className="space-y-1">
                        {pkg.items.map((item, idx) => (
                          <li key={idx} className="text-gray-700">
                            • {language === 'en' ? item.name : item.name_mr} {item.price && `- ₹${item.price}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pkg.catalogue_url && (
                    <a
                      href={pkg.catalogue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-4 text-[#D4AF37] hover:text-[#B8941F] font-semibold"
                    >
                      {t('View Catalogue', 'कॅटलॉग पहा')} →
                    </a>
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

export default PackagesPage;