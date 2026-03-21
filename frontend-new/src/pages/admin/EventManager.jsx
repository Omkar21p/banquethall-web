import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Trash2, Edit2, Plus, Save, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EventManager = () => {
    const { getAuthHeaders } = useAuth();
    const { t } = useLanguage();
    const [bookings, setBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [isEditingService, setIsEditingService] = useState(null);
    const [showBillView, setShowBillView] = useState(false);

    // New service entry form
    const [newService, setNewService] = useState({
        serviceType: '',
        providerName: '',
        amount: '',
        description: ''
    });

    // Service Bill state
    const [billData, setBillData] = useState({
        discount: 0,
        extraCharges: 0,
        notes: ''
    });

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await axios.get(`${API}/bookings`, getAuthHeaders());
            // Filter for only booked status
            setBookings(response.data.filter(b => b.status === 'booked').sort((a, b) => new Date(a.date) - new Date(b.date)));
        } catch (err) {
            console.error('Error fetching bookings:', err);
        }
    };

    const handleBookingSelect = (bookingId) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking) {
            setSelectedBooking(booking);
            setShowBillView(false);
            if (booking.service_bill) {
                setBillData(booking.service_bill);
            } else {
                setBillData({ discount: 0, extraCharges: 0, notes: '' });
            }
        }
    };

    const handleAddService = async () => {
        if (!newService.serviceType || !newService.providerName || !newService.amount) {
            toast.error(t('Please fill required fields', 'कृपया आवश्यक फील्ड्स भरा'));
            return;
        }
        if (parseFloat(newService.amount) < 0) {
            toast.error(t('Amount must be positive', 'रक्कम पॉझिटिव्ह असावी'));
            return;
        }

        const updatedBooking = {
            ...selectedBooking,
            event_services: [...(selectedBooking.event_services || []), { ...newService, amount: parseFloat(newService.amount) }]
        };

        try {
            await axios.put(`${API}/bookings/${selectedBooking.id}`, updatedBooking, getAuthHeaders());
            setSelectedBooking(updatedBooking);
            setNewService({ serviceType: '', providerName: '', amount: '', description: '' });
            fetchBookings();
            toast.success(t('Service added!', 'सेवा जोडली!'));
        } catch (err) {
            toast.error(t('Error adding service', 'सेवा जोडताना एरर'));
        }
    };

    const handlePrintServiceBill = () => {
        if (!selectedBooking.service_bill) {
            toast.error(t('Save the bill first to print!', 'प्रिंट करण्यासाठी आधी बिल जतन करा!'));
            return;
        }

        const printWindow = window.open('', '_blank');
        const bill = selectedBooking.service_bill;

        const html = `
      <html>
        <head>
          <title>Service Bill - ${selectedBooking.customer_name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px solid #800000; padding-bottom: 20px; margin-bottom: 30px; }
            .maroon { color: #800000; margin: 0; }
            .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; background: #fdfbf7; padding: 15px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #800000; color: white; border: 1px solid #600000; padding: 12px; text-align: left; }
            td { padding: 12px; border: 1px solid #eee; }
            .summary-container { display: flex; justify-content: flex-end; }
            .summary { width: 300px; }
            .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #ddd; }
            .total { font-weight: bold; font-size: 1.4em; color: #800000; border-top: 2px solid #800000; margin-top: 10px; padding-top: 10px; border-bottom: none; }
            .notes { margin-top: 40px; padding: 20px; background: #f9f9f9; border-left: 5px solid #D4AF37; border-radius: 4px; }
            .footer { margin-top: 60px; text-align: center; font-size: 0.9em; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="maroon">OM LAWNS & BANQUET HALL</h1>
            <p>Service Invoice</p>
          </div>
          
          <div class="bill-info">
            <div>
              <p><strong>Customer:</strong> ${selectedBooking.customer_name}</p>
              <p><strong>City:</strong> ${selectedBooking.customer_city}</p>
              <p><strong>Date:</strong> ${selectedBooking.date}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Invoice No:</strong> #SRV-${selectedBooking.id.substring(0, 6).toUpperCase()}</p>
              <p><strong>Event Type:</strong> ${selectedBooking.event_type}</p>
              <p><strong>Bill Date:</strong> ${new Date(bill.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Service Type</th>
                <th>Provider Name</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${selectedBooking.event_services.map(s => `
                <tr>
                  <td>${s.serviceType} / ${s.description || '-'}</td>
                  <td>${s.providerName}</td>
                  <td style="text-align: right;">₹${s.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-container">
            <div class="summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${bill.subtotal.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span>Discount:</span>
                <span>-₹${bill.discount.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span>Extra Charges:</span>
                <span>+₹${bill.extraCharges.toLocaleString()}</span>
              </div>
              <div class="summary-row total">
                <span>Final Amount:</span>
                <span>₹${bill.finalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          ${bill.notes ? `
            <div class="notes">
              <strong>Notes:</strong><br/>
              ${bill.notes}
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for choosing Om Lawns & Banquet Hall!</p>
            <p>This is a computer-generated summary of services.</p>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleDeleteService = async (index) => {
        const updatedServices = selectedBooking.event_services.filter((_, i) => i !== index);
        const updatedBooking = { ...selectedBooking, event_services: updatedServices };

        try {
            await axios.put(`${API}/bookings/${selectedBooking.id}`, updatedBooking, getAuthHeaders());
            setSelectedBooking(updatedBooking);
            fetchBookings();
            toast.success(t('Service deleted!', 'सेवा हटवली!'));
        } catch (err) {
            toast.error(t('Error deleting service', 'सेवा हटवताना एरर'));
        }
    };

    const handleEditService = (index) => {
        setIsEditingService(index);
        setNewService(selectedBooking.event_services[index]);
    };

    const handleUpdateService = async () => {
        const updatedServices = [...selectedBooking.event_services];
        updatedServices[isEditingService] = { ...newService, amount: parseFloat(newService.amount) };
        const updatedBooking = { ...selectedBooking, event_services: updatedServices };

        try {
            await axios.put(`${API}/bookings/${selectedBooking.id}`, updatedBooking, getAuthHeaders());
            setSelectedBooking(updatedBooking);
            setIsEditingService(null);
            setNewService({ serviceType: '', providerName: '', amount: '', description: '' });
            fetchBookings();
            toast.success(t('Service updated!', 'सेवा अपडेट झाली!'));
        } catch (err) {
            toast.error(t('Error updating service', 'सेवा अपडेट करताना एरर'));
        }
    };

    const calculateSubtotal = () => {
        return (selectedBooking?.event_services || []).reduce((sum, s) => sum + s.amount, 0);
    };

    const calculateFinalAmount = () => {
        const subtotal = calculateSubtotal();
        return subtotal - (parseFloat(billData.discount) || 0) + (parseFloat(billData.extraCharges) || 0);
    };

    const handleSaveServiceBill = async () => {
        const finalBillData = {
            ...billData,
            subtotal: calculateSubtotal(),
            finalAmount: calculateFinalAmount(),
            updatedAt: new Date().toISOString()
        };

        if (finalBillData.finalAmount < 0) {
            toast.error(t('Final amount cannot be negative!', 'अंतिम रक्कम नकारात्मक असू शकत नाही!'));
            return;
        }

        const updatedBooking = {
            ...selectedBooking,
            service_bill: finalBillData
        };

        try {
            await axios.put(`${API}/bookings/${selectedBooking.id}`, updatedBooking, getAuthHeaders());
            setSelectedBooking(updatedBooking);
            fetchBookings();
            toast.success(t('Service bill saved!', 'सेवा बिल जतन झाले!'));
        } catch (err) {
            toast.error(t('Error saving bill', 'बिल जतन करताना एरर'));
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-[#800000]">
                    <h2 className="playfair text-2xl font-bold maroon-text mb-4">
                        {t('Event Management', 'कार्यक्रम व्यवस्थापन')}
                    </h2>
                    <div>
                        <label className="block text-sm font-bold maroon-text mb-2">{t('Select Event:', 'कार्यक्रम निवडा:')}</label>
                        <select
                            value={selectedBooking?.id || ''}
                            onChange={(e) => handleBookingSelect(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-[#D4AF37] rounded-lg focus:outline-none bg-white text-gray-800 font-medium"
                        >
                            <option value="">{t('Choose an event...', 'एक कार्यक्रम निवडा...')}</option>
                            {bookings.map(b => (
                                <option key={b.id} value={b.id}>{b.date} - {b.customer_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedBooking && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Service Form & Table */}
                        <div className="bg-white p-6 rounded-xl shadow-lg space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="playfair text-xl font-bold maroon-text">{t('Vendor Services', 'विक्रेता सेवा')}</h3>
                                <button
                                    onClick={() => setShowBillView(!showBillView)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                >
                                    <FileText size={18} />
                                    {showBillView ? t('Manage Services', 'सेवा व्यवस्थापित करा') : t('Generate Service Bill', 'सेवा बिल जनरेट करा')}
                                </button>
                            </div>

                            {!showBillView ? (
                                <div className="space-y-6">
                                    <div className="bg-[#FDFBF7] p-4 rounded-lg space-y-4 border-2 border-[#D4AF37]/30">
                                        <h4 className="font-bold text-[#800000]">{isEditingService !== null ? t('Edit Entry', 'नोंद संपादित करा') : t('Add New Entry', 'नवीन नोंद जोडा')}</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder={t('Service Type (e.g. Catering)', 'सेवेचा प्रकार (उदा. केटरिंग)')}
                                                value={newService.serviceType}
                                                onChange={(e) => setNewService({ ...newService, serviceType: e.target.value })}
                                                className="px-3 py-2 border rounded-lg focus:ring-2 ring-[#D4AF37]"
                                            />
                                            <input
                                                type="text"
                                                placeholder={t('Provider Name', 'प्रदाता नाव')}
                                                value={newService.providerName}
                                                onChange={(e) => setNewService({ ...newService, providerName: e.target.value })}
                                                className="px-3 py-2 border rounded-lg focus:ring-2 ring-[#D4AF37]"
                                            />
                                            <input
                                                type="number"
                                                placeholder={t('Amount', 'रक्कम')}
                                                value={newService.amount}
                                                onChange={(e) => setNewService({ ...newService, amount: e.target.value })}
                                                className="px-3 py-2 border rounded-lg focus:ring-2 ring-[#D4AF37]"
                                            />
                                            <input
                                                type="text"
                                                placeholder={t('Description (Optional)', 'वर्णन (पर्यायी)')}
                                                value={newService.description}
                                                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                                className="px-3 py-2 border rounded-lg focus:ring-2 ring-[#D4AF37]"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {isEditingService !== null ? (
                                                <>
                                                    <button onClick={handleUpdateService} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold">{t('Update', 'अपडेट करा')}</button>
                                                    <button onClick={() => { setIsEditingService(null); setNewService({ serviceType: '', providerName: '', amount: '', description: '' }); }} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"><X size={20} /></button>
                                                </>
                                            ) : (
                                                <button onClick={handleAddService} className="w-full px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] font-bold flex items-center justify-center gap-2">
                                                    <Plus size={20} /> {t('Add Entry', 'नोंद जोडा')}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 maroon-text font-bold">
                                                <tr>
                                                    <th className="p-2 text-left">{t('Type', 'प्रकार')}</th>
                                                    <th className="p-2 text-left">{t('Provider', 'प्रदाता')}</th>
                                                    <th className="p-2 text-right">{t('Amount', 'रक्कम')}</th>
                                                    <th className="p-2 text-center">{t('Actions', 'कृती')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedBooking.event_services || []).length === 0 ? (
                                                    <tr><td colSpan={4} className="p-4 text-center text-gray-400 italic">{t('No services added yet', 'अद्याप एकही सेवा जोडलेली नाही')}</td></tr>
                                                ) : (
                                                    selectedBooking.event_services.map((service, idx) => (
                                                        <tr key={idx} className="border-b hover:bg-gray-50 transition">
                                                            <td className="p-2">{service.serviceType}</td>
                                                            <td className="p-2">{service.providerName}</td>
                                                            <td className="p-2 text-right font-bold">₹{service.amount.toLocaleString()}</td>
                                                            <td className="p-2 flex gap-2 justify-center">
                                                                <button onClick={() => handleEditService(idx)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 size={16} /></button>
                                                                <button onClick={() => handleDeleteService(idx)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16} /></button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                            <tfoot>
                                                <tr className="font-bold maroon-text">
                                                    <td colSpan={2} className="p-2 text-right">{t('Subtotal:', 'उपएकूण:')}</td>
                                                    <td className="p-2 text-right">₹{calculateSubtotal().toLocaleString()}</td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                /* Service Bill View */
                                <div className="space-y-6 border-2 border-blue-100 p-4 rounded-xl">
                                    <h4 className="font-bold text-blue-800 text-lg border-b pb-2">{t('Service Bill Preview', 'सेवा बिल पूर्वावलोकन')}</h4>
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-blue-50">
                                            <tr>
                                                <th className="border p-2 text-left">{t('Service Type', 'सेवेचा प्रकार')}</th>
                                                <th className="border p-2 text-left">{t('Provider', 'प्रदाता')}</th>
                                                <th className="border p-2 text-right">{t('Amount', 'रक्कम')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedBooking.event_services.map((s, idx) => (
                                                <tr key={idx}>
                                                    <td className="border p-2">{s.serviceType}</td>
                                                    <td className="border p-2">{s.providerName}</td>
                                                    <td className="border p-2 text-right">₹{s.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg">
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600">{t('Discount', 'सूट')}</label>
                                                <input
                                                    type="number"
                                                    value={billData.discount}
                                                    onChange={(e) => setBillData({ ...billData, discount: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-2 py-1.5 border rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600">{t('Extra Charges', 'जादा चार्जेस')}</label>
                                                <input
                                                    type="number"
                                                    value={billData.extraCharges}
                                                    onChange={(e) => setBillData({ ...billData, extraCharges: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-2 py-1.5 border rounded"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600">{t('Notes', 'टीपा')}</label>
                                            <textarea
                                                rows={4}
                                                value={billData.notes}
                                                onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
                                                className="w-full px-2 py-1.5 border rounded text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-blue-800 p-4 rounded-xl text-white text-right space-y-1 shadow-lg">
                                        <p className="text-sm opacity-80">{t('Subtotal:', 'उपएकूण:')} ₹{calculateSubtotal().toLocaleString()}</p>
                                        <p className="text-sm opacity-80">{t('Discount:', 'सूट:')} -₹{(parseFloat(billData.discount) || 0).toLocaleString()}</p>
                                        <p className="text-sm opacity-80">{t('Extra Charges:', 'जादा चार्जेस:')} +₹{(parseFloat(billData.extraCharges) || 0).toLocaleString()}</p>
                                        <div className="text-2xl font-bold pt-2 border-t mt-2">
                                            {t('Final Amount:', 'अंतिम रक्कम:')} ₹{calculateFinalAmount().toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveServiceBill}
                                            className="flex-1 py-3 bg-green-600 text-white rounded-full font-bold hover:bg-green-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Save size={20} /> {t('Save Service Bill', 'सेवा बिल जतन करा')}
                                        </button>
                                        {selectedBooking.service_bill && (
                                            <button
                                                onClick={handlePrintServiceBill}
                                                className="px-6 py-3 bg-[#D4AF37] text-white rounded-full font-bold hover:bg-[#B8941F] transition flex items-center justify-center gap-2"
                                            >
                                                <FileText size={20} /> {t('Print', 'प्रिंट')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Event Summary / Details Cards */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-[#D4AF37]">
                                <h3 className="playfair text-xl font-bold maroon-text mb-4">{t('Event Summary', 'कार्यक्रम सारांश')}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t('Customer:', 'ग्राहक:')}$</span><span className="font-bold">{selectedBooking.customer_name}</span></div>
                                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t('City:', 'शहर:')}$</span><span className="font-bold">{selectedBooking.customer_city}</span></div>
                                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t('Phone:', 'फोन:')}$</span><span className="font-bold">{selectedBooking.customer_phone}</span></div>
                                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t('Date:', 'तारीख:')}$</span><span className="font-bold">{selectedBooking.date}</span></div>
                                    <div className="flex justify-between border-b pb-2"><span className="text-gray-500">{t('Event Type:', 'प्रकार:')}$</span><span className="font-bold">{selectedBooking.event_type}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">{t('Guests:', 'पाहुणे:')}$</span><span className="font-bold">{selectedBooking.num_guests}</span></div>
                                </div>
                            </div>

                            {selectedBooking.service_bill && (
                                <div className="bg-green-50 p-6 rounded-xl shadow-lg border-2 border-green-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="playfair text-xl font-bold text-green-800">{t('Saved Bill Summary', 'जतन केलेला बिल सारांश')}</h3>
                                        <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded">
                                            {t('Last Updated:', 'शेवटचे अद्यतन:')} {new Date(selectedBooking.service_bill.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><span className="text-gray-600">{t('Subtotal', 'उपएकूण')}</span><span className="font-bold text-lg">₹{selectedBooking.service_bill.subtotal?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-red-600"><span className="opacity-80">{t('Discount', 'सूट')}</span><span className="font-bold">-₹{selectedBooking.service_bill.discount?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-blue-600"><span className="opacity-80">{t('Extra Charges', 'जादा चार्जेस')}</span><span className="font-bold">+₹{selectedBooking.service_bill.extraCharges?.toLocaleString()}</span></div>
                                        <div className="flex justify-between text-xl font-bold text-green-800 border-t pt-2 mt-2">
                                            <span>{t('Final Amount', 'अंतिम रक्कम')}</span>
                                            <span>₹{selectedBooking.service_bill.finalAmount?.toLocaleString()}</span>
                                        </div>
                                        {selectedBooking.service_bill.notes && (
                                            <div className="mt-4 p-3 bg-white/50 rounded text-sm text-gray-700 italic border-l-4 border-green-400">
                                                "{selectedBooking.service_bill.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default EventManager;
