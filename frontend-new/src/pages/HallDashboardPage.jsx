import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { ArrowLeft, GripHorizontal, PackageSearch, Image as ImageIcon, CalendarCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HallDashboardPage = () => {
    const { hallId } = useParams();
    const navigate = useNavigate();
    const { language, t } = useLanguage();
    const [hall, setHall] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHallDetails();
    }, [hallId]);

    const fetchHallDetails = async () => {
        try {
            const response = await axios.get(`${API}/halls`);
            const selectedHall = response.data.find(h => h.id === hallId);
            setHall(selectedHall);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching hall details:', error);
            setLoading(false);
        }
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

    const options = [
        {
            title: t('Our Services', 'आमच्या सेवा'),
            icon: <GripHorizontal size={40} className="text-[#800000] mb-4" />,
            path: `/services/${hallId}`,
            desc: t('Explore our premium catering, decoration, and event services.', 'आमच्या प्रीमियम केटरिंग, डेकोरेशन आणि इव्हेंट सेवा पहा.')
        },
        {
            title: t('Our Packages', 'आमचे पॅकेजेस'),
            icon: <PackageSearch size={40} className="text-[#800000] mb-4" />,
            path: `/packages/${hallId}`,
            desc: t('Discover our curated wedding and event packages.', 'आमचे खास विवाह आणि इव्हेंट पॅकेजेस एक्सप्लोर करा.')
        },
        {
            title: t('Photo Gallery', 'फोटो गॅलरी'),
            icon: <ImageIcon size={40} className="text-[#D4AF37] mb-4" />,
            path: `/gallery/${hallId}`,
            desc: t('View photos of our beautiful venue and past events.', 'आमच्या सुंदर हॉलचे आणि मागील कार्यक्रमांचे फोटो पहा.')
        },
        {
            title: t('Check Dates & Book', 'तारीख चेक करा आणि बुक करा'),
            icon: <CalendarCheck size={40} className="text-[#D4AF37] mb-4" />,
            path: `/booking/${hallId}`,
            desc: t('Check availability and secure your auspicious date.', 'उपलब्धता तपासा आणि तुमची शुभ तारीख बुक करा.')
        }
    ];

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <PageHeader
                title={language === 'en' ? hall.name : hall.name_mr}
                onBack={() => navigate('/')}
            />

            {/* Hero Banner with Hall Image */}
            <div className="w-full h-[40vh] md:h-[50vh] relative pt-20">
                <img
                    src={hall.image_url}
                    alt={hall.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center pt-20">
                    <h1 className="text-white text-4xl md:text-5xl font-bold playfair max-w-3xl text-center px-4 drop-shadow-lg">
                        {language === 'en' ? hall.description : hall.description_mr}
                    </h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <h2 className="text-3xl font-bold text-center maroon-text mb-12 playfair">
                    {t('Explore Venue Attributes', 'व्हेन्यू पर्याय एक्सप्लोर करा')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {options.map((opt, index) => (
                        <div
                            key={index}
                            onClick={() => navigate(opt.path)}
                            className="bg-white rounded-2xl p-8 shadow-md border-2 border-transparent hover:border-[#D4AF37] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center text-center transform hover:-translate-y-2 card-hover"
                        >
                            <div className="bg-[#FFF9E6] p-4 rounded-full mb-4">
                                {opt.icon}
                            </div>
                            <h3 className="text-xl font-bold maroon-text mb-3 playfair">{opt.title}</h3>
                            <p className="text-gray-600 text-sm">
                                {opt.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HallDashboardPage;
