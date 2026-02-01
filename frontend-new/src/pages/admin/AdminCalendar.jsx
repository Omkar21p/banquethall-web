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
  const { getAuthHeaders } = useAuth();
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
      if (response.data.length > 0) {
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

  const getDayClassName = (date) => {
    if (isDateBooked(date)) {
      return 'bg-red-500 text-white rounded-full';
    }
    if (isDateShubh(date)) {
      return 'bg-[#D4AF37] text-white rounded-full font-bold';
    }
    return '';
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
  const getDayClassName = (date) => {
    const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);

            if (isDateBooked(date)) {
      return 'bg-red-500 text-white rounded-full hover:bg-red-600';
    }
            if (isDateShubh(date)) {
      return 'bg-[#D4AF37] text-white rounded-full font-bold hover:bg-[#B4941F]';
    }
            if (checkDate.getTime() === today.getTime()) {
      return 'bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600';
    }
            return 'hover:bg-gray-100 rounded-full';
  };

  const getHighlightDates = () => {
    // ... existing logic if any, or remove if unused ...
    return [];
  };

            // ...

            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              inline
              dayClassName={getDayClassName}
              minDate={null} /* Allow admins to see all past dates */
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
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{t('Completed', 'पूर्ण झाले')}</span>
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
    </AdminLayout>
  );
};

export default AdminCalendar;