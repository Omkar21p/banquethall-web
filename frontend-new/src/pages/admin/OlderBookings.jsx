import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Eye, Share2, FileDown, Search, Trash2, Edit, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OlderBookings = () => {
  const { getAuthHeaders, admin } = useAuth();
  const { language, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('all');
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const billPreviewRef = useRef(null);
  const navigate = useNavigate();
  const [newDeposit, setNewDeposit] = useState({
    amount: '',
    paymentMode: 'cash',
    description: '',
    timestamp: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchHalls();
    fetchBills();
  }, []);

  useEffect(() => {
    filterBills();
    // Sync selectedBill if it exists and bills list has updated
    if (selectedBill) {
      const refreshed = bills.find(b => b.id === selectedBill.id);
      if (refreshed) {
        setSelectedBill(refreshed);
      }
    }
  }, [bills, selectedHall, searchTerm]);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
      // Default to admin's hall
      if (admin?.hall_id) {
        setSelectedHall(admin.hall_id);
      }
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

  const handleDownloadSingleBillPDF = async (bill) => {
    const element = billPreviewRef.current;
    if (!element) {
      toast.error(t('Error: Element not found', 'एरर: घटक आढळला नाही'));
      return;
    }

    try {
      setIsExporting(true);
      // Wait a tick for React to re-render without inputs
      await new Promise(r => setTimeout(r, 100));

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
        filename:     `bill-${bill.customer_name}-${bill.event_date}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'], avoid: ['tr', '.karyalay-package', '.deposits-section'] }
      };

      await window.html2pdf().from(element).set(opt).save();
      
      setIsExporting(false);
      toast.success(t('PDF downloaded!', 'PDF डाऊनलोड झाले!'));
    } catch (e) {
      console.error("PDF generation error:", e);
      setIsExporting(false);
      toast.error(t('Error generating PDF', 'PDF तयार करताना एरर'));
    }
  };

  const handleShareBill = async (bill) => {
    // Generate PDF blob for sharing
    const doc = new jsPDF();

    // Header
    doc.setFillColor(128, 0, 0); // Maroon
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(bill.hall_name.toUpperCase(), 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('FINAL INVOICE', 105, 30, { align: 'center' });

    // Customer Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Customer: ${bill.customer_name}`, 14, 50);
    doc.text(`City: ${bill.customer_city}`, 14, 56);
    doc.text(`Event Date: ${bill.event_date}`, 14, 62);

    const eventTypeMap = {
      'लग्न': 'Wedding',
      'साखरपुडा': 'Engagement',
      'सभा (मीटिंग)': 'Meeting',
      'वाढदिवस': 'Birthday',
      'इतर': 'Other'
    };
    const eventTypeDisplay = eventTypeMap[bill.event_type] || bill.event_type;

    doc.setFontSize(9);
    doc.text(`Invoice: #BILL-${bill.id.substring(0, 6).toUpperCase()}`, 196, 50, { align: 'right' });
    doc.text(`Event: ${eventTypeDisplay}`, 196, 56, { align: 'right' });
    doc.text(`Guests: ${bill.num_guests}`, 196, 62, { align: 'right' });

    // Main Bill Table
    const billItems = [
      [t('Hall Rent', 'हॉल भाडे'), 1, `Rs. ${bill.hall_rent.toLocaleString()}`, `Rs. ${bill.hall_rent.toLocaleString()}`]
    ];

    if (bill.custom_charges) {
      bill.custom_charges.forEach(c => {
        billItems.push([language === 'en' ? c.label : c.label_mr, 1, `Rs. ${c.amount.toLocaleString()}`, `Rs. ${c.amount.toLocaleString()}`]);
      });
    }

    bill.services.forEach(s => {
      billItems.push([language === 'en' ? s.name : s.name_mr, s.quantity, `Rs. ${s.price.toLocaleString()}`, `Rs. ${(s.price * s.quantity).toLocaleString()}`]);
    });

    // Thali Package as a single grouped row
    const thaliPricePerPlate2 = parseInt(bill.thali_price_per_plate) || 0;
    const thaliTotalPlates2 = parseInt(bill.thali_total_plates) || 0;
    const thaliTotal2 = thaliPricePerPlate2 * thaliTotalPlates2;
    if (thaliTotal2 > 0 || (bill.thali_items && bill.thali_items.length > 0)) {
      const menuNames2 = (bill.thali_items || []).map(item => item.name).filter(Boolean).join(', ');
      const thaliLabel2 = menuNames2 ? `Thali Package (${menuNames2})` : 'Thali Package';
      billItems.push([thaliLabel2, thaliTotalPlates2 || '-', `Rs. ${thaliPricePerPlate2.toLocaleString()}`, `Rs. ${thaliTotal2.toLocaleString()}`]);
    }

    doc.autoTable({
      startY: 75,
      head: [['Description', 'Qty', 'Rate', 'Amount']],
      body: billItems,
      headStyles: { fillColor: [128, 0, 0] },
      theme: 'grid'
    });

    let finalY = doc.lastAutoTable.finalY + 10;

    // Financials
    doc.setFontSize(10);
    doc.text(`Subtotal: Rs. ${bill.total_amount.toLocaleString()}`, 196, finalY, { align: 'right' });
    if (bill.discount > 0) {
      doc.text(`Discount: -Rs. ${bill.discount.toLocaleString()}`, 196, finalY + 7, { align: 'right' });
      finalY += 7;
    }
    if (bill.pre_booking_amount > 0) {
      doc.text(`Pre-Booking: Rs. ${bill.pre_booking_amount.toLocaleString()}`, 196, finalY + 7, { align: 'right' });
      finalY += 7;
    }

    doc.setFontSize(14);
    doc.setTextColor(128, 0, 0);
    doc.text(`Balance Due: Rs. ${bill.balance_due.toLocaleString()}`, 196, finalY + 15, { align: 'right' });

    // Deposits Table
    if (bill.deposits && bill.deposits.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text('Payment History:', 14, finalY + 30);

      const depData = bill.deposits.map(d => [
        new Date(d.timestamp).toLocaleDateString(),
        d.paymentMode,
        d.description || '-',
        `Rs. ${d.amount.toLocaleString()}`
      ]);

      doc.autoTable({
        startY: finalY + 35,
        head: [['Date', 'Mode', 'Description', 'Amount']],
        body: depData,
        headStyles: { fillColor: [50, 50, 50] },
        styles: { fontSize: 8 }
      });
    }

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `Bill_${bill.customer_name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });

    try {
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile]
        });
      } else if (navigator.share) {
        await navigator.share({
          title: `Bill - ${bill.customer_name}`,
          text: `Bill Summary - ${bill.customer_name}\nBalance Due: Rs. ${bill.balance_due.toLocaleString()}`
        });
      } else {
        const shareText = `Bill Summary - ${bill.customer_name}\nBalance Due: Rs. ${bill.balance_due.toLocaleString()}`;
        await navigator.clipboard.writeText(shareText);
        toast.success(t('Summary copied to clipboard!', 'सारांश क्लिपबोर्डवर सुरक्षित केला!'));
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
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
                  <th className="px-6 py-3 text-left">{t('Created At', 'तैयार केल्याची तारीख')}</th>
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
                      <td className="px-6 py-4 text-xs">
                        {bill.created_at ? new Date(bill.created_at).toLocaleDateString(language === 'en' ? 'en-IN' : 'mr-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-6 py-4">{bill.event_date}</td>
                      <td className="px-6 py-4">{bill.event_type}</td>
                      <td className="px-6 py-4 text-right font-semibold">₹{bill.total_amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-semibold ${bill.balance_due > 0 ? 'text-red-600' : 'text-green-600'
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
                            onClick={() => navigate(`/admin/bills/edit/${bill.id}`)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title={t('Edit Bill', 'बिल संपादित करा')}
                            data-testid={`edit-bill-${bill.id}`}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteBill(bill.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              {/* Add CSS for hiding elements in PDF */}
              <style>{`
                .exporting-pdf .no-print { display: none !important; }
              `}</style>
              <div ref={billPreviewRef} className="border-4 border-[#800000] p-6 bg-white">
                <div className="flex items-center justify-center gap-6 mb-6">
                  {halls.find(h => h.id === selectedBill.hall_id)?.logo && (
                    <img src={halls.find(h => h.id === selectedBill.hall_id).logo} alt="Logo" className="h-16 object-contain" />
                  )}
                  <div className="text-left">
                    <h2 className="playfair text-2xl font-bold maroon-text leading-tight">{selectedBill.hall_name}</h2>
                    <p className="text-base text-gray-600 font-medium">{t('Invoice', 'बिल')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                  <div>
                    <p><strong>{t('Customer Name:', 'ग्राहक नाव:')}</strong> {selectedBill.customer_name}</p>
                    <p><strong>{t('City:', 'शहर:')}</strong> {selectedBill.customer_city}</p>
                    <p><strong>{t('Guests:', 'पाहुणे:')}</strong> {selectedBill.num_guests}</p>
                    <p><strong>{t('Event Type:', 'कार्यक्रम:')}</strong> {selectedBill.event_type}</p>
                  </div>
                  <div>
                    {selectedBill.arrival_date && <p><strong>{t('Arrival:', 'हॉलमध्ये आगमन:')}</strong> {selectedBill.arrival_date} (06:00 PM)</p>}
                    {selectedBill.departure_date && <p><strong>{t('Departure:', 'हॉलमधून प्रस्थान:')}</strong> {selectedBill.departure_date}</p>}
                    <p><strong>{t('Event Date:', 'कार्यक्रम तारीख:')}</strong> {selectedBill.event_date}</p>
                    <p><strong>{t('Booking Date:', 'बुकिंग तारीख:')}</strong> {selectedBill.booking_date}</p>
                  </div>
                </div>

                <div className="mb-6 p-4 bg-gray-50 border rounded-lg karyalay-package">
                  <h3 className="font-bold maroon-text mb-2 border-b-2 border-[#D4AF37] inline-block text-sm">{t('Karyalay Package', 'कार्यालय पॅकेज')}</h3>
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
                      <li>Cooking utensils</li>
                    </ul>
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
                      <td className="border p-2 text-right">₹{Number(selectedBill.hall_rent || 0).toLocaleString()}</td>
                      <td className="border p-2 text-right">₹{Number(selectedBill.hall_rent || 0).toLocaleString()}</td>
                    </tr>
                    {selectedBill.custom_charges && selectedBill.custom_charges.length > 0 && selectedBill.custom_charges.map((charge, idx) => (
                      <tr key={`charge-${idx}`}>
                        <td className="border p-2">{language === 'en' ? charge.label : charge.label_mr} {charge.isImported && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded ml-1 font-bold">EVENT MGMT</span>}</td>
                        <td className="border p-2 text-right">1</td>
                        <td className="border p-2 text-right">₹{Number(charge.amount || 0).toLocaleString()}</td>
                        <td className="border p-2 text-right">₹{Number(charge.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                    
                    {/* Other Services */}
                    {selectedBill.services.filter(s => !s.isImported).length > 0 && (
                      <>
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="border p-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">{t('Other Services', 'इतर सेवा')}</td>
                        </tr>
                        {selectedBill.services.filter(s => !s.isImported).map((service, idx) => (
                          <tr key={`reg-${idx}`}>
                            <td className="border p-2">{language === 'en' ? service.name : service.name_mr}</td>
                            <td className="border p-2 text-right">{service.quantity}</td>
                            <td className="border p-2 text-right">₹{service.price.toLocaleString()}</td>
                            <td className="border p-2 text-right">₹{(service.price * service.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    {/* Event Mgmt Services */}
                    {selectedBill.services.filter(s => s.isImported).length > 0 && (
                      <>
                        <tr className="bg-blue-50/30">
                          <td colSpan={4} className="border p-2 font-semibold text-xs text-blue-600 uppercase tracking-wider">{t('Event Management Services', 'इव्हेंट मॅनेजमेंट सेवा')}</td>
                        </tr>
                        {selectedBill.services.filter(s => s.isImported).map((service, idx) => (
                          <tr key={`imp-${idx}`}>
                            <td className="border p-2">{language === 'en' ? service.name : service.name_mr}</td>
                            <td className="border p-2 text-right">{service.quantity}</td>
                            <td className="border p-2 text-right">₹{service.price.toLocaleString()}</td>
                            <td className="border p-2 text-right">₹{(service.price * service.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </>
                    )}
                    {/* Thali Package - grouped display */}
                    {((parseInt(selectedBill.thali_price_per_plate) > 0 && parseInt(selectedBill.thali_total_plates) > 0) || (selectedBill.thali_items && selectedBill.thali_items.length > 0)) && (
                      <>
                        <tr className="bg-gray-50">
                          <td className="border p-2 font-bold" colSpan={4}>
                            {t('Thali Package', 'थाळी पॅकेज')}
                          </td>
                        </tr>
                        <tr>
                          <td className="border p-2 pl-4">
                            {t('Price per plate', 'किंमत प्रति ताट')}
                            {selectedBill.thali_items && selectedBill.thali_items.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {t('Includes: ', 'समाविष्ट: ')}
                                {selectedBill.thali_items.map(item => (language === 'en' ? item.name : (item.name_mr || item.name))).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="border p-2 text-right">{selectedBill.thali_total_plates || '-'}</td>
                          <td className="border p-2 text-right">₹{(parseInt(selectedBill.thali_price_per_plate) || 0).toLocaleString()}</td>
                          <td className="border p-2 text-right">₹{((parseInt(selectedBill.thali_price_per_plate) || 0) * (parseInt(selectedBill.thali_total_plates) || 0)).toLocaleString()}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                <div className="text-right space-y-2">
                  {Number(selectedBill.discount) > 0 && (
                    <p><strong>{t('Discount:', 'सूट:')}</strong> -₹{Number(selectedBill.discount || 0).toLocaleString()}</p>
                  )}
                  <p className="text-lg"><strong>{t('Total:', 'कुल:')}</strong> ₹{Number(selectedBill.total_amount || 0).toLocaleString()}</p>
                  {Number(selectedBill.pre_booking_amount) > 0 && (
                    <p><strong>{t('Pre-Booking:', 'पूर्व बुकिंग:')}</strong> ₹{Number(selectedBill.pre_booking_amount || 0).toLocaleString()}</p>
                  )}
                  <p className="text-xl font-bold maroon-text">
                    <strong>{t('Balance Due:', 'उर्वरित रक्कम:')} </strong> ₹{Number((selectedBill.total_amount || 0) - (selectedBill.pre_booking_amount || 0) - (selectedBill.deposits || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)).toLocaleString()}
                  </p>
                </div>

                {/* Deposits Section */}
                <div className="mt-8 border-t pt-6 deposits-section">
                  <h3 className="playfair text-xl font-bold maroon-text mb-4">{t('Deposits History', 'ठेवींचा इतिहास')}</h3>
                  {!isExporting && (
                    <div className="bg-gray-50 p-4 rounded-xl mb-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Amount', 'रक्कम')}</label>
                          <input
                            type="number"
                            value={newDeposit.amount}
                            onChange={(e) => setNewDeposit({ ...newDeposit, amount: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Mode', 'पद्धत')}</label>
                          <div className="flex gap-2">
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="radio"
                                name="mode"
                                value="cash"
                                checked={newDeposit.paymentMode === 'cash'}
                                onChange={(e) => setNewDeposit({ ...newDeposit, paymentMode: e.target.value })}
                              />
                              {t('Cash', 'रोख')}
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                              <input
                                type="radio"
                                name="mode"
                                value="online"
                                checked={newDeposit.paymentMode === 'online'}
                                onChange={(e) => setNewDeposit({ ...newDeposit, paymentMode: e.target.value })}
                              />
                              {t('Online', 'ऑनलाईन')}
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">{t('Desc', 'वर्णन')}</label>
                          <input
                            type="text"
                            value={newDeposit.description}
                            onChange={(e) => setNewDeposit({ ...newDeposit, description: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                        <button
                          onClick={async () => {
                            if (!newDeposit.amount || parseFloat(newDeposit.amount) <= 0) {
                              toast.error(t('Please enter valid amount', 'कृपया वैध रक्कम प्रविष्ट करा'));
                              return;
                            }
                            const deposit = {
                              ...newDeposit,
                              amount: parseFloat(newDeposit.amount),
                              timestamp: new Date(newDeposit.timestamp).toISOString()
                            };
                            const newDeposits = [...(selectedBill.deposits || []), deposit];
                            const depositsSum = newDeposits.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
                            const updatedBill = {
                              ...selectedBill,
                              deposits: newDeposits,
                              balance_due: selectedBill.total_amount - (selectedBill.pre_booking_amount || 0) - depositsSum
                            };
                            try {
                              await axios.put(`${API}/bills/${selectedBill.id}`, updatedBill, getAuthHeaders());
                              toast.success(t('Added!', 'जोडले!'));
                              setSelectedBill(updatedBill);
                              fetchBills();
                              setNewDeposit({ amount: '', paymentMode: 'cash', description: '', timestamp: new Date().toISOString().split('T')[0] });
                            } catch (err) {
                              toast.error(t('Error', 'त्रुटी'));
                            }
                          }}
                          className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#B8941F] mb-0.5 whitespace-nowrap"
                        >
                          {t('Add', 'जोडा')}
                        </button>
                      </div>
                    </div>
                  )}

                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-2 text-left">{t('Date', 'तारीख')}</th>
                        <th className="border p-2 text-left">{t('Mode', 'पद्धत')}</th>
                        <th className="border p-2 text-left">{t('Desc', 'वर्णन')}</th>
                        <th className="border p-2 text-right">{t('Amount', 'रक्कम')}</th>
                        {!isExporting && <th className="border p-2 text-center">{t('Act', 'क्रिया')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.deposits?.length > 0 ? (
                        selectedBill.deposits.map((dep, midx) => (
                          <tr key={midx}>
                            <td className="border p-2">{new Date(dep.timestamp).toLocaleDateString()}</td>
                            <td className="border p-2">{t(dep.paymentMode, dep.paymentMode === 'cash' ? 'रोख' : 'ऑनलाईन')}</td>
                            <td className="border p-2">{dep.description || '-'}</td>
                            <td className="border p-2 text-right font-bold">₹{dep.amount.toLocaleString()}</td>
                            {!isExporting && (
                              <td className="border p-2 text-center text-red-500 cursor-pointer" onClick={async () => {
                                if (window.confirm(t('Are you sure?', 'तुम्हाला खात्री आहे?'))) {
                                  const newDeposits = selectedBill.deposits.filter((_, i) => i !== midx);
                                  const depositsSum = newDeposits.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
                                  const updatedBill = {
                                    ...selectedBill,
                                    deposits: newDeposits,
                                    balance_due: selectedBill.total_amount - (selectedBill.pre_booking_amount || 0) - depositsSum
                                  };
                                  try {
                                    await axios.put(`${API}/bills/${selectedBill.id}`, updatedBill, getAuthHeaders());
                                    setSelectedBill(updatedBill);
                                    fetchBills();
                                    toast.success(t('Deleted', 'काढून टाकले'));
                                  } catch (e) { toast.error('Error'); }
                                }
                              }}>🗑️</td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isExporting ? 4 : 5} className="border p-4 text-center text-gray-400">{t('No deposits yet', 'अद्याप एकही ठेव नाही')}</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={4} className="border p-2 text-right">{t('Total Paid:', 'एकूण भरलेले:')}</td>
                        <td className="border p-2 text-right">₹{(selectedBill.deposits || []).reduce((s, d) => s + (parseFloat(d.amount) || 0), 0).toLocaleString()}</td>
                        {!isExporting && <td className="border p-2"></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                <button
                  onClick={() => window.print()}
                  className="py-3 flex items-center justify-center gap-2 border-2 border-[#800000] text-[#800000] rounded-xl hover:bg-gray-50 transition-all font-bold"
                >
                  <Printer size={18} /> {t('Print', 'प्रिंट')}
                </button>
                <button
                  onClick={() => handleDownloadSingleBillPDF(selectedBill)}
                  className="py-3 flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-bold"
                >
                  <Download size={18} /> {t('PDF', 'पी़डीएफ')}
                </button>
                <button
                  onClick={() => handleShareBill(selectedBill)}
                  className="py-3 flex items-center justify-center gap-2 border-2 border-green-600 text-green-600 rounded-xl hover:bg-green-50 transition-all font-bold"
                >
                  <Share2 size={18} /> {t('Share', 'शेअर')}
                </button>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="py-3 bg-[#800000] text-white rounded-xl hover:bg-[#600000] transition-all font-bold"
                >
                  {t('Close', 'बंद करा')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout >
  );
};

export default OlderBookings;