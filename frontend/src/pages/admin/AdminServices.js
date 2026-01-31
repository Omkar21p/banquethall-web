import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminServices = () => {
  const { getAuthHeaders } = useAuth();
  const { language, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    name_mr: '',
    price: '',
    description: '',
    description_mr: '',
    image_url: ''
  });

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    if (selectedHall) {
      fetchServices();
    }
  }, [selectedHall]);

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

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services?hall_id=${selectedHall}`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_mr: '',
      price: '',
      description: '',
      description_mr: '',
      image_url: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        hall_id: selectedHall,
        price: formData.price ? parseInt(formData.price) : null
      };

      if (editingId) {
        await axios.put(`${API}/services/${editingId}`, payload, getAuthHeaders());
        toast.success(t('Service updated!', 'सेवा अपडेट झाली!'));
      } else {
        await axios.post(`${API}/services`, payload, getAuthHeaders());
        toast.success(t('Service added!', 'सेवा जोडली!'));
      }

      resetForm();
      fetchServices();
    } catch (error) {
      toast.error(t('Error saving service', 'सेवा जतन करताना एरर'));
    }
  };

  const handleEdit = (service) => {
    setFormData({
      name: service.name,
      name_mr: service.name_mr,
      price: service.price || '',
      description: service.description || '',
      description_mr: service.description_mr || '',
      image_url: service.image_url || ''
    });
    setEditingId(service.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('Delete this service?', 'ही सेवा डिलीट करायची?'))) return;

    try {
      await axios.delete(`${API}/services/${id}`, getAuthHeaders());
      toast.success(t('Service deleted!', 'सेवा डिलीट झाली!'));
      fetchServices();
    } catch (error) {
      toast.error(t('Error deleting service', 'सेवा डिलीट करताना एरर'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <label className="block text-sm font-semibold maroon-text mb-2">
              {t('Select Hall:', 'हॉल निवडा:')}
            </label>
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="px-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
              data-testid="hall-select"
            >
              {halls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {language === 'en' ? hall.name : hall.name_mr}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
            data-testid="add-service-btn"
          >
            <Plus size={20} />
            {t('Add Service', 'सेवा जोडा')}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#D4AF37]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="playfair text-xl font-bold maroon-text">
                {editingId ? t('Edit Service', 'सेवा संपादित करा') : t('Add New Service', 'नवीन सेवा जोडा')}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Service Name (English)', 'सेवा नाव (इंग्रजी)')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="service-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Service Name (Marathi)', 'सेवा नाव (मराठी)')}</label>
                <input
                  type="text"
                  value={formData.name_mr}
                  onChange={(e) => setFormData({ ...formData, name_mr: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg marathi-text"
                  required
                  data-testid="service-name-mr-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Price (Optional)', 'किंमत (ऐच्छिक)')}</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="service-price-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Image URL (Optional)', 'इमेज URL (ऐच्छिक)')}</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="service-image-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Description (English)', 'वर्णन (इंग्रजी)')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="2"
                  data-testid="service-desc-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Description (Marathi)', 'वर्णन (मराठी)')}</label>
                <textarea
                  value={formData.description_mr}
                  onChange={(e) => setFormData({ ...formData, description_mr: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg marathi-text"
                  rows="2"
                  data-testid="service-desc-mr-input"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]"
                  data-testid="save-service-btn"
                >
                  <Save size={20} />
                  {t('Save', 'जतन करा')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="bg-white p-4 rounded-xl shadow-md" data-testid={`service-${service.id}`}>
              {service.image_url && (
                <img src={service.image_url} alt={service.name} className="w-full h-32 object-cover rounded-lg mb-3" />
              )}
              <h4 className="font-bold maroon-text">{language === 'en' ? service.name : service.name_mr}</h4>
              {service.price && <p className="text-[#D4AF37] font-bold">₹{service.price}</p>}
              {service.description && (
                <p className="text-sm text-gray-600 mt-2">
                  {language === 'en' ? service.description : service.description_mr}
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(service)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#D4AF37] text-[#800000] rounded-lg hover:bg-[#D4AF37] hover:text-white"
                  data-testid={`edit-service-${service.id}`}
                >
                  <Edit2 size={16} />
                  {t('Edit', 'संपादित')}
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  data-testid={`delete-service-${service.id}`}
                >
                  <Trash2 size={16} />
                  {t('Delete', 'डिलीट')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {services.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">{t('No services added yet. Click "Add Service" to get started.', 'अद्याप कोणतीही सेवा जोडली नाही. सुरुवात करण्यासाठी "सेवा जोडा" वर क्लिक करा.')}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminServices;