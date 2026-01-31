import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminUsers = () => {
  const { getAuthHeaders } = useAuth();
  const { t } = useLanguage();
  const [admins, setAdmins] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    hall_name: ''
  });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admins`, getAuthHeaders());
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admins`, formData, getAuthHeaders());
      toast.success(t('Admin added successfully!', 'प्रशासक यशस्वीपणे जोडला!'));
      setFormData({ username: '', password: '', hall_name: '' });
      setShowAddForm(false);
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('Error adding admin', 'प्रशासक जोडताना एरर'));
    }
  };

  const handleDelete = async (id, username) => {
    if (!window.confirm(t(`Delete admin ${username}?`, `प्रशासक ${username} डिलीट करायचा?`))) return;

    try {
      await axios.delete(`${API}/admins/${id}`, getAuthHeaders());
      toast.success(t('Admin deleted!', 'प्रशासक डिलीट झाला!'));
      fetchAdmins();
    } catch (error) {
      toast.error(t('Error deleting admin', 'प्रशासक डिलीट करताना एरर'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="playfair text-2xl font-bold maroon-text">
            {t('Admin User Management', 'प्रशासक व्यवस्थापन')}
          </h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
            data-testid="add-admin-btn"
          >
            <Plus size={20} />
            {t('Add Admin', 'प्रशासक जोडा')}
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#D4AF37]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="playfair text-xl font-bold maroon-text">
                {t('Add New Admin', 'नवीन प्रशासक जोडा')}
              </h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Username', 'वापरकर्ता नाव')}</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="admin-username-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Password', 'पासवर्ड')}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="admin-password-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Hall Name', 'हॉल नाव')}</label>
                <input
                  type="text"
                  value={formData.hall_name}
                  onChange={(e) => setFormData({ ...formData, hall_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="admin-hall-input"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]"
                data-testid="save-admin-btn"
              >
                <Save size={20} />
                {t('Save', 'जतन करा')}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#800000] text-white">
              <tr>
                <th className="px-6 py-3 text-left">{t('Username', 'वापरकर्ता नाव')}</th>
                <th className="px-6 py-3 text-left">{t('Hall Name', 'हॉल नाव')}</th>
                <th className="px-6 py-3 text-left">{t('Created', 'तयार केले')}</th>
                <th className="px-6 py-3 text-center">{t('Actions', 'कृती')}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b hover:bg-gray-50" data-testid={`admin-row-${admin.id}`}>
                  <td className="px-6 py-4 font-semibold">{admin.username}</td>
                  <td className="px-6 py-4">{admin.hall_name}</td>
                  <td className="px-6 py-4">{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(admin.id, admin.username)}
                      className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                      data-testid={`delete-admin-${admin.id}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;