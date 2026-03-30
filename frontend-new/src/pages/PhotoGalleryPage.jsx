import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import PageHeader from '../components/PageHeader';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhotoGalleryPage = () => {
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
            console.error('Error fetching hall:', error);
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

    const galleryImages = hall.gallery_images || [];

    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            <PageHeader
                title={t('Photo Gallery', 'फोटो गॅलरी')}
                onBack={() => navigate(`/hall/${hallId}`)}
            />

            <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-4xl md:text-5xl font-bold text-center maroon-text mb-6 playfair">
                    {language === 'en' ? `Gallery: ${hall.name}` : `गॅलरी: ${hall.name_mr}`}
                </h1>

                {galleryImages.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-lg">
                            {t('No photos available in the gallery yet.', 'गॅलरीत अद्याप कोणतेही फोटो नाहीत.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {galleryImages.map((img, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 card-hover aspect-square group"
                            >
                                <img
                                    src={img}
                                    alt={`Gallery ${idx + 1}`}
                                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotoGalleryPage;
