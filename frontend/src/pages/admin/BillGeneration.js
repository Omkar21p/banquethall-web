import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Save, FileDown, Share2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BillGeneration = () => {
  const { getAuthHeaders } = useAuth();
  const { language, t } = useLanguage();
  const [billLanguage, setBillLanguage] = useState('en');
  const [halls, setHalls] = useState([]);
  const [services, setServices] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const billPreviewRef = useRef(null);
  const [billData, setBillData] = useState({
    hall_id: '',
    hall_name: '',
    customer_name: '',
    customer_city: '',
    booking_date: '',
    event_date: '',
    num_guests: '',
    event_type: 'लग्न',
    services: [],
    thali_items: [],
    hall_rent: '',
    custom_charges: [],
    discount: '0',
    pre_booking_amount: '0',
    total_amount: 0,
    balance_due: 0,
    manual_total: false,
    manual_balance: false
  });

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    if (billData.hall_id) {
      fetchServices();
      const hall = halls.find(h => h.id === billData.hall_id);
      if (hall) {
        setBillData(prev => ({ ...prev, hall_name: hall.name }));
      }
    }
  }, [billData.hall_id]);

  useEffect(() => {
    calculateTotal();
  }, [
    billData.services,
    billData.thali_items,
    billData.hall_rent,
    billData.custom_charges,
    billData.discount,
    billData.pre_booking_amount
  ]);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API}/services?hall_id=${billData.hall_id}`);
      setServices(response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const calculateTotal = () => {
    // Skip auto calculation if manual override is enabled
    if (billData.manual_total && billData.manual_balance) return;
    
    const servicesTotal = billData.services.reduce(
      (sum, s) => sum + (s.price * s.quantity),
      0
    );
    const thaliTotal = billData.thali_items.reduce(
      (sum, t) => sum + (t.rate * t.quantity),
      0
    );
    const customChargesTotal = billData.custom_charges.reduce(
      (sum, c) => sum + (parseInt(c.amount) || 0),
      0
    );
    const hallRent = parseInt(billData.hall_rent) || 0;
    const discount = parseInt(billData.discount) || 0;
    const preBooking = parseInt(billData.pre_booking_amount) || 0;

    const total = servicesTotal + thaliTotal + hallRent + customChargesTotal - discount;
    const balance = total - preBooking;

    setBillData(prev => ({
      ...prev,
      total_amount: billData.manual_total ? prev.total_amount : total,
      balance_due: billData.manual_balance ? prev.balance_due : balance
    }));
  };

  const addService = (serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (service && !billData.services.find(s => s.id === serviceId)) {
      setBillData({
        ...billData,
        services: [...billData.services, { ...service, quantity: 1 }]
      });
    }
  };

  const updateServiceQuantity = (serviceId, quantity) => {
    setBillData({
      ...billData,
      services: billData.services.map(s =>
        s.id === serviceId ? { ...s, quantity: parseInt(quantity) || 1 } : s
      )
    });
  };

  const removeService = (serviceId) => {
    setBillData({
      ...billData,
      services: billData.services.filter(s => s.id !== serviceId)
    });
  };

  const addThaliItem = () => {
    setBillData({
      ...billData,
      thali_items: [
        ...billData.thali_items,
        { name: '', name_mr: '', quantity: 1, rate: 0 }
      ]
    });
  };

  const updateThaliItem = (index, field, value) => {
    const updated = [...billData.thali_items];
    updated[index] = { ...updated[index], [field]: value };
    setBillData({ ...billData, thali_items: updated });
  };

  const removeThaliItem = (index) => {
    setBillData({
      ...billData,
      thali_items: billData.thali_items.filter((_, i) => i !== index)
    });
  };

  const handleSaveBill = async () => {
    try {
      await axios.post(`${API}/bills`, billData, getAuthHeaders());
      toast.success(t('Bill saved successfully!', 'बिल यशस्वीपणे जतन झाले!'));
      // Reset form
      setBillData({
        hall_id: '',
        hall_name: '',
        customer_name: '',
        customer_city: '',
        booking_date: '',
        event_date: '',
        num_guests: '',
        event_type: 'लग्न',
        services: [],
        thali_items: [],
        hall_rent: '',
        custom_charges: [],
        discount: '0',
        pre_booking_amount: '0',
        total_amount: 0,
        balance_due: 0
      });
      setShowPreview(false);
    } catch (error) {
      toast.error(t('Error saving bill', 'बिल जतन करताना एरर'));
    }
  };

  const handleDownloadPDF = async () => {
    const element = billPreviewRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`bill-${billData.customer_name}-${billData.event_date}.pdf`);
    toast.success(t('PDF downloaded!', 'PDF डाऊनलोड झाले!'));
  };

  const handleShareWhatsApp = () => {
    const message = `${billData.hall_name}\n\nBill for: ${billData.customer_name}\nEvent Date: ${billData.event_date}\nTotal Amount: ₹${billData.total_amount.toLocaleString()}\nBalance Due: ₹${billData.balance_due.toLocaleString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const BillPreview = () => {
    const lang = billLanguage;
    const t_bill = (en, mr) => (lang === 'en' ? en : mr);
    
    const selectedHallData = halls.find(h => h.id === billData.hall_id);

    return (
      <div ref={billPreviewRef} className="bg-white p-8 rounded-xl shadow-lg" data-testid="bill-preview">
        <div className="border-4 border-[#800000] p-6">
          <div className="text-center mb-6">
            {selectedHallData?.logo && (
              <div className="flex justify-center mb-3">
                <img src={selectedHallData.logo} alt="Hall Logo" className="h-20 object-contain" />
              </div>
            )}
            <h1 className="playfair text-3xl font-bold maroon-text">{billData.hall_name}</h1>
            <p className="text-lg mt-2">{t_bill('Invoice', 'बिल')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p><strong>{t_bill('Customer Name:', 'ग्राहक नाव:')}</strong> {billData.customer_name}</p>
              <p><strong>{t_bill('City:', 'शहर:')}</strong> {billData.customer_city}</p>
              <p><strong>{t_bill('Number of Guests:', 'पाहुण्यांची संख्या:')}</strong> {billData.num_guests}</p>
            </div>
            <div>
              <p><strong>{t_bill('Booking Date:', 'बुकिंग तारीख:')}</strong> {billData.booking_date}</p>
              <p><strong>{t_bill('Event Date:', 'कार्यक्रम तारीख:')}</strong> {billData.event_date}</p>
              <p><strong>{t_bill('Event Type:', 'कार्यक्रम प्रकार:')}</strong> {billData.event_type}</p>
            </div>
          </div>

          <table className="w-full text-sm mb-4 border-collapse">
            <thead>
              <tr className="bg-[#800000] text-white">
                <th className="border p-2 text-left">{t_bill('Description', 'वर्णन')}</th>
                <th className="border p-2 text-right">{t_bill('Quantity', 'प्रमाण')}</th>
                <th className="border p-2 text-right">{t_bill('Rate', 'दर')}</th>
                <th className="border p-2 text-right">{t_bill('Amount', 'रक्कम')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">{t_bill('Hall Rent', 'हॉल भाडे')}</td>
                <td className="border p-2 text-right">1</td>
                <td className="border p-2 text-right">₹{parseInt(billData.hall_rent || 0).toLocaleString()}</td>
                <td className="border p-2 text-right">₹{parseInt(billData.hall_rent || 0).toLocaleString()}</td>
              </tr>
              {billData.custom_charges.map((charge, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{lang === 'en' ? charge.label : charge.label_mr}</td>
                  <td className="border p-2 text-right">1</td>
                  <td className="border p-2 text-right">₹{charge.amount.toLocaleString()}</td>
                  <td className="border p-2 text-right">₹{charge.amount.toLocaleString()}</td>
                </tr>
              ))}
              {billData.services.map((service) => (
                <tr key={service.id}>
                  <td className="border p-2">{lang === 'en' ? service.name : service.name_mr}</td>
                  <td className="border p-2 text-right">{service.quantity}</td>
                  <td className="border p-2 text-right">₹{service.price.toLocaleString()}</td>
                  <td className="border p-2 text-right">₹{(service.price * service.quantity).toLocaleString()}</td>
                </tr>
              ))}
              {billData.thali_items.map((item, idx) => (
                <tr key={idx}>
                  <td className="border p-2">{lang === 'en' ? item.name : item.name_mr}</td>
                  <td className="border p-2 text-right">{item.quantity}</td>
                  <td className="border p-2 text-right">₹{parseInt(item.rate).toLocaleString()}</td>
                  <td className="border p-2 text-right">₹{(item.rate * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right space-y-2">
            {parseInt(billData.discount) > 0 && (
              <p><strong>{t_bill('Discount:', 'सूट:')}</strong> -₹{parseInt(billData.discount).toLocaleString()}</p>
            )}
            <p className="text-lg"><strong>{t_bill('Total Amount:', 'कुल रक्कम:')}</strong> ₹{billData.total_amount.toLocaleString()}</p>
            {parseInt(billData.pre_booking_amount) > 0 && (
              <p><strong>{t_bill('Pre-Booking Amount:', 'पूर्व बुकिंग रक्कम:')}</strong> ₹{parseInt(billData.pre_booking_amount).toLocaleString()}</p>
            )}
            <p className="text-xl font-bold maroon-text">
              <strong>{t_bill('Balance Due:', 'उर्वरित रक्कम:')}</strong> ₹{billData.balance_due.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {!showPreview ? (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Select Hall', 'हॉल निवडा')}</label>
                <select
                  value={billData.hall_id}
                  onChange={(e) => setBillData({ ...billData, hall_id: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-[#D4AF37] rounded-lg"
                  required
                  data-testid="bill-hall-select"
                >
                  <option value="">{t('Select...', 'निवडा...')}</option>
                  {halls.map(hall => (
                    <option key={hall.id} value={hall.id}>{language === 'en' ? hall.name : hall.name_mr}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Customer Name', 'ग्राहक नाव')}</label>
                <input
                  type="text"
                  value={billData.customer_name}
                  onChange={(e) => setBillData({ ...billData, customer_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('City', 'शहर')}</label>
                <input
                  type="text"
                  value={billData.customer_city}
                  onChange={(e) => setBillData({ ...billData, customer_city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="city-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Booking Date', 'बुकिंग तारीख')}</label>
                <input
                  type="date"
                  value={billData.booking_date}
                  onChange={(e) => setBillData({ ...billData, booking_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="booking-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Event Date', 'कार्यक्रम तारीख')}</label>
                <input
                  type="date"
                  value={billData.event_date}
                  onChange={(e) => setBillData({ ...billData, event_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="event-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Number of Guests', 'पाहुण्यांची संख्या')}</label>
                <input
                  type="number"
                  value={billData.num_guests}
                  onChange={(e) => setBillData({ ...billData, num_guests: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="guests-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Event Type', 'कार्यक्रम प्रकार')}</label>
                <select
                  value={billData.event_type}
                  onChange={(e) => setBillData({ ...billData, event_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg marathi-text"
                  data-testid="event-type-select"
                >
                  <option value="लग्न">लग्न (Wedding)</option>
                  <option value="साखरपुडा">साखरपुडा (Engagement)</option>
                  <option value="सभा (मीटिंग)">सभा (मीटिंग) (Meeting)</option>
                  <option value="वाढदिवस">वाढदिवस (Birthday)</option>
                  <option value="इतर">इतर (Other)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Hall Rent (can override)', 'हॉल भाडे (बदलू शकता)')}</label>
                <input
                  type="number"
                  value={billData.hall_rent}
                  onChange={(e) => setBillData({ ...billData, hall_rent: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="hall-rent-input"
                />
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h3 className="playfair text-xl font-bold maroon-text">{t('Custom Charges', 'कस्टम चार्जेस')}</h3>
                <button
                  type="button"
                  onClick={() => setBillData({
                    ...billData,
                    custom_charges: [...billData.custom_charges, { label: '', label_mr: '', amount: 0 }]
                  })}
                  className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F]"
                >
                  + {t('Add Charge', 'चार्ज जोडा')}
                </button>
              </div>
              {billData.custom_charges.map((charge, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2">
                  <input
                    type="text"
                    placeholder={t('Label (English)', 'लेबल (इंग्रजी)')}
                    value={charge.label}
                    onChange={(e) => {
                      const updated = [...billData.custom_charges];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setBillData({ ...billData, custom_charges: updated });
                    }}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder={t('Label (Marathi)', 'लेबल (मराठी)')}
                    value={charge.label_mr}
                    onChange={(e) => {
                      const updated = [...billData.custom_charges];
                      updated[idx] = { ...updated[idx], label_mr: e.target.value };
                      setBillData({ ...billData, custom_charges: updated });
                    }}
                    className="px-3 py-2 border rounded-lg marathi-text"
                  />
                  <input
                    type="number"
                    placeholder={t('Amount', 'रक्कम')}
                    value={charge.amount}
                    onChange={(e) => {
                      const updated = [...billData.custom_charges];
                      updated[idx] = { ...updated[idx], amount: parseInt(e.target.value) || 0 };
                      setBillData({ ...billData, custom_charges: updated });
                    }}
                    className="px-3 py-2 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = billData.custom_charges.filter((_, i) => i !== idx);
                      setBillData({ ...billData, custom_charges: updated });
                    }}
                    className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600"
                  >
                    {t('Remove', 'काढा')}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Discount', 'सूट')}</label>
                <input
                  type="number"
                  value={billData.discount}
                  onChange={(e) => setBillData({ ...billData, discount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="discount-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Pre-Booking Amount', 'पूर्व बुकिंग रक्कम')}</label>
                <input
                  type="number"
                  value={billData.pre_booking_amount}
                  onChange={(e) => setBillData({ ...billData, pre_booking_amount: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="pre-booking-input"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="playfair text-xl font-bold maroon-text mb-3">{t('Add Services', 'सेवा जोडा')}</h3>
              <select
                onChange={(e) => addService(e.target.value)}
                className="w-full px-4 py-2 border-2 border-[#D4AF37] rounded-lg mb-4"
                defaultValue=""
                data-testid="add-service-select"
              >
                <option value="">{t('Select service to add...', 'सेवा निवडा...')}</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {language === 'en' ? service.name : service.name_mr} - ₹{service.price}
                  </option>
                ))}
              </select>

              {billData.services.length > 0 && (
                <div className="space-y-2">
                  {billData.services.map((service) => (
                    <div key={service.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1">{language === 'en' ? service.name : service.name_mr}</span>
                      <input
                        type="number"
                        value={service.quantity}
                        onChange={(e) => updateServiceQuantity(service.id, e.target.value)}
                        className="w-20 px-2 py-1 border rounded"
                        min="1"
                      />
                      <span className="w-24 text-right">₹{(service.price * service.quantity).toLocaleString()}</span>
                      <button
                        onClick={() => removeService(service.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        {t('Remove', 'काढा')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="playfair text-xl font-bold maroon-text">{t('Thali Items', 'थाळी आयटम')}</h3>
                <button
                  onClick={addThaliItem}
                  className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F]"
                  data-testid="add-thali-item-btn"
                >
                  {t('Add Thali Item', 'थाळी आयटम जोडा')}
                </button>
              </div>

              {billData.thali_items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder={t('Name (English)', 'नाव (इंग्रजी)')}
                    value={item.name}
                    onChange={(e) => updateThaliItem(idx, 'name', e.target.value)}
                    className="px-2 py-1 border rounded"
                  />
                  <input
                    type="text"
                    placeholder={t('Name (Marathi)', 'नाव (मराठी)')}
                    value={item.name_mr}
                    onChange={(e) => updateThaliItem(idx, 'name_mr', e.target.value)}
                    className="px-2 py-1 border rounded marathi-text"
                  />
                  <input
                    type="number"
                    placeholder={t('Quantity', 'प्रमाण')}
                    value={item.quantity}
                    onChange={(e) => updateThaliItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="px-2 py-1 border rounded"
                  />
                  <input
                    type="number"
                    placeholder={t('Rate', 'दर')}
                    value={item.rate}
                    onChange={(e) => updateThaliItem(idx, 'rate', parseInt(e.target.value) || 0)}
                    className="px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => removeThaliItem(idx)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    {t('Remove', 'काढा')}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-[#FDFBF7] rounded-lg">
              <p className="text-lg"><strong>{t('Total Amount:', 'कुल रक्कम:')}</strong> ₹{billData.total_amount.toLocaleString()}</p>
              <p className="text-xl font-bold maroon-text">
                <strong>{t('Balance Due:', 'उर्वरित रक्कम:')}</strong> ₹{billData.balance_due.toLocaleString()}
              </p>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000]"
                data-testid="preview-bill-btn"
              >
                <Eye size={20} />
                {t('Preview Bill', 'बिल पूर्वावलोकन')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Bill Language', 'बिल भाषा')}</label>
                <select
                  value={billLanguage}
                  onChange={(e) => setBillLanguage(e.target.value)}
                  className="px-4 py-2 border-2 border-[#D4AF37] rounded-lg"
                  data-testid="bill-language-select"
                >
                  <option value="en">English</option>
                  <option value="mr">मराठी</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100"
                  data-testid="edit-bill-btn"
                >
                  {t('Edit', 'संपादित')}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F]"
                  data-testid="download-pdf-btn"
                >
                  <FileDown size={20} />
                  {t('Download PDF', 'PDF डाऊनलोड')}
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  data-testid="share-whatsapp-btn"
                >
                  <Share2 size={20} />
                  {t('Share WhatsApp', 'WhatsApp शेअर')}
                </button>
                <button
                  onClick={handleSaveBill}
                  className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000]"
                  data-testid="save-bill-btn"
                >
                  <Save size={20} />
                  {t('Save Bill', 'बिल जतन करा')}
                </button>
              </div>
            </div>

            <BillPreview />
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default BillGeneration;