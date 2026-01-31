import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Eye, Share2, FileDown, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OlderBookings = () => {
  const { getAuthHeaders } = useAuth();
  const { language, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('all');
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    fetchHalls();
    fetchBills();
  }, []);

  useEffect(() => {
    filterBills();
  }, [bills, selectedHall, searchTerm]);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API}/bills`, getAuthHeaders());
      setBills(response.data);
    } catch (error) {
      console.error('Error fetching bills:', error);
    }
  };

  const filterBills = () => {
    let filtered = bills;

    if (selectedHall !== 'all') {
      filtered = filtered.filter(b => b.hall_id === selectedHall);
    }

    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer_city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBills(filtered.sort((a, b) => new Date(b.event_date) - new Date(a.event_date)));
  };

  const handleSendReminder = (bill) => {
    const message = `Reminder from ${bill.hall_name}\n\nDear ${bill.customer_name},\n\nThis is a friendly reminder about your upcoming event on ${bill.event_date}.\n\nBalance Due: ₹${bill.balance_due.toLocaleString()}\n\nPlease contact us for any queries.\n\nThank you!`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    toast.success(t('WhatsApp opened!', 'WhatsApp उघडले!'));
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm(t('Delete this bill? This action cannot be undone.', 'हे बिल डिलीट करायचे? ही क्रिया पूर्ववत करता येणार नाही.'))) return;

    try {
      await axios.delete(`${API}/bills/${billId}`, getAuthHeaders());
      toast.success(t('Bill deleted!', 'बिल डिलीट झाले!'));
      fetchBills();
    } catch (error) {
      toast.error(t('Error deleting bill', 'बिल डिलीट करताना एरर'));
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Bills Report', 14, 20);
    
    const tableData = filteredBills.map(bill => [
      bill.customer_name,
      bill.event_date,
      bill.event_type,
      `₹${bill.total_amount.toLocaleString()}`,
      `₹${bill.balance_due.toLocaleString()}`
    ]);

    doc.autoTable({
      head: [['Customer', 'Event Date', 'Event Type', 'Total', 'Balance Due']],
      body: tableData,
      startY: 30,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [128, 0, 0] }
    });

    doc.save('bills-report.pdf');
    toast.success(t('PDF exported!', 'PDF एक्सपोर्ट झाले!'));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-semibold maroon-text mb-2">
                {t('Filter by Hall:', 'हॉलनुसार फिल्टर:')}
              </label>
              <select
                value={selectedHall}
                onChange={(e) => setSelectedHall(e.target.value)}
                className="px-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
                data-testid="hall-filter"
              >
                <option value="all">{t('All Halls', 'सर्व हॉल')}</option>
                {halls.map((hall) => (
                  <option key={hall.id} value={hall.id}>
                    {language === 'en' ? hall.name : hall.name_mr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold maroon-text mb-2">
                {t('Search:', 'शोधा:')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('Search by name or city', 'नाव किंवा शहरानुसार शोधा')}
                  className="pl-10 pr-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
                  data-testid="search-input"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-6 py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
            data-testid="export-pdf-btn"
          >
            <FileDown size={20} />
            {t('Export PDF', 'PDF एक्सपोर्ट')}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="bills-table">
              <thead className="bg-[#800000] text-white">
                <tr>
                  <th className="px-6 py-3 text-left">{t('Customer', 'ग्राहक')}</th>
                  <th className="px-6 py-3 text-left">{t('Hall', 'हॉल')}</th>
                  <th className="px-6 py-3 text-left">{t('Event Date', 'कार्यक्रम तारीख')}</th>
                  <th className="px-6 py-3 text-left">{t('Event Type', 'कार्यक्रम प्रकार')}</th>
                  <th className="px-6 py-3 text-right">{t('Total', 'कुल')}</th>
                  <th className="px-6 py-3 text-right">{t('Balance', 'उर्वरित')}</th>
                  <th className="px-6 py-3 text-center">{t('Actions', 'कृती')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      {t('No bills found', 'कोणतीही बिल आढळली नाही')}
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => (
                    <tr key={bill.id} className="border-b hover:bg-gray-50" data-testid={`bill-row-${bill.id}`}>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold">{bill.customer_name}</p>
                          <p className="text-sm text-gray-600">{bill.customer_city}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">{bill.hall_name}</td>
                      <td className="px-6 py-4">{bill.event_date}</td>
                      <td className="px-6 py-4">{bill.event_type}</td>
                      <td className="px-6 py-4 text-right font-semibold">₹{bill.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold ${
                            bill.balance_due > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          ₹{bill.balance_due.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="p-2 text-[#800000] hover:bg-[#800000] hover:text-white rounded-lg transition-colors"
                            title={t('View Details', 'तपशील पहा')}
                            data-testid={`view-bill-${bill.id}`}
                          >
                            <Eye size={18} />
                          </button>
                          {bill.balance_due > 0 && (
                            <button
                              onClick={() => handleSendReminder(bill)}
                              className="p-2 text-green-600 hover:bg-green-600 hover:text-white rounded-lg transition-colors"
                              title={t('Send Reminder', 'रिमाइंडर पाठवा')}
                              data-testid={`send-reminder-${bill.id}`}
                            >
                              <Share2 size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBill(bill.id)}
                            className="p-2 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                            title={t('Delete Bill', 'बिल डिलीट करा')}
                            data-testid={`delete-bill-${bill.id}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedBill && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedBill(null)}>
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} data-testid="bill-details-modal">
              <div className="border-4 border-[#800000] p-6">
                <div className="text-center mb-6">
                  <h2 className="playfair text-3xl font-bold maroon-text">{selectedBill.hall_name}</h2>
                  <p className="text-lg mt-2">{t('Invoice', 'बिल')}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p><strong>{t('Customer:', 'ग्राहक:')}</strong> {selectedBill.customer_name}</p>
                    <p><strong>{t('City:', 'शहर:')}</strong> {selectedBill.customer_city}</p>
                    <p><strong>{t('Guests:', 'पाहुणे:')}</strong> {selectedBill.num_guests}</p>
                  </div>
                  <div>
                    <p><strong>{t('Booking Date:', 'बुकिंग तारीख:')}</strong> {selectedBill.booking_date}</p>
                    <p><strong>{t('Event Date:', 'कार्यक्रम तारीख:')}</strong> {selectedBill.event_date}</p>
                    <p><strong>{t('Event Type:', 'कार्यक्रम:')}</strong> {selectedBill.event_type}</p>
                  </div>
                </div>

                <table className="w-full text-sm mb-4 border-collapse">
                  <thead>
                    <tr className="bg-[#800000] text-white">
                      <th className="border p-2 text-left">{t('Description', 'वर्णन')}</th>
                      <th className="border p-2 text-right">{t('Qty', 'प्रमाण')}</th>
                      <th className="border p-2 text-right">{t('Rate', 'दर')}</th>
                      <th className="border p-2 text-right">{t('Amount', 'रक्कम')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-2">{t('Hall Rent', 'हॉल भाडे')}</td>
                      <td className="border p-2 text-right">1</td>
                      <td className="border p-2 text-right">₹{selectedBill.hall_rent.toLocaleString()}</td>
                      <td className="border p-2 text-right">₹{selectedBill.hall_rent.toLocaleString()}</td>
                    </tr>
                    {selectedBill.custom_charges && selectedBill.custom_charges.length > 0 && selectedBill.custom_charges.map((charge, idx) => (
                      <tr key={`charge-${idx}`}>
                        <td className="border p-2">{language === 'en' ? charge.label : charge.label_mr}</td>
                        <td className="border p-2 text-right">1</td>
                        <td className="border p-2 text-right">₹{charge.amount.toLocaleString()}</td>
                        <td className="border p-2 text-right">₹{charge.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    {selectedBill.services.map((service, idx) => (
                      <tr key={idx}>
                        <td className="border p-2">{language === 'en' ? service.name : service.name_mr}</td>
                        <td className="border p-2 text-right">{service.quantity}</td>
                        <td className="border p-2 text-right">₹{service.price.toLocaleString()}</td>
                        <td className="border p-2 text-right">₹{(service.price * service.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                    {selectedBill.thali_items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border p-2">{language === 'en' ? item.name : item.name_mr}</td>
                        <td className="border p-2 text-right">{item.quantity}</td>
                        <td className="border p-2 text-right">₹{item.rate.toLocaleString()}</td>
                        <td className="border p-2 text-right">₹{(item.rate * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-right space-y-2">
                  {selectedBill.discount > 0 && (
                    <p><strong>{t('Discount:', 'सूट:')}</strong> -₹{selectedBill.discount.toLocaleString()}</p>
                  )}
                  <p className="text-lg"><strong>{t('Total:', 'कुल:')}</strong> ₹{selectedBill.total_amount.toLocaleString()}</p>
                  {selectedBill.pre_booking_amount > 0 && (
                    <p><strong>{t('Pre-Booking:', 'पूर्व बुकिंग:')}</strong> ₹{selectedBill.pre_booking_amount.toLocaleString()}</p>
                  )}
                  <p className="text-xl font-bold maroon-text">
                    <strong>{t('Balance Due:', 'उर्वरित:')}</strong> ₹{selectedBill.balance_due.toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBill(null)}
                className="mt-6 w-full py-3 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
                data-testid="close-modal-btn"
              >
                {t('Close', 'बंद करा')}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default OlderBookings;