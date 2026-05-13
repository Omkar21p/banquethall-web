import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Plus, Trash2, Save, X, Key, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminUsers = () => {
  const { getAuthHeaders, admin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (admin && admin.role !== 'super_admin') {
      toast.error('Access denied');
      navigate('/admin/dashboard');
    }
  }, [admin, navigate]);
  const [admins, setAdmins] = useState([]);
  const [halls, setHalls] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    hall_id: '',
    role: 'admin',
    permissions: [],
    allowed_services: ["*"]
  });
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [hallServices, setHallServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchHalls();
  }, []);

  useEffect(() => {
    if (formData.hall_id) {
      fetchHallServices(formData.hall_id);
    } else {
      setHallServices([]);
    }
  }, [formData.hall_id]);

  const fetchHallServices = async (hallId) => {
    try {
      setLoadingServices(true);
      const response = await axios.get(`${API}/services?hall_id=${hallId}`);
      setHallServices(response.data);
      setLoadingServices(false);
    } catch (error) {
      console.error('Error fetching hall services:', error);
      setLoadingServices(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API}/admins`, getAuthHeaders());
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedHall = halls.find(h => h.id === formData.hall_id);
      const data = {
        ...formData,
        hall_name: selectedHall?.name || '',
        hall_id: formData.hall_id
      };

      if (editingAdminId) {
        await axios.put(`${API}/admins/${editingAdminId}`, data, getAuthHeaders());
        toast.success(t('Admin updated successfully!', 'प्रशासक यशस्वीपणे अपडेट केला!'));
      } else {
        await axios.post(`${API}/admins`, data, getAuthHeaders());
        toast.success(t('Admin added successfully!', 'प्रशासक यशस्वीपणे जोडला!'));
      }

      setFormData({ username: '', password: '', hall_id: '', role: 'admin', permissions: [], allowed_services: ["*"] });
      setShowAddForm(false);
      setEditingAdminId(null);
      fetchAdmins();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('Error saving admin', 'प्रशासक जतन करताना एरर'));
    }
  };

  const handleResetPassword = async (adminId) => {
    const newPassword = window.prompt(t('Enter new password:', 'नवीन पासवर्ड टाका:'));
    if (!newPassword) return;

    try {
      await axios.put(`${API}/admins/${adminId}/reset-password`, { new_password: newPassword }, getAuthHeaders());
      toast.success(t('Password reset successfully!', 'पासवर्ड यशस्वीपणे रिसेट झाला!'));
    } catch (error) {
      toast.error(t('Error resetting password', 'पासवर्ड रिसेट करताना एरर'));
    }
  };

  const handleEdit = (adm) => {
    setFormData({
      username: adm.username,
      password: '', // Don't show old password
      hall_id: adm.hall_id || '',
      role: adm.role || 'admin',
      permissions: adm.permissions || [],
      allowed_services: adm.allowed_services || ["*"]
    });
    setEditingAdminId(adm.id);
    setShowAddForm(true);
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
            onClick={() => {
              setEditingAdminId(null);
              setFormData({ username: '', password: '', hall_id: '', role: 'admin', permissions: [], allowed_services: ["*"] });
              setShowAddForm(true);
            }}
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
                {editingAdminId ? t('Edit Admin', 'प्रशासक संपादित करा') : t('Add New Admin', 'नवीन प्रशासक जोडा')}
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
                  required={!editingAdminId}
                  placeholder={editingAdminId ? t('Leave blank to keep current', 'चालू ठेवण्यासाठी रिक्त सोडा') : ''}
                  data-testid="admin-password-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Select Hall', 'हॉल निवडा')}</label>
                <select
                  value={formData.hall_id}
                  onChange={(e) => setFormData({ ...formData, hall_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="admin-hall-input"
                >
                  <option value="">{t('Select Hall...', 'हॉल निवडा...')}</option>
                  {halls.map(hall => (
                    <option key={hall.id} value={hall.id}>{hall.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Role', 'भूमिका')}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="admin">Hall Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="booking_staff">Booking Staff (Calendar Only)</option>
                </select>
              </div>

              {formData.hall_id && hallServices.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <label className="block text-sm font-bold maroon-text mb-3">{t('Allowed Services', 'अनुमत सेवा')}</label>
                  <div className="flex items-center gap-4 mb-4 pb-2 border-b">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.allowed_services.includes("*")}
                        onChange={(e) => {
                          if (e.target.checked) setFormData({ ...formData, allowed_services: ["*"] });
                          else setFormData({ ...formData, allowed_services: [] });
                        }}
                      />
                      <span className="text-sm font-semibold">{t('All Services', 'सर्व सेवा')}</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {hallServices.map(service => (
                      <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                        <input 
                          type="checkbox" 
                          disabled={formData.allowed_services.includes("*")}
                          checked={formData.allowed_services.includes("*") || formData.allowed_services.includes(service.id)}
                          onChange={(e) => {
                            let updated = [...formData.allowed_services.filter(id => id !== "*")];
                            if (e.target.checked) updated.push(service.id);
                            else updated = updated.filter(id => id !== service.id);
                            setFormData({ ...formData, allowed_services: updated });
                          }}
                        />
                        <span className="text-xs">{language === 'en' ? service.name : service.name_mr}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
                <th className="px-6 py-3 text-left">{t('Role', 'भूमिका')}</th>
                <th className="px-6 py-3 text-left">{t('Last Login', 'शेवटचे लॉगिन')}</th>
                <th className="px-6 py-3 text-left">{t('Created', 'तयार केले')}</th>
                <th className="px-6 py-3 text-center">{t('Actions', 'कृती')}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b hover:bg-gray-50" data-testid={`admin-row-${admin.id}`}>
                  <td className="px-6 py-4 font-semibold">{admin.username}</td>
                  <td className="px-6 py-4">{admin.hall_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      admin.role === 'booking_staff' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {admin.last_login ? new Date(admin.last_login).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(admin)}
                        className="p-2 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                        title={t('Edit', 'संपादित करा')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleResetPassword(admin.id)}
                        className="p-2 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg transition-colors"
                        title={t('Reset Password', 'पासवर्ड रिसेट')}
                      >
                        <Key size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id, admin.username)}
                        className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                        title={t('Delete', 'काढून टाका')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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