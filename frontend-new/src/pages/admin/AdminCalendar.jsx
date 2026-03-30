import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminCalendar = () => {
  const navigate = useNavigate();
  const { getAuthHeaders, admin } = useAuth();
  const { language, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [shubhDates, setShubhDates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAddShubh, setShowAddShubh] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [showPastBookings, setShowPastBookings] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [popupDate, setPopupDate] = useState(null);
  const [shubhForm, setShubhForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    occasion: '',
    occasion_mr: ''
  });
  const [bookingForm, setBookingForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    customer_name: '',
    customer_city: '',
    customer_phone: '',
    event_type: 'लग्न',
    num_guests: '',
    booking_taken_by: ''
  });

  useEffect(() => {
    fetchHalls();
  }, []);

  useEffect(() => {
    if (selectedHall) {
      fetchShubhDates();
      fetchBookings();
    }
  }, [selectedHall]);

  const fetchHalls = async () => {
    try {
      const response = await axios.get(`${API}/halls`);
      setHalls(response.data);
      // Default to admin's hall
      if (admin?.hall_name) {
        const adminHallName = admin.hall_name.toLowerCase();
        const adminHall = response.data.find(h => {
          const hallName = h.name.toLowerCase();
          return hallName === adminHallName || hallName.includes(adminHallName) || adminHallName.includes(hallName);
        });
        if (adminHall) {
          setSelectedHall(adminHall.id);
        } else if (response.data.length > 0) {
          setSelectedHall(response.data[0].id);
        }
      } else if (response.data.length > 0) {
        setSelectedHall(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching halls:', error);
    }
  };

  const fetchShubhDates = async () => {
    try {
      const response = await axios.get(`${API}/shubh-dates?hall_id=${selectedHall}`);
      setShubhDates(response.data);
    } catch (error) {
      console.error('Error fetching shubh dates:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings?hall_id=${selectedHall}`, getAuthHeaders());
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleAddShubhDate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/shubh-dates`,
        { ...shubhForm, hall_id: selectedHall },
        getAuthHeaders()
      );
      toast.success(t('Shubh date added!', 'शुभ तारीख जोडली!'));
      setShubhForm({ date: format(new Date(), 'yyyy-MM-dd'), occasion: '', occasion_mr: '' });
      setShowAddShubh(false);
      fetchShubhDates();
    } catch (error) {
      toast.error(t('Error adding shubh date', 'शुभ तारीख जोडताना एरर'));
    }
  };

  const handleDeleteShubhDate = async (id) => {
    try {
      await axios.delete(`${API}/shubh-dates/${id}`, getAuthHeaders());
      toast.success(t('Shubh date deleted!', 'शुभ तारीख डिलीट झाली!'));
      fetchShubhDates();
    } catch (error) {
      toast.error(t('Error deleting shubh date', 'शुभ तारीख डिलीट करताना एरर'));
    }
  };

  const handleAddBooking = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...bookingForm,
        hall_id: selectedHall,
        num_guests: parseInt(bookingForm.num_guests)
      };

      if (editingBooking) {
        await axios.put(`${API}/bookings/${editingBooking}`, payload, getAuthHeaders());
        toast.success(t('Booking updated!', 'बुकिंग अपडेट झाली!'));
      } else {
        await axios.post(`${API}/bookings`, payload, getAuthHeaders());
        toast.success(t('Booking added!', 'बुकिंग जोडली!'));
      }

      setBookingForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        customer_name: '',
        customer_city: '',
        customer_phone: '',
        event_type: 'लग्न',
        num_guests: ''
      });
      setEditingBooking(null);
      setShowAddBooking(false);
      fetchBookings();
    } catch (error) {
      toast.error(t('Error saving booking', 'बुकिंग जतन करताना एरर'));
    }
  };

  const handleEditBooking = (booking) => {
    setBookingForm({
      date: booking.date,
      customer_name: booking.customer_name,
      customer_city: booking.customer_city,
      customer_phone: booking.customer_phone,
      event_type: booking.event_type,
      num_guests: booking.num_guests.toString(),
      booking_taken_by: booking.booking_taken_by || ''
    });
    setEditingBooking(booking.id);
    setShowAddBooking(true);
  };

  const handleDeleteBooking = async (id) => {
    if (!window.confirm(t('Delete this booking?', 'ही बुकिंग डिलीट करायची?'))) return;

    try {
      await axios.delete(`${API}/bookings/${id}`, getAuthHeaders());
      toast.success(t('Booking deleted!', 'बुकिंग डिलीट झाली!'));
      fetchBookings();
    } catch (error) {
      toast.error(t('Error deleting booking', 'बुकिंग डिलीट करताना एरर'));
    }
  };

  const isDateShubh = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shubhDates.some(sd => sd.date === dateStr);
  };

  const isDateBooked = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(b => b.date === dateStr);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const getDayClassName = (date) => {
    // Strict priority order — highest wins, no overrides allowed
    if (isDateBooked(date)) return 'date-booked';
    if (isToday(date)) return 'date-today';
    if (isDateShubh(date)) return 'date-shubh';
    return '';
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setPopupDate(date);
    setShowDatePopup(true);
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.filter(b => b.date === dateStr);
  };

  const getShubhForDate = (date) => {
    if (!date) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return shubhDates.filter(sd => sd.date === dateStr);
  };

  const handlePopupAddBooking = () => {
    const dateStr = format(popupDate, 'yyyy-MM-dd');
    setBookingForm({
      date: dateStr,
      customer_name: '',
      customer_city: '',
      customer_phone: '',
      event_type: 'लग्न',
      num_guests: '',
      booking_taken_by: ''
    });
    setEditingBooking(null);
    setShowAddBooking(true);
    setShowDatePopup(false);
  };

  const handlePopupAddShubh = () => {
    const dateStr = format(popupDate, 'yyyy-MM-dd');
    setShubhForm({
      date: dateStr,
      occasion: '',
      occasion_mr: ''
    });
    setShowAddShubh(true);
    setShowDatePopup(false);
  };

  const handlePopupEditBooking = (booking) => {
    handleEditBooking(booking);
    setShowDatePopup(false);
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddShubh(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-white rounded-full hover:bg-[#B8941F] transition-all"
              data-testid="add-shubh-date-btn"
            >
              <Plus size={20} />
              {t('Add Shubh Date', 'शुभ तारीख जोडा')}
            </button>
            <button
              onClick={() => navigate('/admin/bills')}
              className="flex items-center gap-2 px-4 py-2 border-2 border-[#800000] text-[#800000] rounded-full hover:bg-gray-50 transition-all"
            >
              <FileText size={20} />
              {t('View Records', 'रेकॉर्ड्स पहा')}
            </button>
            <button
              onClick={() => setShowAddBooking(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000] transition-all"
              data-testid="add-booking-btn"
            >
              <Plus size={20} />
              {t('Add Booking', 'बुकिंग जोडा')}
            </button>
          </div>
        </div>

        {showAddShubh && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="playfair text-xl font-bold maroon-text mb-4">
              {t('Add Shubh Muhurt Date', 'शुभ मुहूर्त तारीख जोडा')}
            </h3>
            <form onSubmit={handleAddShubhDate} className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Date', 'तारीख')}</label>
                <input
                  type="date"
                  value={shubhForm.date}
                  onChange={(e) => setShubhForm({ ...shubhForm, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="shubh-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Occasion (English)', 'प्रसंग (इंग्रजी)')}</label>
                <input
                  type="text"
                  value={shubhForm.occasion}
                  onChange={(e) => setShubhForm({ ...shubhForm, occasion: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Akshaya Tritiya"
                  required
                  data-testid="shubh-occasion-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Occasion (Marathi)', 'प्रसंग (मराठी)')}</label>
                <input
                  type="text"
                  value={shubhForm.occasion_mr}
                  onChange={(e) => setShubhForm({ ...shubhForm, occasion_mr: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg marathi-text"
                  placeholder="उदा., अक्षय तृतीया"
                  required
                  data-testid="shubh-occasion-mr-input"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000]"
                  data-testid="save-shubh-btn"
                >
                  {t('Save', 'जतन करा')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddShubh(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  {t('Cancel', 'रद्द करा')}
                </button>
              </div>
            </form>
          </div>
        )}

        {showAddBooking && (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="playfair text-xl font-bold maroon-text mb-4">
              {editingBooking ? t('Edit Booking', 'बुकिंग संपादित करा') : t('Add New Booking', 'नवीन बुकिंग जोडा')}
            </h3>
            <form onSubmit={handleAddBooking} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Event Date', 'कार्यक्रम तारीख')}</label>
                <input
                  type="date"
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="booking-date-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Customer Name', 'ग्राहक नाव')}</label>
                <input
                  type="text"
                  value={bookingForm.customer_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, customer_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('City', 'शहर')}</label>
                <input
                  type="text"
                  value={bookingForm.customer_city}
                  onChange={(e) => setBookingForm({ ...bookingForm, customer_city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="customer-city-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Date of Booking', 'बुकिंग केल्याची तारीख')}</label>
                <input
                  type="date"
                  value={bookingForm.booking_date || ''}
                  onChange={(e) => setBookingForm({ ...bookingForm, booking_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  data-testid="booking-date-timestamp-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Phone', 'फोन')}</label>
                <input
                  type="tel"
                  value={bookingForm.customer_phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, customer_phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="customer-phone-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Event Type', 'कार्यक्रम प्रकार')}</label>
                <select
                  value={bookingForm.event_type}
                  onChange={(e) => setBookingForm({ ...bookingForm, event_type: e.target.value })}
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
                <label className="block text-sm font-semibold mb-1">{t('Number of Guests', 'पाहुण्यांची संख्या')}</label>
                <input
                  type="number"
                  value={bookingForm.num_guests}
                  onChange={(e) => setBookingForm({ ...bookingForm, num_guests: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  data-testid="num-guests-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t('Booking Taken By', 'बुकिंग घेतले')}</label>
                <input
                  type="text"
                  value={bookingForm.booking_taken_by}
                  onChange={(e) => setBookingForm({ ...bookingForm, booking_taken_by: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder={t('Admin name', 'प्रशासक नाव')}
                  data-testid="booking-taken-by-input"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000]"
                  data-testid="save-booking-btn"
                >
                  {t('Save', 'जतन करा')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBooking(false);
                    setEditingBooking(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  {t('Cancel', 'रद्द करा')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md calendar-container">
            <h3 className="playfair text-xl font-bold maroon-text mb-4">{t('Calendar', 'कॅलेंडर')}</h3>
            <DatePicker
              selected={selectedDate}
              onChange={handleDateClick}
              inline
              dayClassName={getDayClassName}
              minDate={null}
              showDisabledMonthNavigation
              calendarClassName="w-full text-lg"
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="playfair text-xl font-bold maroon-text mb-4">
                {t('Shubh Muhurt Dates', 'शुभ मुहूर्त तारखा')}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shubhDates.map((sd) => (
                  <div key={sd.id} className="flex justify-between items-center p-3 bg-[#FDFBF7] rounded-lg" data-testid={`shubh-${sd.id}`}>
                    <div>
                      <p className="font-semibold">{sd.date}</p>
                      <p className="text-sm text-gray-600">
                        {language === 'en' ? sd.occasion : sd.occasion_mr}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteShubhDate(sd.id)}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`delete-shubh-${sd.id}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="playfair text-xl font-bold maroon-text mb-4">
                {t('Upcoming Bookings', 'येणारी बुकिंग')}
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {bookings.filter(b => new Date(b.date) >= new Date().setHours(0, 0, 0, 0)).sort((a, b) => new Date(a.date) - new Date(b.date)).map((booking) => (
                  <div key={booking.id} className="p-3 bg-[#FDFBF7] rounded-lg border-l-4 border-green-500" data-testid={`booking-${booking.id}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{booking.customer_name}</p>
                        <p className="text-sm text-gray-600">{booking.date} - {booking.event_type}</p>
                        <p className="text-sm text-gray-600">{booking.num_guests} {t('guests', 'पाहुणे')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditBooking(booking)}
                          className="text-[#D4AF37] hover:text-[#B8941F]"
                          data-testid={`edit-booking-${booking.id}`}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`delete-booking-${booking.id}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {bookings.filter(b => new Date(b.date) >= new Date().setHours(0, 0, 0, 0)).length === 0 && (
                  <p className="text-gray-500 text-sm italic">{t('No upcoming bookings.', 'कोणतेही आगामी बुकिंग नाही.')}</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <button
                onClick={() => setShowPastBookings(!showPastBookings)}
                className="w-full flex justify-between items-center playfair text-xl font-bold maroon-text mb-2 focus:outline-none"
              >
                <span>{t('Past Bookings', 'जुनी बुकिंग')} (Events Completed)</span>
                <span>{showPastBookings ? '−' : '+'}</span>
              </button>

              {showPastBookings && (
                <div className="space-y-2 max-h-48 overflow-y-auto mt-4 transition-all" data-testid="past-bookings-list">
                  {bookings.filter(b => new Date(b.date) < new Date().setHours(0, 0, 0, 0)).sort((a, b) => new Date(b.date) - new Date(a.date)).map((booking) => (
                    <div key={booking.id} className="p-3 bg-gray-50 rounded-lg border-l-4 border-gray-400" data-testid={`past-booking-${booking.id}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-700">{booking.customer_name}</p>
                          <p className="text-sm text-gray-500">{booking.date} - {booking.event_type}</p>
                          <p className="text-sm text-gray-500">{booking.num_guests} {t('guests', 'पाहुणे')}</p>
                          {booking.customer_city && (
                            <p className="text-xs text-gray-400">{booking.customer_city}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{t('Completed', 'पूर्ण झाले')}</span>
                          <button
                            onClick={() => handleEditBooking(booking)}
                            className="text-[#D4AF37] hover:text-[#B8941F]"
                            title={t('Edit Booking', 'बुकिंग संपादित करा')}
                            data-testid={`edit-past-booking-${booking.id}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="text-red-500 hover:text-red-700"
                            title={t('Delete Booking', 'बुकिंग डिलीट करा')}
                            data-testid={`delete-past-booking-${booking.id}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {bookings.filter(b => new Date(b.date) < new Date().setHours(0, 0, 0, 0)).length === 0 && (
                    <p className="text-gray-500 text-sm italic">{t('No past bookings.', 'कोणतीही जुनी बुकिंग नाही.')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Date Click Popup */}
      {showDatePopup && popupDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDatePopup(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <h3 className="playfair text-2xl font-bold maroon-text">
                {format(popupDate, 'dd MMMM yyyy')}
              </h3>
              <div className="flex justify-center gap-2 mt-2">
                {isDateBooked(popupDate) && (
                  <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-semibold">{t('Booked', 'बुक केले')}</span>
                )}
                {isDateShubh(popupDate) && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-semibold">{t('Shubh Muhurt', 'शुभ मुहूर्त')}</span>
                )}
                {isToday(popupDate) && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">{t('Today', 'आज')}</span>
                )}
              </div>
            </div>

            {/* Existing bookings for this date */}
            {getBookingsForDate(popupDate).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-600 mb-2">{t('Bookings on this date:', 'या तारखेची बुकिंग:')}</h4>
                {getBookingsForDate(popupDate).map(booking => (
                  <div key={booking.id} className="p-3 bg-red-50 rounded-lg mb-2 border-l-4 border-red-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{booking.customer_name}</p>
                        <p className="text-sm text-gray-600">{booking.event_type} • {booking.num_guests} {t('guests', 'पाहुणे')}</p>
                        {booking.customer_city && <p className="text-xs text-gray-500">{booking.customer_city}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePopupEditBooking(booking)}
                          className="text-[#D4AF37] hover:text-[#B8941F] p-1"
                          title={t('Edit', 'संपादित करा')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => { handleDeleteBooking(booking.id); setShowDatePopup(false); }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title={t('Delete', 'डिलीट करा')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Existing shubh dates for this date */}
            {getShubhForDate(popupDate).length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-bold text-gray-600 mb-2">{t('Shubh Muhurt:', 'शुभ मुहूर्त:')}</h4>
                {getShubhForDate(popupDate).map(sd => (
                  <div key={sd.id} className="p-3 bg-yellow-50 rounded-lg mb-2 border-l-4 border-[#D4AF37] flex justify-between items-center">
                    <p className="font-medium text-sm">{language === 'en' ? sd.occasion : sd.occasion_mr}</p>
                    <button
                      onClick={() => { handleDeleteShubhDate(sd.id); setShowDatePopup(false); }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={handlePopupAddBooking}
                className="flex items-center justify-center gap-2 py-3 bg-[#800000] text-white rounded-xl hover:bg-[#600000] transition-all font-bold text-sm"
              >
                <Plus size={18} />
                {t('Add Booking', 'बुकिंग जोडा')}
              </button>
              <button
                onClick={handlePopupAddShubh}
                className="flex items-center justify-center gap-2 py-3 bg-[#D4AF37] text-white rounded-xl hover:bg-[#B8941F] transition-all font-bold text-sm"
              >
                <Plus size={18} />
                {t('Add Shubh Date', 'शुभ तारीख जोडा')}
              </button>
            </div>

            <button
              onClick={() => setShowDatePopup(false)}
              className="w-full mt-3 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-600 font-medium text-sm"
            >
              {t('Close', 'बंद करा')}
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCalendar;