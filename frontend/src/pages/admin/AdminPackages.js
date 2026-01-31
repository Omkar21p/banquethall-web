import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPackages = () => {
  const { getAuthHeaders } = useAuth();
  const { language, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [packages, setPackages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    package_type: 'thali',
    name: '',
    name_mr: '',
    rent: '',
    custom_charges: [],
    description: '',
    description_mr: '',
    catalogue_url: '',
    catalogue_image: '',
    items: [],
    custom_fields: {
      rent_label: 'Rent',
      rent_label_mr: 'भाडे',
      light_label: 'Light Charges',
      light_label_mr: 'लाईट चार्जेस'
    }
  });

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    if (selectedHall) {
      fetchPackages();
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

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/packages?hall_id=${selectedHall}`);
      setPackages(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      package_type: 'thali',
      name: '',
      name_mr: '',
      rent: '',
      custom_charges: [],
      description: '',
      description_mr: '',
      catalogue_url: '',
      catalogue_image: '',
      items: [],
      custom_fields: {
        rent_label: 'Rent',
        rent_label_mr: 'भाडे',
        light_label: 'Light Charges',
        light_label_mr: 'लाईट चार्जेस'
      }
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
        rent: formData.rent ? parseInt(formData.rent) : null
      };

      if (editingId) {
        await axios.put(`${API}/packages/${editingId}`, payload, getAuthHeaders());
        toast.success(t('Package updated!', 'पॅकेज अपडेट झाले!'));
      } else {
        await axios.post(`${API}/packages`, payload, getAuthHeaders());
        toast.success(t('Package added!', 'पॅकेज जोडले!'));
      }

      resetForm();
      fetchPackages();
    } catch (error) {
      toast.error(t('Error saving package', 'पॅकेज जतन करताना एरर'));
    }
  };

  const handleEdit = (pkg) => {
    setFormData({
      package_type: pkg.package_type,
      name: pkg.name,
      name_mr: pkg.name_mr,
      rent: pkg.rent || '',
      custom_charges: pkg.custom_charges || [],
      description: pkg.description || '',
      description_mr: pkg.description_mr || '',
      catalogue_url: pkg.catalogue_url || '',
      catalogue_image: pkg.catalogue_image || '',
      items: pkg.items || [],
      custom_fields: pkg.custom_fields || {
        rent_label: 'Rent',
        rent_label_mr: 'भाडे',
        light_label: 'Light Charges',
        light_label_mr: 'लाईट चार्जेस'
      }
    });
    setEditingId(pkg.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('Delete this package?', 'हे पॅकेज डिलीट करायचे?'))) return;

    try {
      await axios.delete(`${API}/packages/${id}`, getAuthHeaders());
      toast.success(t('Package deleted!', 'पॅकेज डिलीट झाले!'));
      fetchPackages();
    } catch (error) {
      toast.error(t('Error deleting package', 'पॅकेज डिलीट करताना एरर'));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await axios.post(`${API}/upload-image`, formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...getAuthHeaders().headers
        }
      });
      setFormData({ ...formData, catalogue_image: response.data.image_data, catalogue_url: '' });
      toast.success(t('Image uploaded!', 'इमेज अपलोड झाली!'));
    } catch (error) {
      toast.error(t('Error uploading image', 'इमेज अपलोड करताना एरर'));
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
            data-testid="add-package-btn"
          >
            <Plus size={20} />
            {t('Add Package', 'पॅकेज जोडा')}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#D4AF37]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="playfair text-xl font-bold maroon-text">
                {editingId ? t('Edit Package', 'पॅकेज संपादित करा') : t('Add New Package', 'नवीन पॅकेज जोडा')}
              </h3>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Package Type', 'पॅकेज प्रकार')}</label>
                <select
                  value={formData.package_type}
                  onChange={(e) => setFormData({ ...formData, package_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="package-type-select"
                >
                  <option value="thali">{t('Thali System', 'थाळी सिस्टम')}</option>
                  <option value="normal">{t('Normal Rent', 'नॉर्मल भाडे')}</option>
                </select>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('Package Name (English)', 'पॅकेज नाव (इंग्रजी)')}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                    data-testid="package-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('Package Name (Marathi)', 'पॅकेज नाव (मराठी)')}</label>
                  <input
                    type="text"
                    value={formData.name_mr}
                    onChange={(e) => setFormData({ ...formData, name_mr: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg marathi-text"
                    required
                    data-testid="package-name-mr-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">{t('Rent', 'भाडे')}</label>
                  <input
                    type="number"
                    value={formData.rent}
                    onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                    data-testid="package-rent-input"
                  />
                </div>
              </div>
              
              <div className="space-y-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold maroon-text">{t('Custom Charges', 'कस्टम चार्जेस')}</h4>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      custom_charges: [...formData.custom_charges, { label: '', label_mr: '', amount: 0 }]
                    })}
                    className="px-3 py-1 bg-[#D4AF37] text-white rounded-lg text-sm hover:bg-[#B8941F]"
                  >
                    + {t('Add Charge', 'चार्ज जोडा')}
                  </button>
                </div>
                {formData.custom_charges.map((charge, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <input
                      type="text"
                      placeholder={t('Label (English)', 'लेबल (इंग्रजी)')}
                      value={charge.label}
                      onChange={(e) => {
                        const updated = [...formData.custom_charges];
                        updated[idx] = { ...updated[idx], label: e.target.value };
                        setFormData({ ...formData, custom_charges: updated });
                      }}
                      className="px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder={t('Label (Marathi)', 'लेबल (मराठी)')}
                      value={charge.label_mr}
                      onChange={(e) => {
                        const updated = [...formData.custom_charges];
                        updated[idx] = { ...updated[idx], label_mr: e.target.value };
                        setFormData({ ...formData, custom_charges: updated });
                      }}
                      className="px-3 py-2 border rounded-lg marathi-text"
                    />
                    <input
                      type="number"
                      placeholder={t('Amount', 'रक्कम')}
                      value={charge.amount}
                      onChange={(e) => {
                        const updated = [...formData.custom_charges];
                        updated[idx] = { ...updated[idx], amount: parseInt(e.target.value) || 0 };
                        setFormData({ ...formData, custom_charges: updated });
                      }}
                      className="px-3 py-2 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.custom_charges.filter((_, i) => i !== idx);
                        setFormData({ ...formData, custom_charges: updated });
                      }}
                      className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      {t('Remove', 'काढा')}
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">{t('Catalogue Image', 'कॅटलॉग इमेज')}</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-4 py-2 border rounded-lg"
                    data-testid="package-image-upload"
                  />
                  {formData.catalogue_image && (
                    <div className="mt-2">
                      <img src={formData.catalogue_image} alt="Catalogue" className="h-32 object-cover rounded-lg" />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{t('Or provide URL:', 'किंवा URL द्या:')}</p>
                  <input
                    type="text"
                    value={formData.catalogue_url}
                    onChange={(e) => setFormData({ ...formData, catalogue_url: e.target.value, catalogue_image: '' })}
                    className="w-full px-4 py-2 border rounded-lg mt-1"
                    placeholder="https://..."
                    data-testid="package-catalogue-input"
                  />
                </div>
              </div>
              
              {formData.package_type === 'thali' && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-bold maroon-text">{t('Custom Field Names (Optional)', 'कस्टम फील्ड नावे (ऐच्छिक)')}</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">{t('Rent Label (English)', 'भाडे लेबल (इंग्रजी)')}</label>
                      <input
                        type="text"
                        value={formData.custom_fields.rent_label}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          custom_fields: { ...formData.custom_fields, rent_label: e.target.value }
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Rent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">{t('Rent Label (Marathi)', 'भाडे लेबल (मराठी)')}</label>
                      <input
                        type="text"
                        value={formData.custom_fields.rent_label_mr}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          custom_fields: { ...formData.custom_fields, rent_label_mr: e.target.value }
                        })}
                        className="w-full px-4 py-2 border rounded-lg marathi-text"
                        placeholder="भाडे"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">{t('Light Charges Label (English)', 'लाईट चार्जेस लेबल (इंग्रजी)')}</label>
                      <input
                        type="text"
                        value={formData.custom_fields.light_label}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          custom_fields: { ...formData.custom_fields, light_label: e.target.value }
                        })}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="Light Charges"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">{t('Light Charges Label (Marathi)', 'लाईट चार्जेस लेबल (मराठी)')}</label>
                      <input
                        type="text"
                        value={formData.custom_fields.light_label_mr}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          custom_fields: { ...formData.custom_fields, light_label_mr: e.target.value }
                        })}
                        className="w-full px-4 py-2 border rounded-lg marathi-text"
                        placeholder="लाईट चार्जेस"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]"
                data-testid="save-package-btn"
              >
                <Save size={20} />
                {t('Save', 'जतन करा')}
              </button>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white p-6 rounded-xl shadow-md border-2 border-[#D4AF37]/30" data-testid={`package-${pkg.id}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="playfair text-xl font-bold maroon-text">
                  {language === 'en' ? pkg.name : pkg.name_mr}
                </h4>
                <span className="px-3 py-1 bg-[#D4AF37] text-white rounded-full text-sm">
                  {pkg.package_type === 'thali' ? t('Thali', 'थाळी') : t('Rent', 'भाडे')}
                </span>
              </div>
              {pkg.rent && <p className="text-gray-700">{t('Rent:', 'भाडे:')} ₹{pkg.rent.toLocaleString()}</p>}
              {pkg.custom_charges && pkg.custom_charges.length > 0 && (
                <div className="mt-2 space-y-1">
                  {pkg.custom_charges.map((charge, idx) => (
                    <p key={idx} className="text-gray-700">
                      {language === 'en' ? charge.label : charge.label_mr}: ₹{charge.amount.toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
              {pkg.catalogue_url && (
                <a href={pkg.catalogue_url} target="_blank" rel="noopener noreferrer" className="text-[#D4AF37] text-sm">
                  {t('View Catalogue', 'कॅटलॉग पहा')}
                </a>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#D4AF37] text-[#800000] rounded-lg hover:bg-[#D4AF37] hover:text-white"
                  data-testid={`edit-package-${pkg.id}`}
                >
                  <Edit2 size={16} />
                  {t('Edit', 'संपादित')}
                </button>
                <button
                  onClick={() => handleDelete(pkg.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  data-testid={`delete-package-${pkg.id}`}
                >
                  <Trash2 size={16} />
                  {t('Delete', 'डिलीट')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {packages.length === 0 && !showAddForm && (
          <div className="text-center py-12 bg-white rounded-xl">
            <p className="text-gray-500">{t('No packages added yet.', 'अद्याप कोणतेही पॅकेजेस जोडले नाहीत.')}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPackages;