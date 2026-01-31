import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, Calendar, Globe } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DateBookingPage = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  const [halls, setHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState('');
  const [shubhDates, setShubhDates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
      const response = await axios.get(`${API}/public/bookings?hall_id=${selectedHall}`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const isDateShubh = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shubhDates.some(sd => sd.date === dateStr);
  };

  const isDateBooked = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.some(b => b.date === dateStr && b.status === 'booked');
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

  const selectedHallData = halls.find(h => h.id === selectedHall);

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <nav className="bg-white shadow-md fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-[#800000] hover:text-[#600000]" data-testid="back-btn">
                <ArrowLeft size={24} />
              </button>
              <h1 className="playfair text-2xl font-bold maroon-text">
                {t('Check Availability', 'उपलब्धता तपासा')}
              </h1>
            </div>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#D4AF37] text-[#800000] hover:bg-[#D4AF37] hover:text-white transition-all"
              data-testid="language-toggle-btn"
            >
              <Globe size={20} />
              {language === 'en' ? 'मराठी' : 'English'}
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <label className="block text-lg font-semibold maroon-text mb-2">
              {t('Select Banquet Hall:', 'बॅन्क्वेट हॉल निवडा:')}
            </label>
            <select
              value={selectedHall}
              onChange={(e) => setSelectedHall(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
              data-testid="hall-select"
            >
              {halls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {language === 'en' ? hall.name : hall.name_mr}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="playfair text-2xl font-bold maroon-text mb-4 flex items-center gap-2">
                <Calendar size={24} />
                {t('Calendar', 'कॅलेंडर')}
              </h3>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                inline
                dayClassName={getDayClassName}
                minDate={new Date()}
                data-testid="date-picker"
              />
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h4 className="playfair text-xl font-bold maroon-text mb-4">
                  {t('Legend', 'लीजंड')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#D4AF37] rounded-full"></div>
                    <span>{t('Shubh Muhurt (Available)', 'शुभ मुहूर्त (उपलब्ध)')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                    <span>{t('Booked', 'बुक केलेले')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded-full"></div>
                    <span>{t('Regular Day', 'सामान्य दिवस')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <h4 className="playfair text-xl font-bold maroon-text mb-4">
                  {t('Shubh Muhurt Dates', 'शुभ मुहूर्त तारखा')}
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {shubhDates.length === 0 ? (
                    <p className="text-gray-500">
                      {t('No shubh muhurt dates marked yet.', 'अद्याप कोणत्याही शुभ मुहूर्त तारखा नाहीत.')}
                    </p>
                  ) : (
                    shubhDates.map((sd) => (
                      <div key={sd.id} className="p-3 bg-[#FDFBF7] rounded-lg" data-testid={`shubh-date-${sd.id}`}>
                        <p className="font-semibold">{sd.date}</p>
                        <p className="text-sm text-gray-600">
                          {language === 'en' ? sd.occasion : sd.occasion_mr}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateBookingPage;