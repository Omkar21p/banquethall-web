import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, IndianRupee, Calendar, Image as ImageIcon, CheckCircle, PackageSearch, GripHorizontal } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HallDashboardPage = () => {
    const { hallId } = useParams();
    const navigate = useNavigate();
    const { language, t } = useLanguage();

    const [hall, setHall] = useState(null);
    const [loading, setLoading] = useState(true);

    const [services, setServices] = useState([]);
    const [packages, setPackages] = useState([]);

    // Calendar state
    const [shubhDates, setShubhDates] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Navigation Tab State
    const [activeTab, setActiveTab] = useState('services');

    useEffect(() => {
        fetchAllData();
    }, [hallId]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [
                hallsRes,
                servicesRes,
                packagesRes,
                shubhDatesRes,
                bookingsRes
            ] = await Promise.all([
                axios.get(`${API}/halls`),
                axios.get(`${API}/services?hall_id=${hallId}`),
                axios.get(`${API}/packages?hall_id=${hallId}`),
                axios.get(`${API}/shubh-dates?hall_id=${hallId}`),
                axios.get(`${API}/public/bookings?hall_id=${hallId}`)
            ]);

            const selectedHall = hallsRes.data.find(h => h.id === hallId);
            setHall(selectedHall);
            setServices(servicesRes.data);
            setPackages(packagesRes.data);
            setShubhDates(shubhDatesRes.data);
            setBookings(bookingsRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoading(false);
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

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const getDayClassName = (date) => {
        if (isDateBooked(date)) return 'date-booked';
        if (isToday(date)) return 'date-today';
        if (isDateShubh(date)) return 'date-shubh';
        return '';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
                <div className="w-16 h-16 border-4 border-[#800000] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!hall) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7]">
                <h2 className="text-2xl font-bold maroon-text mb-4">{t('Hall not found', 'हॉल सापडला नाही')}</h2>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2 bg-[#800000] text-white rounded-full hover:bg-[#600000]"
                >
                    {t('Back to Home', 'मुख्य पानावर जा')}
                </button>
            </div>
        );
    }

    const renderServices = () => (
        <div className="animation-fade-in">
            <h2 className="playfair text-3xl font-bold maroon-text mb-8 text-center">{t('Our Services', 'आमच्या सेवा')}</h2>
            {services.length === 0 ? (
                <div className="text-center py-12"><p className="text-gray-600 text-lg">{t('No services available yet.', 'सध्या कोणत्याही सेवा उपलब्ध नाहीत.')}</p></div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                        <div key={service.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-[#D4AF37]/20">
                            {service.image_url && <img src={service.image_url} alt={service.name} className="w-full h-48 object-cover rounded-lg mb-4" />}
                            <h3 className="text-xl font-bold maroon-text mb-2">{language === 'en' ? service.name : service.name_mr}</h3>
                            {service.price && <div className="flex items-center gap-1 text-[#D4AF37] font-bold mb-2"><IndianRupee size={18} /><span>{service.price.toLocaleString()}</span></div>}
                            {service.description && <p className="text-gray-600">{language === 'en' ? service.description : service.description_mr}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderPackages = () => (
        <div className="animation-fade-in">
            <h2 className="playfair text-3xl font-bold maroon-text mb-8 text-center">{t('Our Packages', 'आमचे पॅकेजेस')}</h2>
            {packages.length === 0 ? (
                <div className="text-center py-12"><p className="text-gray-600 text-lg">{t('No packages available yet.', 'सध्या कोणतेही पॅकेजेस उपलब्ध नाहीत.')}</p></div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-8">
                    {packages.map((pkg) => (
                        <div key={pkg.id} className="bg-white p-8 rounded-2xl shadow-lg border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="playfair text-2xl font-bold maroon-text">{language === 'en' ? pkg.name : pkg.name_mr}</h3>
                                <span className="px-3 py-1 bg-[#D4AF37] text-white rounded-full text-sm">{pkg.package_type === 'thali' ? t('Thali System', 'थाळी सिस्टम') : t('Normal Rent', 'नॉर्मल भाडे')}</span>
                            </div>
                            {pkg.description && <p className="text-gray-600 mb-4">{language === 'en' ? pkg.description : pkg.description_mr}</p>}
                            {pkg.rent && <div className="flex items-center gap-2 mb-2"><IndianRupee className="text-[#800000]" size={20} /><span className="font-bold">{t('Rent:', 'भाडे:')} ₹{pkg.rent.toLocaleString()}</span></div>}
                            {pkg.custom_charges && pkg.custom_charges.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {pkg.custom_charges.map((charge, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <IndianRupee className="text-[#800000]" size={20} />
                                            <span className="font-bold">{language === 'en' ? charge.label : charge.label_mr}: ₹{charge.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {pkg.items && pkg.items.length > 0 && (
                                <div className="mt-4"><h4 className="font-bold maroon-text mb-2">{t('Included Items:', 'समाविष्ट आयटम:')}</h4><ul className="space-y-1">{pkg.items.map((item, idx) => (<li key={idx} className="text-gray-700">• {language === 'en' ? item.name : item.name_mr} {item.price && `- ₹${item.price}`}</li>))}</ul></div>
                            )}
                            {pkg.catalogue_url && <a href={pkg.catalogue_url} target="_blank" rel="noopener noreferrer" className="block mt-4 text-[#D4AF37] hover:text-[#B8941F] font-semibold">{t('View Catalogue', 'कॅटलॉग पहा')} →</a>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderGallery = () => {
        const galleryImages = hall.gallery_images || [];
        return (
            <div className="animation-fade-in">
                <h2 className="playfair text-3xl font-bold maroon-text mb-8 text-center">{t('Photo Gallery', 'फोटो गॅलरी')}</h2>
                {galleryImages.length === 0 ? (
                    <div className="text-center py-12"><p className="text-gray-600 text-lg">{t('No photos available in the gallery yet.', 'गॅलरीत अद्याप कोणतेही फोटो नाहीत.')}</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {galleryImages.map((img, idx) => (
                            <div key={idx} className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 aspect-square group">
                                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const renderCalendar = () => (
        <div className="animation-fade-in flex justify-center">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-[#D4AF37]/30 max-w-4xl w-full">
                <h2 className="playfair text-3xl font-bold maroon-text mb-8 text-center">{t('Check Availability', 'उपलब्धता तपासा')}</h2>
                <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
                    <div className="mx-auto bg-[#FDFBF7] p-4 rounded-xl shadow-inner border border-[#D4AF37]/20">
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            inline
                            dayClassName={getDayClassName}
                            formatWeekDay={nameOfDay => nameOfDay.substring(0, 3)}
                        />
                    </div>
                    <div className="w-full md:w-1/2 p-6 bg-[#FFF9E6] rounded-xl border border-[#D4AF37]/30 self-stretch flex flex-col justify-center">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded-full bg-red-500 shadow-md"></div>
                                <span className="font-semibold text-gray-800 text-lg">{t('Booked', 'बुक केले')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#D4AF37] shadow-md border-2 border-[#B8941F]"></div>
                                <span className="font-semibold text-gray-800 text-lg">{t('Shubh Muhurt (Auspicious)', 'शुभ मुहूर्त')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded-full bg-blue-500 shadow-md"></div>
                                <span className="font-semibold text-gray-800 text-lg">{t('Today', 'आज')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#800000] shadow-md"></div>
                                <span className="font-semibold text-gray-800 text-lg">{t('Selected Date', 'निवडलेली तारीख')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 shadow-sm"></div>
                                <span className="font-semibold text-gray-800 text-lg">{t('Available', 'उपलब्ध')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 text-center bg-[#800000] text-white py-4 px-6 rounded-full shadow-lg max-w-sm mx-auto">
                    <p className="font-bold text-lg mb-1">{t('Selected Date:', 'निवडलेली तारीख:')}</p>
                    <p className="text-xl">{format(selectedDate, 'dd MMMM yyyy')}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFBF7] scroll-smooth">
            <PageHeader
                title={language === 'en' ? hall.name : hall.name_mr}
                onBack={() => navigate('/')}
            />

            {/* Hero Image */}
            <div className="w-full h-[30vh] md:h-[40vh] relative pt-20">
                <img src={hall.image_url} alt={hall.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8 pb-12">
                    <h1 className="text-white text-4xl md:text-5xl font-bold playfair drop-shadow-lg mb-2">
                        {language === 'en' ? hall.name : hall.name_mr}
                    </h1>
                    <p className="text-gray-200 block max-w-3xl text-lg drop-shadow-md">
                        {language === 'en' ? hall.description : hall.description_mr}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Horizontal Navigation Tabs */}
                <div className="flex justify-center mb-12 overflow-x-auto hide-scrollbar">
                    <div className="flex space-x-2 md:space-x-4 bg-white p-2 rounded-full shadow-lg border-2 border-[#D4AF37]/20 whitespace-nowrap">
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab === 'services' ? 'bg-[#800000] text-white shadow-md' : 'text-gray-600 hover:bg-[#FDFBF7]'}`}
                        >
                            <GripHorizontal size={20} /> {t('Services', 'सेवा')}
                        </button>
                        <button
                            onClick={() => setActiveTab('packages')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab === 'packages' ? 'bg-[#800000] text-white shadow-md' : 'text-gray-600 hover:bg-[#FDFBF7]'}`}
                        >
                            <PackageSearch size={20} /> {t('Packages', 'पॅकेजेस')}
                        </button>
                        <button
                            onClick={() => setActiveTab('booking')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab === 'booking' ? 'bg-[#800000] text-white shadow-md' : 'text-gray-600 hover:bg-[#FDFBF7]'}`}
                        >
                            <Calendar size={20} /> {t('Check Dates', 'तारीख तपासा')}
                        </button>
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeTab === 'gallery' ? 'bg-[#800000] text-white shadow-md' : 'text-gray-600 hover:bg-[#FDFBF7]'}`}
                        >
                            <ImageIcon size={20} /> {t('Gallery', 'गॅलरी')}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="min-h-[50vh]">
                    {activeTab === 'services' && renderServices()}
                    {activeTab === 'packages' && renderPackages()}
                    {activeTab === 'booking' && renderCalendar()}
                    {activeTab === 'gallery' && renderGallery()}
                </div>
            </div>

            <footer className="bg-[#800000] text-white py-12 mt-12 border-t-8 border-[#D4AF37]">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <h3 className="playfair text-2xl font-bold mb-4">{language === 'en' ? hall.name : hall.name_mr}</h3>
                    <p className="text-[#D4AF37] mb-8">{t('Creating unforgettable memories', 'अविस्मरणीय आठवणी तयार करत आहोत')}</p>
                    <p className="text-gray-400 text-sm">© 2025 Om & Shiv Lawns. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default HallDashboardPage;
