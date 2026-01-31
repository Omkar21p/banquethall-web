import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Save, Upload } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HallSettings = () => {
  const { getAuthHeaders } = useAuth();
  const { language, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [hallData, setHallData] = useState({
    name: '',
    name_mr: '',
    capacity: '',
    approx_rent: '',
    location: '',
    image_url: '',
    logo: '',
    description: '',
    description_mr: ''
  });

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    if (selectedHall) {
      const hall = halls.find(h => h.id === selectedHall);
      if (hall) {
        setHallData({
          name: hall.name,
          name_mr: hall.name_mr,
          capacity: hall.capacity.toString(),
          approx_rent: hall.approx_rent.toString(),
          location: hall.location,
          image_url: hall.image_url,
          logo: hall.logo || '',
          description: hall.description || '',
          description_mr: hall.description_mr || ''
        });
      }
    }
  }, [selectedHall, halls]);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
      if (response.data.length > 0) {
        setSelectedHall(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders().headers
        }
      });
      setHallData({ ...hallData, logo: response.data.image_data });
      toast.success(t('Logo uploaded!', 'लोगो अपलोड झाला!'));
    } catch (error) {
      toast.error(t('Error uploading logo', 'लोगो अपलोड करताना एरर'));
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...hallData,
        capacity: parseInt(hallData.capacity),
        approx_rent: parseInt(hallData.approx_rent)
      };
      await axios.put(`${API}/halls/${selectedHall}`, payload, getAuthHeaders());
      toast.success(t('Hall settings saved!', 'हॉल सेटिंग्ज जतन झाल्या!'));
      fetchHalls();
    } catch (error) {
      toast.error(t('Error saving settings', 'सेटिंग्ज जतन करताना एरर'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="playfair text-2xl font-bold maroon-text">
          {t('Hall Settings & Logos', 'हॉल सेटिंग्ज आणि लोगो')}
        </h2>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">
              {t('Select Hall:', 'हॉल निवडा:')}
            </label>
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
              data-testid="hall-select"
            >
              {halls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {language === 'en' ? hall.name : hall.name_mr}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">
                {t('Hall Logo', 'हॉल लोगो')}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                  data-testid="logo-upload-input"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center gap-2 px-6 py-3 bg-[#D4AF37] text-white rounded-full hover:bg-[#B8941F] cursor-pointer transition-all"
                >
                  <Upload size={20} />
                  {t('Upload Logo', 'लोगो अपलोड करा')}
                </label>
                {hallData.logo && (
                  <div className="p-2 bg-white border-2 border-[#D4AF37] rounded-lg">
                    <img src={hallData.logo} alt="Logo" className="h-16 object-contain" />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {t('Logo will appear on bills and invoices', 'लोगो बिल आणि इनव्हॉइसवर दिसेल')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Hall Name (English)', 'हॉल नाव (इंग्रजी)')}</label>
                <input
                  type="text"
                  value={hallData.name}
                  onChange={(e) => setHallData({ ...hallData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="hall-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Hall Name (Marathi)', 'हॉल नाव (मराठी)')}</label>
                <input
                  type="text"
                  value={hallData.name_mr}
                  onChange={(e) => setHallData({ ...hallData, name_mr: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg marathi-text"
                  data-testid="hall-name-mr-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Capacity', 'क्षमता')}</label>
                <input
                  type="number"
                  value={hallData.capacity}
                  onChange={(e) => setHallData({ ...hallData, capacity: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="hall-capacity-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Approx. Rent', 'अंदाजे भाडे')}</label>
                <input
                  type="number"
                  value={hallData.approx_rent}
                  onChange={(e) => setHallData({ ...hallData, approx_rent: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="hall-rent-input"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">{t('Location (Google Maps URL)', 'स्थान (Google Maps URL)')}</label>
                <input
                  type="text"
                  value={hallData.location}
                  onChange={(e) => setHallData({ ...hallData, location: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="hall-location-input"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
              data-testid="save-hall-btn"
            >
              <Save size={20} />
              {t('Save Changes', 'बदल जतन करा')}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default HallSettings;