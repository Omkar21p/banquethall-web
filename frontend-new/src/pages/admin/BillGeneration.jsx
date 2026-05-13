import React, { useEffect, useState, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, FileDown, Share2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BillGeneration = () => {
  const { getAuthHeaders, admin } = useAuth();
  const { language, t } = useLanguage();
  const { billId } = useParams();
  const navigate = useNavigate();
  const [billLanguage, setBillLanguage] = useState('en');
  const [halls, setHalls] = useState([]);
  const [services, setServices] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [newDeposit, setNewDeposit] = useState({ amount: '', paymentMode: 'cash', description: '', timestamp: new Date().toISOString().split('T')[0] });
  const billPreviewRef = useRef(null);
  const isLoadingBill = useRef(false);
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
    thali_price_per_plate: '',
    thali_total_plates: '',
    hall_rent: '',
    show_hall_rent: true,
    custom_charges: [],
    discount: '0',
    pre_booking_amount: '0',
    total_amount: 0,
    balance_due: 0,
    deposits: [],
    arrival_date: '',
    departure_date: '',
    arrival_time: '06:00 PM',
    departure_time: '10:00 PM',
    manual_total: false,
    manual_balance: false,
    customized: false
  });
  const [serviceSearch, setServiceSearch] = useState('');

  useEffect(() => {
    fetchHalls();
    if (billId) {
      fetchBill();
    }
  }, [billId]);

  const fetchBill = async () => {
    try {
      isLoadingBill.current = true;
      const response = await axios.get(`${API}/bills`, getAuthHeaders());
      const bill = response.data.find(b => b.id === billId);
      if (bill) {
        // Find associated booking latest data
        let latestBooking = null;
        if (bill.booking_id) {
          try {
            const bookingsRes = await axios.get(`${API}/bookings?hall_id=${bill.hall_id}`, getAuthHeaders());
            latestBooking = bookingsRes.data.find(b => b.id === bill.booking_id);
          } catch (e) { console.error("Error fetching linked booking during bill load:", e); }
        }

        // Logic to merge latest booking services
        let finalServices = bill.services || [];
        let finalCharges = bill.custom_charges || [];

        if (latestBooking) {
          const importedServices = (latestBooking.event_services || []).map((s, idx) => ({
            id: `imported_${latestBooking.id}_${idx}`,
            name: `${s.serviceType} (${s.providerName})`,
            name_mr: `${s.serviceType} (${s.providerName})`,
            price: s.amount,
            quantity: 1,
            total: s.amount,
            isImported: true
          }));

          const importedCharges = [];
          if (latestBooking.service_bill?.extraCharges > 0) {
            importedCharges.push({
              label: `Extra Charges (Event Manager)`,
              label_mr: `अतिरिक्त शुल्क (इव्हेंट मॅनेजर)`,
              amount: latestBooking.service_bill.extraCharges,
              isImported: true
            });
          }

          // Merge services and charges (replace previously imported ones if any)
          const updatedServices = [...(bill.services || []).filter(s => !s.isImported), ...importedServices];
          const updatedCharges = [...(bill.custom_charges || []).filter(c => !c.isImported), ...importedCharges];

          // If we found any new services, recalculate the total immediately
          if (JSON.stringify(updatedServices) !== JSON.stringify(bill.services) || JSON.stringify(updatedCharges) !== JSON.stringify(bill.custom_charges)) {
            finalServices = updatedServices;
            finalCharges = updatedCharges;
            toast.info(t('Linked booking updated! Imported new services from Event Manager.', 'इव्हेंट मॅनेजरमधील नवीन सेवा अपडेट झाल्या आहेत.'));

            // Temporary flag to allow calculateTotal to run once
            isLoadingBill.current = false;
          }
        }

        // Ensure all fields have safe defaults for old bills
        setBillData({
          ...bill,
          thali_price_per_plate: bill.thali_price_per_plate || '',
          thali_total_plates: bill.thali_total_plates || '',
          hall_rent: bill.hall_rent || '',
          discount: bill.discount || '0',
          pre_booking_amount: bill.pre_booking_amount || '0',
          services: finalServices,
          thali_items: bill.thali_items || [],
          custom_charges: finalCharges,
          deposits: bill.deposits || [],
          show_hall_rent: bill.show_hall_rent !== undefined ? bill.show_hall_rent : true,
          // Preserve the stored totals initially (they'll be updated by calculateTotal if isLoadingBill was set to false)
          total_amount: bill.total_amount,
          balance_due: bill.balance_due
        });
        // Allow one render cycle to complete before enabling auto-calc
        // Only if we didn't already enable it above for a sync
        if (isLoadingBill.current) {
          setTimeout(() => { isLoadingBill.current = false; }, 500);
        }
      } else {
        isLoadingBill.current = false;
      }
    } catch (error) {
      isLoadingBill.current = false;
      console.error('Error fetching bill:', error);
      toast.error(t('Error loading bill', 'बिल लोड करताना एरर'));
    }
  };

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
    billData.thali_price_per_plate,
    billData.thali_total_plates,
    billData.hall_rent,
    billData.show_hall_rent,
    billData.custom_charges,
    billData.discount,
    billData.discount,
    billData.pre_booking_amount,
    billData.event_date
  ]);

  useEffect(() => {
    if (billData.event_date) {
      const eventDate = new Date(billData.event_date);
      if (!isNaN(eventDate)) {
        const arrivalDate = new Date(eventDate);
        arrivalDate.setDate(eventDate.getDate() - 1);
        setBillData(prev => ({
          ...prev,
          arrival_date: arrivalDate.toISOString().split('T')[0],
          departure_date: billData.event_date
        }));
      }
    }
  }, [billData.event_date]);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
      // Auto-select admin's hall for new bills
      if (!billId && !billData.hall_id && admin?.hall_id) {
        const adminHall = response.data.find(h => h.id === admin.hall_id);
        if (adminHall) {
          setBillData(prev => ({ ...prev, hall_id: adminHall.id, hall_name: adminHall.name }));
        }
      }
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchBookings();
  }, [billData.hall_id]);

  const fetchBookings = async () => {
    if (!billData.hall_id) return;
    try {
      const response = await axios.get(`${API}/bookings?hall_id=${billData.hall_id}`, getAuthHeaders());
      setBookings(response.data.filter(b => b.status === 'booked'));
    } catch (error) {
      console.error('Error fetching bookings:', error);
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

  const handleBookingSelect = (bookingId) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    const hall = halls.find(h => h.id === billData.hall_id);

    // Prepare imported services from event manager
    const importedServices = (booking.event_services || []).map((s, idx) => ({
      id: `imported_${booking.id}_${idx}`,
      name: `${s.serviceType} (${s.providerName})`,
      name_mr: `${s.serviceType} (${s.providerName})`,
      price: s.amount,
      quantity: 1,
      total: s.amount,
      isImported: true
    }));

    // Prepare imported custom charges
    const importedCharges = [];
    if (booking.service_bill?.extraCharges > 0) {
      importedCharges.push({
        label: `Extra Charges (Event Manager)`,
        label_mr: `अतिरिक्त शुल्क (इव्हेंट मॅनेजर)`,
        amount: booking.service_bill.extraCharges,
        isImported: true
      });
    }

    // Combine discounts
    const serviceBillDiscount = booking.service_bill?.discount || 0;
    const currentDiscount = parseInt(billData.discount) || 0;

    setBillData(prev => ({
      ...prev,
      booking_id: booking.id,
      customer_name: booking.customer_name,
      customer_city: booking.customer_city,
      customer_phone: booking.customer_phone,
      booking_date: booking.booking_date ? new Date(booking.booking_date).toISOString().split('T')[0] : '',
      event_date: booking.date,
      event_type: booking.event_type,
      num_guests: booking.num_guests,
      hall_rent: hall?.approx_rent || prev.hall_rent,
      // Merge services and charges (replace previously imported ones if any)
      services: [...prev.services.filter(s => !s.isImported), ...importedServices],
      custom_charges: [...prev.custom_charges.filter(c => !c.isImported), ...importedCharges],
      discount: (currentDiscount + serviceBillDiscount).toString()
    }));

    if (importedServices.length > 0 || serviceBillDiscount > 0 || importedCharges.length > 0) {
      toast.info(t('Imported existing service bill from Event Manager', 'इव्हेंट मॅनेजरकडून विद्यमान सेवा बिल आयात केले'));
    }
  };

  const calculateTotal = (forceLoad = false) => {
    // Skip auto calculation during initial bill load to preserve stored totals
    // BUT allow if we explicitly force it (e.g. after a sync)
    if (isLoadingBill.current && !forceLoad) return;
    // Skip auto calculation if manual override is enabled
    if (billData.manual_total && billData.manual_balance) return;

    const servicesTotal = billData.services.reduce(
      (sum, s) => {
        const rowTotal = s.total !== undefined ? s.total : (s.price * s.quantity);
        return sum + rowTotal;
      },
      0
    );
    // Thali calculation: Price per plate * Total plates
    const thaliTotal = (parseInt(billData.thali_price_per_plate) || 0) * (parseInt(billData.thali_total_plates) || 0);

    const customChargesTotal = billData.custom_charges.reduce(
      (sum, c) => sum + (parseInt(c.amount) || 0),
      0
    );
    // Only add hall rent if show_hall_rent is true
    const hallRent = billData.show_hall_rent ? (parseInt(billData.hall_rent) || 0) : 0;
    const discount = parseInt(billData.discount) || 0;
    const preBooking = parseInt(billData.pre_booking_amount) || 0;
    const depositsTotal = (billData.deposits || []).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const total = servicesTotal + thaliTotal + hallRent + customChargesTotal - discount;
    const balance = total - preBooking - depositsTotal;

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

  const updateServicePrice = (serviceId, price) => {
    setBillData({
      ...billData,
      services: billData.services.map(s =>
        s.id === serviceId ? { ...s, price: parseInt(price) || 0, total: (parseInt(price) || 0) * s.quantity } : s
      )
    });
  };

  const updateServiceTotal = (serviceId, total) => {
    setBillData({
      ...billData,
      services: billData.services.map(s =>
        s.id === serviceId ? { ...s, total: parseInt(total) || 0 } : s
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
      if (billId) {
        await axios.put(`${API}/bills/${billId}`, billData, getAuthHeaders());
        toast.success(t('Bill updated successfully!', 'बिल यशस्वीपणे अपडेट झाले!'));
      } else {
        await axios.post(`${API}/bills`, billData, getAuthHeaders());
        toast.success(t('Bill saved successfully!', 'बिल यशस्वीपणे जतन झाले!'));
      }
      // Navigate back to bills list
      navigate('/admin/bills');
    } catch (error) {
      toast.error(t('Error saving bill', 'बिल जतन करताना एरर'));
    }
  };

  const handleDownloadPDF = async () => {
    const element = billPreviewRef.current;
    if (!element) return;
    
    try {
      setIsExporting(true);
      await new Promise(r => setTimeout(r, 100)); // wait for re-render

      if (!window.html2pdf) {
        toast.info(t('Loading PDF engine...', 'PDF इंजिन लोड करत आहे...'));
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        document.body.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }
      
      const opt = {
        margin:       10,
        filename:     `bill-${billData.customer_name}-${billData.event_date}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', '.karyalay-package', '.summary-section'] }
      };

      await window.html2pdf().from(element).set(opt).save();

      setIsExporting(false);
      toast.success(t('PDF downloaded!', 'PDF डाऊनलोड झाले!'));
    } catch (err) {
      console.error("PDF generation error:", err);
      setIsExporting(false);
      toast.error(t('Error', 'त्रुटी'));
    }
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
      <>
        <div ref={billPreviewRef} className="bg-white p-8 rounded-xl shadow-lg relative" data-testid="bill-preview">
        {/* CSS for PDF output and multi-page borders */}
        <style>{`
          .pdf-border-container {
            border: 4px solid #800000 !important;
            padding: 24px;
            background-color: #ffffff;
            /* Force borders on every page */
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
          }
          .exporting-pdf .no-print { display: none !important; }
        `}</style>
        <div className="pdf-border-container">
          <div className="flex items-center justify-center gap-6 mb-6">
            {selectedHallData?.logo && (
              <img src={selectedHallData.logo} alt="Hall Logo" className="h-20 object-contain" />
            )}
            <div className={selectedHallData?.logo ? "text-left" : "text-center"}>
              <h1 className="playfair text-2xl font-bold maroon-text leading-tight">{billData.hall_name}</h1>
              <p className="text-lg text-gray-600 font-medium">{t_bill('Invoice', 'बिल')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
            <div>
              <p><strong>{t_bill('Customer Name:', 'ग्राहक नाव:')}</strong> {billData.customer_name}</p>
              <p><strong>{t_bill('City:', 'शहर:')}</strong> {billData.customer_city}</p>
              <p><strong>{t_bill('Number of Guests:', 'पाहुण्यांची संख्या:')}</strong> {billData.num_guests}</p>
              <p><strong>{t_bill('Event Type:', 'कार्यक्रम प्रकार:')}</strong> {billData.event_type}</p>
            </div>
            <div>
              <p><strong>{t_bill('Arrival:', 'हॉलमध्ये आगमन:')}</strong> {billData.arrival_date} (06:00 PM)</p>
              <p><strong>{t_bill('Departure:', 'हॉलमधून प्रस्थान:')}</strong> {billData.departure_date}</p>
              <p><strong>{t_bill('Event Date:', 'कार्यक्रम तारीख:')}</strong> {billData.event_date}</p>
              <p><strong>{t_bill('Booking Date:', 'बुकिंग तारीख:')}</strong> {billData.booking_date}</p>
            </div>
          </div>

          <div className="mb-6 p-4 bg-gray-50 border rounded-lg karyalay-package">
            <h3 className="font-bold maroon-text mb-2 border-b-2 border-[#D4AF37] inline-block">{t_bill('Karyalay Package', 'कार्यालय पॅकेज')}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
              <ul className="list-disc pl-4 space-y-1">
                <li>11,000 sq. ft hall</li>
                <li>3,000 sq ft V.I.P Dinning hall</li>
                <li>6,500 sq ft Open dinning hall</li>
                <li>500 chairs</li>
                <li>12 wall fans</li>
              </ul>
              <ul className="list-disc pl-4 space-y-1">
                <li>AC Room - 2</li>
                <li>Carpet 11,000 sq ft</li>
                <li>1,600 sq ft kitchen</li>
                <li>Cooking utensils as per attached list</li>
              </ul>
            </div>
          </div>

          <table className="w-full text-[10px] mb-4 border-collapse bill-table">
            <thead>
              <tr className="bg-[#800000] text-white">
                <th className="border p-1 text-left">{t_bill('Description', 'वर्णन')}</th>
                <th className="border p-1 text-right">{t_bill('Quantity', 'प्रमाण')}</th>
                <th className="border p-1 text-right">{t_bill('Rate', 'दर')}</th>
                <th className="border p-1 text-right">{t_bill('Amount', 'रक्कम')}</th>
              </tr>
            </thead>
            <tbody>
              {/* Hall Rent - Conditional */}
              {billData.show_hall_rent && (
                <tr>
                  <td className="border p-1">{t_bill('Hall Rent', 'हॉल भाडे')}</td>
                  <td className="border p-1 text-right">1</td>
                  <td className="border p-1 text-right">₹{Number(billData.hall_rent || 0).toLocaleString()}</td>
                  <td className="border p-1 text-right">₹{Number(billData.hall_rent || 0).toLocaleString()}</td>
                </tr>
              )}

              {/* Thali Package */}
              {(parseInt(billData.thali_price_per_plate) > 0 || parseInt(billData.thali_total_plates) > 0) && (
                <>
                  <tr>
                    <td className="border p-2 font-bold bg-gray-50" colSpan={4}>
                      {t_bill('Thali Package', 'थाळी पॅकेज')}
                    </td>
                  </tr>
                  <tr>
                    <td className="border p-2 pl-4">
                      {t_bill('Price per plate', 'किंमत प्रति ताट')}
                      {billData.thali_items.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {t_bill('Includes: ', 'समाविष्ट: ')}
                          {billData.thali_items.map(item => (lang === 'en' ? item.name : item.name_mr)).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="border p-1 text-right">{billData.thali_total_plates}</td>
                    <td className="border p-1 text-right">₹{Number(billData.thali_price_per_plate || 0).toLocaleString()}</td>
                    <td className="border p-1 text-right">₹{((Number(billData.thali_price_per_plate) || 0) * (Number(billData.thali_total_plates) || 0)).toLocaleString()}</td>
                  </tr>
                </>
              )}

              {billData.custom_charges.map((charge, idx) => (
                <tr key={idx}>
                  <td className="border p-1">{lang === 'en' ? charge.label : charge.label_mr} {charge.isImported && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded ml-1 font-bold">EVENT MGMT</span>}</td>
                  <td className="border p-1 text-right">1</td>
                  <td className="border p-1 text-right">₹{Number(charge.amount || 0).toLocaleString()}</td>
                  <td className="border p-1 text-right">₹{Number(charge.amount || 0).toLocaleString()}</td>
                </tr>
              ))}
              
              {/* Regular Services */}
              {billData.services.filter(s => !s.isImported).length > 0 && (
                <>
                  <tr className="bg-gray-50/50">
                    <td colSpan={4} className="border p-1 font-semibold text-[8px] text-gray-500 uppercase tracking-wider">{t_bill('Other Services', 'इतर सेवा')}</td>
                  </tr>
                  {billData.services.filter(s => !s.isImported).map((service) => (
                    <tr key={service.id}>
                      <td className="border p-1">{lang === 'en' ? service.name : service.name_mr}</td>
                      <td className="border p-1 text-right">{service.quantity}</td>
                      <td className="border p-1 text-right">₹{Number(service.price || 0).toLocaleString()}</td>
                      <td className="border p-1 text-right">₹{Number(service.total !== undefined ? service.total : (service.price * service.quantity)).toLocaleString()}</td>
                    </tr>
                  ))}
                </>
              )}

              {/* Imported Event Services */}
              {billData.services.filter(s => s.isImported).length > 0 && (
                <>
                  <tr className="bg-blue-50/30">
                    <td colSpan={4} className="border p-1 font-semibold text-[8px] text-blue-600 uppercase tracking-wider">{t_bill('Event Management Services', 'इव्हेंट मॅनेजमेंट सेवा')}</td>
                  </tr>
                  {billData.services.filter(s => s.isImported).map((service) => (
                    <tr key={service.id}>
                      <td className="border p-1">{lang === 'en' ? service.name : service.name_mr}</td>
                      <td className="border p-1 text-right">{service.quantity}</td>
                      <td className="border p-1 text-right">₹{Number(service.price || 0).toLocaleString()}</td>
                      <td className="border p-1 text-right">₹{Number(service.total !== undefined ? service.total : (service.price * service.quantity)).toLocaleString()}</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
            <tfoot className="summary-section">
              {Number(billData.discount) > 0 && (
                <tr className="font-bold text-gray-700">
                  <td colSpan={3} className="border p-1 text-right">{t_bill('Discount:', 'सूट:')}</td>
                  <td className="border p-1 text-right">-₹{Number(billData.discount).toLocaleString()}</td>
                </tr>
              )}
              <tr className="font-bold text-base bg-gray-50">
                <td colSpan={3} className="border p-1 text-right">{t_bill('Total Amount:', 'कुल रक्कम:')}</td>
                <td className="border p-1 text-right">₹{Number(billData.total_amount || 0).toLocaleString()}</td>
              </tr>
              {Number(billData.pre_booking_amount) > 0 && (
                <tr className="font-bold text-gray-700">
                  <td colSpan={3} className="border p-1 text-right">{t_bill('Pre-Booking Amount:', 'पूर्व बुकिंग रक्कम:')}</td>
                  <td className="border p-1 text-right">₹{Number(billData.pre_booking_amount).toLocaleString()}</td>
                </tr>
              )}
              <tr className="font-bold text-lg maroon-text bg-red-50/30">
                <td colSpan={3} className="border p-1 text-right">{t_bill('Balance Due:', 'उर्वरित रक्कम:')}</td>
                <td className="border p-1 text-right">₹{Number(billData.balance_due || 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {/* Deposits Section in Preview */}
          {(billData.deposits?.length > 0) && (
            <div className="mt-8 border-t pt-6 deposits-section summary-section">
              <h3 className="playfair text-xl font-bold maroon-text mb-4">{t_bill('Deposits History', 'ठेवींचा इतिहास')}</h3>
              <table className="w-full text-[10px] border-collapse margin-top-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-1 text-left">{t_bill('Date', 'तारीख')}</th>
                    <th className="border p-1 text-left">{t_bill('Mode', 'पद्धत')}</th>
                    <th className="border p-1 text-left">{t_bill('Desc', 'वर्णन')}</th>
                    <th className="border p-1 text-right">{t_bill('Amount', 'रक्कम')}</th>
                  </tr>
                </thead>
                <tbody>
                  {billData.deposits.map((dep, midx) => (
                    <tr key={midx}>
                      <td className="border p-1">{new Date(dep.timestamp).toLocaleDateString()}</td>
                      <td className="border p-1">{t_bill(dep.paymentMode === 'cash' ? 'Cash' : 'Online', dep.paymentMode === 'cash' ? 'रोख' : 'ऑनलाईन')}</td>
                      <td className="border p-1">{dep.description || '-'}</td>
                      <td className="border p-1 text-right font-bold">₹{Number(dep.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={3} className="border p-1 text-right">{t_bill('Total Paid:', 'एकूण भरलेले:')}</td>
                    <td className="border p-1 text-right">₹{(billData.deposits || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Control buttons moved OUTSIDE the capture ref */}
      {showPreview && !isExporting && (
        <div className="mt-4 p-4 text-center">
          <button
            onClick={() => setBillData(prev => ({ ...prev, show_hall_rent: !prev.show_hall_rent }))}
            className={`px-4 py-2 rounded-lg text-sm mr-4 border ${billData.show_hall_rent ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'}`}
          >
            {billData.show_hall_rent ? t('Hide Hall Rent', 'हॉल भाडे लपवा') : t('Show Hall Rent', 'हॉल भाडे दाखवा')}
          </button>
        </div>
      )}
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {!showPreview ? (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="grid md:grid-cols-2 gap-5">
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

                {/* Booking Selection */}
                {billData.hall_id && (
                  <div className="mt-3">
                    <label className="block text-sm font-semibold mb-2">{t('Select from Bookings (Optional)', 'बुकिंगमधून निवडा (पर्यायी)')}</label>
                    <select
                      onChange={(e) => handleBookingSelect(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-[#D4AF37] rounded-lg focus:outline-none"
                    >
                      <option value="">{bookings.length > 0 ? t('Choose a booking...', 'बुकिंग निवडा...') : t('No bookings found for this hall', 'या हॉलसाठी बुकिंग नाही')}</option>
                      {bookings.map(booking => (
                        <option key={booking.id} value={booking.id}>
                          {booking.date} — {booking.customer_name} ({booking.event_type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Customer Name', 'ग्राहक नाव')}</label>
                <input
                  type="text"
                  value={billData.customer_name}
                  onChange={(e) => setBillData({ ...billData, customer_name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
                  required
                  data-testid="event-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Arrival Date', 'आगमन तारीख')}</label>
                <input
                  type="date"
                  value={billData.arrival_date}
                  onChange={(e) => setBillData({ ...billData, arrival_date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
                  data-testid="arrival-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Arrival Time', 'आगमन वेळ')}</label>
                <select
                  value={billData.arrival_time}
                  onChange={(e) => setBillData({ ...billData, arrival_time: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
                >
                  <option value="06:00 PM">06:00 PM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Departure Date', 'प्रस्थान तारीख')}</label>
                <input
                  type="date"
                  value={billData.departure_date}
                  onChange={(e) => setBillData({ ...billData, departure_date: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
                  data-testid="departure-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Departure Time', 'प्रस्थान वेळ')}</label>
                <select
                  value={billData.departure_time}
                  onChange={(e) => setBillData({ ...billData, departure_time: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#800000] outline-none"
                >
                  <option value="10:00 PM">10:00 PM</option>
                  <option value="08:00 AM">08:00 AM</option>
                  <option value="04:00 PM">04:00 PM</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Number of Guests', 'पाहुण्यांची संख्या')}</label>
                <input
                  type="number"
                  value={billData.num_guests}
                  onChange={(e) => setBillData({ ...billData, num_guests: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg simple-number-box focus:border-[#800000] outline-none"
                  required
                  data-testid="guests-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Event Type', 'कार्यक्रम प्रकार')}</label>
                <select
                  value={billData.event_type}
                  onChange={(e) => setBillData({ ...billData, event_type: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg marathi-text focus:border-[#800000] outline-none"
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
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-4 py-2 border rounded-lg simple-number-box"
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
                    onWheel={(e) => e.target.blur()}
                    className="px-3 py-2 border rounded-lg simple-number-box"
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
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-4 py-2 border rounded-lg simple-number-box"
                  data-testid="discount-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">{t('Pre-Booking Amount', 'पूर्व बुकिंग रक्कम')}</label>
                <input
                  type="number"
                  value={billData.pre_booking_amount}
                  onChange={(e) => setBillData({ ...billData, pre_booking_amount: e.target.value })}
                  onWheel={(e) => e.target.blur()}
                  className="w-full px-4 py-2 border rounded-lg simple-number-box"
                  data-testid="pre-booking-input"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="playfair text-xl font-bold maroon-text mb-3">{t('Add Services', 'सेवा जोडा')}</h3>
              <div className="relative mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t('Search service to add...', 'सेवा शोधण्यासाठी टाईप करा...')}
                    className="flex-1 px-4 py-2 border-2 border-[#D4AF37] rounded-lg"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    data-testid="service-search-input"
                  />
                  {serviceSearch && (
                    <button 
                      onClick={() => setServiceSearch('')}
                      className="p-2 text-gray-500 hover:text-red-500"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
                
                {serviceSearch && (
                  <div className="absolute z-10 w-full bg-white border-2 border-[#D4AF37] rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                    {services
                      .filter(s => !billData.services.find(bs => bs.id === s.id))
                      .filter(s => 
                        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
                        s.name_mr?.toLowerCase().includes(serviceSearch.toLowerCase())
                      )
                      .map(service => (
                        <div
                          key={service.id}
                          className="px-4 py-3 hover:bg-red-50 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                          onClick={() => {
                            addService(service.id);
                            setServiceSearch('');
                          }}
                        >
                          <div>
                            <span className="font-bold maroon-text">{language === 'en' ? service.name : service.name_mr}</span>
                            <p className="text-xs text-gray-500">{service.description || ''}</p>
                          </div>
                          <span className="text-[#D4AF37] font-bold">₹{service.price}</span>
                        </div>
                      ))}
                    {services
                      .filter(s => !billData.services.find(bs => bs.id === s.id))
                      .filter(s => 
                        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) || 
                        s.name_mr?.toLowerCase().includes(serviceSearch.toLowerCase())
                      ).length === 0 && (
                      <div className="px-4 py-3 text-gray-500 text-center">
                        {t('No matching services found', 'कोणतीही जुळणारी सेवा आढळली नाही')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {billData.services.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#800000] text-white">
                        <th className="px-3 py-2 text-left">{t('Service Name', 'सेवेचे नाव')}</th>
                        <th className="px-3 py-2 text-center">{t('Price/Item', 'किंमत/आयटम')}</th>
                        <th className="px-3 py-2 text-center">{t('Qty', 'प्रमाण')}</th>
                        <th className="px-3 py-2 text-right">{t('Total', 'एकूण')}</th>
                        <th className="px-3 py-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Separate headings in edit table too */}
                      {billData.services.filter(s => s.isImported).length > 0 && (
                        <tr className="bg-blue-50 text-blue-800">
                          <td colSpan={5} className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest">{t('Event Management Services', 'इव्हेंट मॅनेजमेंट सेवा')}</td>
                        </tr>
                      )}
                      {billData.services.filter(s => s.isImported).map((service) => (
                        <tr key={service.id} className="border-t bg-blue-50/20 hover:bg-blue-50/40">
                          <td className="px-3 py-2 font-medium">
                            {language === 'en' ? service.name : service.name_mr}
                            {service.isImported && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold uppercase">{t('Imported', 'आयात केलेले')}</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={service.price}
                              onChange={(e) => updateServicePrice(service.id, e.target.value)}
                              onWheel={(e) => e.target.blur()}
                              className="w-24 px-2 py-1 border rounded text-center simple-number-box bg-white/50"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={service.quantity}
                              onChange={(e) => updateServiceQuantity(service.id, e.target.value)}
                              onWheel={(e) => e.target.blur()}
                              className="w-20 px-2 py-1 border rounded text-center simple-number-box bg-white/50"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={service.total !== undefined ? service.total : (service.price * service.quantity)}
                              onChange={(e) => updateServiceTotal(service.id, e.target.value)}
                              onWheel={(e) => e.target.blur()}
                              className="w-28 px-2 py-1 border rounded text-right font-semibold simple-number-box bg-white/50"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeService(service.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                            >
                              {t('Remove', 'काढा')}
                            </button>
                          </td>
                        </tr>
                      ))}

                      {billData.services.filter(s => !s.isImported).length > 0 && (
                        <tr className="bg-gray-100 text-gray-700 border-t-2 border-gray-200">
                          <td colSpan={5} className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest">{t('Other Services', 'इतर सेवा')}</td>
                        </tr>
                      )}
                      {billData.services.filter(s => !s.isImported).map((service) => (
                        <tr key={service.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium">
                            {language === 'en' ? service.name : service.name_mr}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={service.price}
                              onChange={(e) => updateServicePrice(service.id, e.target.value)}
                              onWheel={(e) => e.target.blur()}
                              className="w-24 px-2 py-1 border rounded text-center simple-number-box"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              value={service.quantity}
                              onChange={(e) => updateServiceQuantity(service.id, e.target.value)}
                              onWheel={(e) => e.target.blur()}
                              className="w-20 px-2 py-1 border rounded text-center simple-number-box"
                              min="1"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={service.total !== undefined ? service.total : (service.price * service.quantity)}
                              onChange={(e) => updateServiceTotal(service.id, e.target.value)}
                              onWheel={(e) => e.target.blur()}
                              className="w-28 px-2 py-1 border rounded text-right font-semibold simple-number-box"
                              min="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeService(service.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                            >
                              {t('Remove', 'काढा')}
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t bg-gray-50 font-bold">
                        <td colSpan={3} className="px-3 py-2 text-right">{t('Services Total:', 'सेवा एकूण:')}</td>
                        <td className="px-3 py-2 text-right">
                          ₹{billData.services.reduce((sum, s) => {
                            const rowTotal = s.total !== undefined ? s.total : (s.price * s.quantity);
                            return sum + rowTotal;
                          }, 0).toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 border-t pt-4">
              <h3 className="playfair text-xl font-bold maroon-text mb-3">{t('Thali Package', 'थाळी पॅकेज')}</h3>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('Price per plate', 'किंमत प्रति ताट')}</label>
                  <input
                    type="number"
                    value={billData.thali_price_per_plate}
                    onChange={(e) => setBillData({ ...billData, thali_price_per_plate: e.target.value })}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-4 py-2 border rounded-lg simple-number-box"
                    placeholder="Rate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">{t('Total plates', 'एकूण ताटे')}</label>
                  <input
                    type="number"
                    value={billData.thali_total_plates}
                    onChange={(e) => setBillData({ ...billData, thali_total_plates: e.target.value })}
                    onWheel={(e) => e.target.blur()}
                    className="w-full px-4 py-2 border rounded-lg simple-number-box"
                    placeholder="Quantity"
                  />
                </div>
              </div>

              <div className="mb-4">
                <p className="font-semibold mb-2">{t('Package Sub-items / Menu', 'मेनू आयटम')}</p>
                {billData.thali_items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder={t('Name (English)', 'नाव (इंग्रजी)')}
                      value={item.name}
                      onChange={(e) => updateThaliItem(idx, 'name', e.target.value)}
                      className="px-2 py-1 border rounded col-span-2"
                    />
                    <input
                      type="text"
                      placeholder={t('Name (Marathi)', 'नाव (मराठी)')}
                      value={item.name_mr}
                      onChange={(e) => updateThaliItem(idx, 'name_mr', e.target.value)}
                      className="px-2 py-1 border rounded marathi-text col-span-2"
                    />
                    <button
                      onClick={() => removeThaliItem(idx)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      {t('Remove', 'काढा')}
                    </button>
                  </div>
                ))}
                <button
                  onClick={addThaliItem}
                  className="px-3 py-1 bg-[#D4AF37] text-white rounded-lg text-sm hover:bg-[#B8941F]"
                >
                  + {t('Add Menu Item', 'मेनू आयटम जोडा')}
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#FDFBF7] rounded-lg">
              <p className="text-lg"><strong>{t('Total Amount:', 'कुल रक्कम:')}</strong> ₹{Number(billData.total_amount || 0).toLocaleString()}</p>
              <p className="text-xl font-bold maroon-text">
                <strong>{t('Balance Due:', 'उर्वरित रक्कम:')}</strong> ₹{Number(billData.balance_due || 0).toLocaleString()}
              </p>
            </div>

            {/* Editable Deposits History Section */}
            <div className="mt-8 border-t pt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="playfair text-xl font-bold maroon-text mb-4">{t('Deposits History', 'ठेवींचा इतिहास')}</h3>
              
              <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Date', 'तारीख')}</label>
                    <input
                      type="date"
                      value={newDeposit.timestamp}
                      onChange={(e) => setNewDeposit({ ...newDeposit, timestamp: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Amount', 'रक्कम')}</label>
                    <input
                      type="number"
                      value={newDeposit.amount}
                      onChange={(e) => setNewDeposit({ ...newDeposit, amount: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Mode', 'पद्धत')}</label>
                    <div className="flex gap-2 py-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input type="radio" name="p-mode" checked={newDeposit.paymentMode === 'cash'} onChange={() => setNewDeposit({ ...newDeposit, paymentMode: 'cash' })} /> {t('Cash', 'रोख')}
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="radio" name="p-mode" checked={newDeposit.paymentMode === 'online'} onChange={() => setNewDeposit({ ...newDeposit, paymentMode: 'online' })} /> {t('Online', 'ऑनलाईन')}
                      </label>
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Description', 'वर्णन')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Adv Check 001"
                      value={newDeposit.description}
                      onChange={(e) => setNewDeposit({ ...newDeposit, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!newDeposit.amount) return toast.error('Enter amount');
                      const dep = { ...newDeposit, amount: parseFloat(newDeposit.amount) };
                      setBillData(prev => ({
                        ...prev,
                        deposits: [...(prev.deposits || []), dep]
                      }));
                      setNewDeposit({ amount: '', paymentMode: 'cash', description: '', timestamp: new Date().toISOString().split('T')[0] });
                      toast.success(t('Added!', 'जोडले!'));
                    }}
                    className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F]"
                  >
                    {t('Add Cash/Online', 'रक्कम जोडा')}
                  </button>
                </div>
              </div>

              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">{t('Date', 'तारीख')}</th>
                    <th className="border p-2 text-left">{t('Mode', 'पद्धत')}</th>
                    <th className="border p-2 text-left">{t('Desc', 'वर्णन')}</th>
                    <th className="border p-2 text-right">{t('Amount', 'रक्कम')}</th>
                    <th className="border p-2 text-center">{t('Act', 'क्रिया')}</th>
                  </tr>
                </thead>
                <tbody>
                  {billData.deposits?.length > 0 ? (
                    billData.deposits.map((dep, midx) => (
                      <tr key={midx}>
                        <td className="border p-2">{new Date(dep.timestamp).toLocaleDateString()}</td>
                        <td className="border p-2">{t(dep.paymentMode === 'cash' ? 'Cash' : 'Online', dep.paymentMode === 'cash' ? 'रोख' : 'ऑनलाईन')}</td>
                        <td className="border p-2">{dep.description || '-'}</td>
                        <td className="border p-2 text-right">₹{Number(dep.amount || 0).toLocaleString()}</td>
                        <td className="border p-2 text-center text-red-500 cursor-pointer hover:bg-red-50" onClick={() => {
                          const updated = billData.deposits.filter((_, i) => i !== midx);
                          setBillData({ ...billData, deposits: updated });
                          toast.success(t('Deleted', 'काढून टाकले'));
                        }}>🗑️</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="border p-4 text-center text-gray-400">{t('No deposits yet', 'अद्याप एकही ठेव नाही')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
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