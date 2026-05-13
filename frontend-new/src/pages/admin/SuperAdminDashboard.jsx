import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Plus, Trash2, Save, X, Key, Edit2, Download, AlertTriangle, Users, Building2, Database, Shield } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const { getAuthHeaders, admin } = useAuth();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('users');
  const [admins, setAdmins] = useState([]);
  const [halls, setHalls] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddHall, setShowAddHall] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [hallServices, setHallServices] = useState([]);
  const [formData, setFormData] = useState({ username: '', password: '', hall_id: '', role: 'admin', permissions: [], allowed_services: ["*"] });
  const [hallForm, setHallForm] = useState({ name: '', name_mr: '', capacity: 500, approx_rent: 50000, location: '', image_url: '', description: '', description_mr: '' });
  const [dateRange, setDateRange] = useState({ from_date: '', to_date: '' });
  const [purgeRange, setPurgeRange] = useState({ from_date: '', to_date: '' });

  useEffect(() => { fetchAdmins(); fetchHalls(); }, []);
  useEffect(() => { if (formData.hall_id) fetchHallServices(formData.hall_id); else setHallServices([]); }, [formData.hall_id]);

  const fetchAdmins = async () => { try { const r = await axios.get(`${API}/admins`, getAuthHeaders()); setAdmins(r.data); } catch(e) { console.error(e); }};
  const fetchHalls = async () => { try { const r = await axios.get(`${API}/halls`); setHalls(r.data); } catch(e) { console.error(e); }};
  const fetchHallServices = async (id) => { try { const r = await axios.get(`${API}/services?hall_id=${id}`); setHallServices(r.data); } catch(e) { console.error(e); }};

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const hall = halls.find(h => h.id === formData.hall_id);
      const data = { ...formData, hall_name: hall?.name || '' };
      if (editingAdminId) { await axios.put(`${API}/admins/${editingAdminId}`, data, getAuthHeaders()); toast.success('Admin updated!'); }
      else { await axios.post(`${API}/admins`, data, getAuthHeaders()); toast.success('Admin created!'); }
      setFormData({ username: '', password: '', hall_id: '', role: 'admin', permissions: [], allowed_services: ["*"] });
      setShowAddUser(false); setEditingAdminId(null); fetchAdmins();
    } catch(e) { toast.error(e.response?.data?.detail || 'Error saving admin'); }
  };

  const handleEditUser = (adm) => {
    setFormData({ username: adm.username, password: '', hall_id: adm.hall_id || '', role: adm.role || 'admin', permissions: adm.permissions || [], allowed_services: adm.allowed_services || ["*"] });
    setEditingAdminId(adm.id); setShowAddUser(true);
  };

  const handleResetPassword = async (id) => {
    const pw = window.prompt('Enter new password:');
    if (!pw) return;
    try { await axios.put(`${API}/admins/${id}/reset-password`, { new_password: pw }, getAuthHeaders()); toast.success('Password reset!'); } catch(e) { toast.error('Error resetting password'); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete admin ${name}?`)) return;
    try { await axios.delete(`${API}/admins/${id}`, getAuthHeaders()); toast.success('Deleted!'); fetchAdmins(); } catch(e) { toast.error('Error deleting'); }
  };

  const handleCreateHall = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/halls`, hallForm, getAuthHeaders()); toast.success('Hall created!'); setShowAddHall(false); setHallForm({ name: '', name_mr: '', capacity: 500, approx_rent: 50000, location: '', image_url: '', description: '', description_mr: '' }); fetchHalls(); } catch(e) { toast.error(e.response?.data?.detail || 'Error creating hall'); }
  };

  const handleDeleteHall = async (id, name) => {
    if (!window.confirm(`Delete hall "${name}"? This is permanent.`)) return;
    try { await axios.delete(`${API}/halls/${id}`, getAuthHeaders()); toast.success('Hall deleted!'); fetchHalls(); } catch(e) { toast.error('Error deleting hall'); }
  };

  const handleExport = async () => {
    if (!dateRange.from_date || !dateRange.to_date) return toast.error('Select both dates');
    try {
      const r = await axios.post(`${API}/data/export`, dateRange, getAuthHeaders());
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `data_${dateRange.from_date}_to_${dateRange.to_date}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success(`Exported ${r.data.count.bookings} bookings & ${r.data.count.bills} bills`);
    } catch(e) { toast.error('Export failed'); }
  };

  const handlePurge = async () => {
    if (!purgeRange.from_date || !purgeRange.to_date) return toast.error('Select both dates');
    if (!window.confirm(`⚠️ PERMANENTLY DELETE all bookings & bills from ${purgeRange.from_date} to ${purgeRange.to_date}?`)) return;
    if (!window.confirm('This CANNOT be undone. Are you absolutely sure?')) return;
    try {
      const r = await axios.post(`${API}/data/purge`, purgeRange, getAuthHeaders());
      toast.success(`Deleted ${r.data.deleted.bookings} bookings & ${r.data.deleted.bills} bills`);
    } catch(e) { toast.error('Purge failed'); }
  };

  const tabs = [
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'halls', icon: Building2, label: 'Hall Management' },
    { id: 'data', icon: Database, label: 'Data Management' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-purple-600" size={28} />
          <h1 className="playfair text-2xl font-bold maroon-text">Super Admin Control Panel</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b-2 border-gray-200 pb-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-semibold text-sm transition-all ${activeTab === tab.id ? 'bg-[#800000] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ===== USER MANAGEMENT TAB ===== */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{t('Admin Users', 'प्रशासक')}</h2>
              <button onClick={() => { setEditingAdminId(null); setFormData({ username: '', password: '', hall_id: '', role: 'admin', permissions: [], allowed_services: ["*"] }); setShowAddUser(true); }}
                className="flex items-center gap-2 px-5 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]">
                <Plus size={18} /> Add User
              </button>
            </div>

            {/* Add/Edit User Form */}
            {showAddUser && (
              <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#D4AF37]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold maroon-text">{editingAdminId ? 'Edit User' : 'Create New User'}</h3>
                  <button onClick={() => setShowAddUser(false)}><X size={22} /></button>
                </div>
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Username</label>
                      <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Password</label>
                      <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg"
                        required={!editingAdminId} placeholder={editingAdminId ? 'Leave blank to keep' : ''} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Hall</label>
                      <select value={formData.hall_id} onChange={e => setFormData({...formData, hall_id: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required>
                        <option value="">Select Hall...</option>
                        {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Role</label>
                      <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                        <option value="admin">Hall Admin</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="booking_staff">Booking Staff (Calendar Only)</option>
                      </select>
                    </div>
                  </div>

                  {/* Service Toggles */}
                  {formData.hall_id && hallServices.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <label className="block text-sm font-bold maroon-text mb-3">Allowed Services (Toggle)</label>
                      <label className="flex items-center gap-2 mb-3 pb-2 border-b cursor-pointer">
                        <input type="checkbox" checked={formData.allowed_services.includes("*")}
                          onChange={e => setFormData({...formData, allowed_services: e.target.checked ? ["*"] : []})} />
                        <span className="text-sm font-semibold">All Services</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {hallServices.map(s => (
                          <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer">
                            <input type="checkbox" disabled={formData.allowed_services.includes("*")}
                              checked={formData.allowed_services.includes("*") || formData.allowed_services.includes(s.id)}
                              onChange={e => {
                                let up = formData.allowed_services.filter(id => id !== "*");
                                if (e.target.checked) up.push(s.id); else up = up.filter(id => id !== s.id);
                                setFormData({...formData, allowed_services: up});
                              }} />
                            <span className="text-xs">{language === 'en' ? s.name : s.name_mr}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]">
                    <Save size={18} /> Save
                  </button>
                </form>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#800000] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Username</th>
                    <th className="px-4 py-3 text-left">Hall</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Services</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{a.username}</td>
                      <td className="px-4 py-3">{a.hall_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : a.role === 'booking_staff' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {a.role === 'super_admin' ? 'Super Admin' : a.role === 'booking_staff' ? 'Booking Staff' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {a.allowed_services?.includes("*") ? <span className="text-green-600 font-bold">All</span> : `${(a.allowed_services || []).length} selected`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.last_login ? new Date(a.last_login).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleEditUser(a)} className="p-2 text-blue-500 hover:bg-blue-100 rounded" title="Edit"><Edit2 size={16} /></button>
                          <button onClick={() => handleResetPassword(a.id)} className="p-2 text-orange-500 hover:bg-orange-100 rounded" title="Reset Password"><Key size={16} /></button>
                          {a.id !== admin.id && <button onClick={() => handleDeleteUser(a.id, a.username)} className="p-2 text-red-500 hover:bg-red-100 rounded" title="Delete"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== HALL MANAGEMENT TAB ===== */}
        {activeTab === 'halls' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Hall Management</h2>
              <button onClick={() => setShowAddHall(true)} className="flex items-center gap-2 px-5 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]">
                <Plus size={18} /> Create Hall
              </button>
            </div>

            {showAddHall && (
              <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-[#D4AF37]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold maroon-text">Create New Hall</h3>
                  <button onClick={() => setShowAddHall(false)}><X size={22} /></button>
                </div>
                <form onSubmit={handleCreateHall} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold mb-1">Hall Name (English)</label><input type="text" value={hallForm.name} onChange={e => setHallForm({...hallForm, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
                    <div><label className="block text-sm font-semibold mb-1">Hall Name (Marathi)</label><input type="text" value={hallForm.name_mr} onChange={e => setHallForm({...hallForm, name_mr: e.target.value})} className="w-full px-4 py-2 border rounded-lg marathi-text" required /></div>
                    <div><label className="block text-sm font-semibold mb-1">Capacity</label><input type="number" value={hallForm.capacity} onChange={e => setHallForm({...hallForm, capacity: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-semibold mb-1">Approx Rent (₹)</label><input type="number" value={hallForm.approx_rent} onChange={e => setHallForm({...hallForm, approx_rent: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-lg" /></div>
                    <div><label className="block text-sm font-semibold mb-1">Location URL</label><input type="text" value={hallForm.location} onChange={e => setHallForm({...hallForm, location: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
                    <div><label className="block text-sm font-semibold mb-1">Image URL</label><input type="text" value={hallForm.image_url} onChange={e => setHallForm({...hallForm, image_url: e.target.value})} className="w-full px-4 py-2 border rounded-lg" required /></div>
                  </div>
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]"><Save size={18} /> Create Hall</button>
                </form>
              </div>
            )}

            {/* Halls List */}
            <div className="grid md:grid-cols-2 gap-4">
              {halls.map(h => (
                <div key={h.id} className="bg-white p-5 rounded-xl shadow border-l-4 border-[#D4AF37]">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{h.name}</h3>
                      <p className="text-sm text-gray-500 marathi-text">{h.name_mr}</p>
                      <p className="text-sm mt-1">Capacity: <strong>{h.capacity}</strong> | Rent: <strong>₹{h.approx_rent?.toLocaleString()}</strong></p>
                    </div>
                    <button onClick={() => handleDeleteHall(h.id, h.name)} className="p-2 text-red-500 hover:bg-red-100 rounded"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== DATA MANAGEMENT TAB ===== */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold maroon-text mb-4 flex items-center gap-2"><Download size={20} /> Download Data</h3>
              <p className="text-sm text-gray-500 mb-4">Export all bookings and bills for a custom date range as a JSON file.</p>
              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div><label className="block text-sm font-semibold mb-1">From Date</label><input type="date" value={dateRange.from_date} onChange={e => setDateRange({...dateRange, from_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-semibold mb-1">To Date</label><input type="date" value={dateRange.to_date} onChange={e => setDateRange({...dateRange, to_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                <button onClick={handleExport} className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 h-[42px]">
                  <Download size={18} /> Export JSON
                </button>
              </div>
            </div>

            {/* Purge Section */}
            <div className="bg-red-50 p-6 rounded-xl shadow-lg border border-red-200">
              <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Delete Data (Permanent)</h3>
              <p className="text-sm text-red-600 mb-4">⚠️ This will permanently delete bookings and bills within the selected date range from MongoDB. This action CANNOT be undone. Download your data first.</p>
              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div><label className="block text-sm font-semibold mb-1">From Date</label><input type="date" value={purgeRange.from_date} onChange={e => setPurgeRange({...purgeRange, from_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-semibold mb-1">To Date</label><input type="date" value={purgeRange.to_date} onChange={e => setPurgeRange({...purgeRange, to_date: e.target.value})} className="w-full px-4 py-2 border rounded-lg" /></div>
                <button onClick={handlePurge} className="flex items-center justify-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 h-[42px]">
                  <Trash2 size={18} /> Purge Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default SuperAdminDashboard;
